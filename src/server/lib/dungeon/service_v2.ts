import { createDomainEvent } from '@server/lib/mq/domainEventWriter';
import { publishTransactionalMessageBestEffort } from '@server/lib/mq/transactionalMessagePublisher';
import {
  renderPrompt,
  renderPromptSystem,
} from '@server/lib/prompts';
import { findActiveCultivatorOwnerId } from '@server/lib/repositories/cultivatorRepository';
import type { BattleRecordV3 } from '@server/lib/services/battleResult';
import {
  loadCultivatorCombatInput,
  loadCultivatorDungeonPromptFacts,
} from '@server/lib/services/cultivator/CultivatorCombatProjectionReader';
import { getPaginatedInventoryByType } from '@server/lib/services/cultivator/CultivatorInventoryRepository';
import { updateCultivator } from '@server/lib/services/cultivator/CultivatorStateRepository';
import { resourceEngine } from '@server/lib/services/resource/ResourceEngine';
import {
  extractJsonObjectFromText,
  extractSceneDescriptionProgress,
  generateAiObject,
  generateAiText,
  hasAnyServerLlmProviderConfigured,
  streamAiText,
} from '@server/utils/aiClient';
import { stableCompactStringify } from '@server/utils/llmPayload';
import { getRealmStageNaturalAttributeValue } from '@shared/config/realmProgression';
import type { CultivatorDisplayInput } from '@shared/engine/battle-v5/adapters/CultivatorDisplayAdapter';
import { getCultivatorDisplayAttributes } from '@shared/engine/battle-v5/adapters/CultivatorDisplayAdapter';
import { EnemyGenerator } from '@shared/engine/enemyGenerator';
import { TYPE_DESCRIPTIONS } from '@shared/engine/material/creation/config';
import type {
  ResourceOperation,
  ResourceOperationResult,
  ResourceOperationSettlement,
} from '@shared/engine/resource/types';
import {
  calculateDungeonMaterialCost,
  calculateDungeonResourceCost,
  calculateDungeonStatLoss,
  DUNGEON_LIFESPAN_COST_MAX,
} from '@shared/lib/dungeon/costPolicy';
import {
  buildDungeonPerformanceTags,
  normalizeDungeonRewardTier,
  type DungeonEndDisposition,
} from '@shared/lib/dungeon/settlementPolicy';
import type { SatelliteNode } from '@shared/lib/game/mapSystem';
import {
  canChallengeDungeonRealm,
  clampDungeonEnemyRealmStage,
  getMapNode,
  isSatelliteNode,
  resolveDungeonMapConfig,
} from '@shared/lib/game/mapSystem';
import type { CultivatorCondition } from '@shared/types/condition';
import {
  MaterialType,
  Quality,
  QUALITY_VALUES,
  REALM_STAGE_VALUES,
  REALM_VALUES,
  RealmType,
  type RealmStage,
} from '@shared/types/constants';
import type { Cultivator } from '@shared/types/cultivator';
import { randomUUID } from 'crypto';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { getExecutor, type DbTransaction } from '../drizzle/db';
import { dungeonHistories, dungeonRuns } from '../drizzle/schema';
import { redis } from '../redis';
import { parseRedisJson } from '../redis/json';
import {
  isRedisLockContention,
  redisLockKeys,
  withRedisLock,
  type RedisLeaseContext,
} from '../redis/lock';
import { executePersistentWorldBattle } from '../services/BattleStateCoordinator';
import { ConditionService } from '../services/ConditionService';
import { QiService } from '../services/QiService';
import { ServerEnemyCopyProvider } from '../services/ServerEnemyCopyProvider';
import {
  buildDungeonRoundLlmContext,
  buildDungeonSettlementLlmContext,
} from './llmContext';
import type { RewardBlueprint } from './reward';
import { RewardFactory } from './reward';
import {
  BattleSession,
  createDungeonRoundLlmSchema,
  createDungeonSettlementLlmSchema,
  DungeonOptionCost,
  DungeonPendingAction,
  DungeonRecoverAction,
  DungeonRound,
  DungeonRoundLlmContext,
  DungeonRoundLlmOutput,
  DungeonRoundSchema,
  DungeonSettlement,
  DungeonSettlementGeneratedSchema,
  DungeonSettlementLlmContext,
  DungeonSettlementSchema,
  DungeonState,
  PlayerInfo,
} from './types';

const dungeonEnemyGenerator = new EnemyGenerator({
  copyProvider: new ServerEnemyCopyProvider({
    enabled: process.env.NODE_ENV !== 'test',
  }),
});

const REDIS_TTL = 3600; // 1 hour expiration for active sessions
const FLOW_LOCK_TTL_SECONDS = 180;
const RUN_TERMINAL_STATUSES = new Set(['FINISHED']);
const DUNGEON_REWARD_BLUEPRINT_LIMIT = 6;
export const DungeonFlowErrorCode = {
  NOT_FOUND: 'DUNGEON_NOT_FOUND',
  INVALID_STATE: 'DUNGEON_INVALID_STATE',
} as const;

export type DungeonFlowErrorCode =
  (typeof DungeonFlowErrorCode)[keyof typeof DungeonFlowErrorCode];

export class DungeonFlowError extends Error {
  constructor(
    public code: DungeonFlowErrorCode,
    message: string,
    public status: 404 | 409,
  ) {
    super(message);
    this.name = 'DungeonFlowError';
  }
}

class DungeonSettlementRecoverableError extends Error {
  constructor(
    message: string,
    public actions: DungeonRecoverAction[],
  ) {
    super(message);
    this.name = 'DungeonSettlementRecoverableError';
  }
}

type DungeonSettlementResult = {
  state?: DungeonState;
  settlement?: DungeonSettlement;
  isFinished: boolean;
  realGains?: ResourceOperation[];
  persist?: (tx: DbTransaction) => Promise<DungeonPersistenceSettlement | void>;
  afterCommit?: () => Promise<void>;
};

type DungeonSettlementOptions = {
  skipInjury?: boolean;
  abandonedBattle?: boolean;
  endDisposition?: DungeonSettlementLlmContext['endDisposition'];
  pendingAction?: DungeonPendingAction;
  deferPersistence?: boolean;
};

type DungeonFlowOptions = {
  deferPersistence?: boolean;
  lease?: RedisLeaseContext;
  /** 回合叙事流式回调：收到累积式 scene_description 文本（渐进展示用） */
  narrativeStream?: (text: string) => void;
  /** 客户端断开时中止 LLM 生成，避免空跑 */
  abortSignal?: AbortSignal;
};

type DungeonPersistenceHooks = {
  persist: (tx: DbTransaction) => Promise<DungeonPersistenceSettlement | void>;
  afterCommit: () => Promise<void>;
};

export interface DungeonPersistenceSettlement {
  condition?: Cultivator['condition'];
  currency?: {
    spiritStones?: number;
    reputation?: number;
    qi?: number;
    qiLastRefreshedAt?: string | null;
  };
  progress?: Cultivator['cultivation_progress'];
  profile?: {
    lifespan?: number;
  };
  inventoryChanges?: ResourceOperationSettlement['inventoryChanges'];
}

function mergeDungeonPersistenceSettlements(
  ...settlements: Array<DungeonPersistenceSettlement | null | undefined>
): DungeonPersistenceSettlement {
  const merged: DungeonPersistenceSettlement = {};
  const inventoryChanges: ResourceOperationSettlement['inventoryChanges'] = [];
  for (const settlement of settlements) {
    if (!settlement) continue;
    if (settlement.condition !== undefined) {
      merged.condition = settlement.condition;
    }
    if (settlement.progress !== undefined) {
      merged.progress = settlement.progress;
    }
    if (settlement.currency) {
      merged.currency = { ...merged.currency, ...settlement.currency };
    }
    if (settlement.profile) {
      merged.profile = { ...merged.profile, ...settlement.profile };
    }
    inventoryChanges.push(...(settlement.inventoryChanges ?? []));
  }
  if (inventoryChanges.length > 0) {
    merged.inventoryChanges = inventoryChanges;
  }
  return merged;
}

function toDungeonPersistenceSettlement(
  result: ResourceOperationResult,
): DungeonPersistenceSettlement {
  const settlement: ResourceOperationSettlement | undefined = result.settlement;
  if (!settlement) return {};
  return {
    currency: {
      ...(settlement.spiritStones !== undefined
        ? { spiritStones: settlement.spiritStones }
        : {}),
      ...(settlement.reputation !== undefined
        ? { reputation: settlement.reputation }
        : {}),
    },
    ...(settlement.lifespan !== undefined
      ? { profile: { lifespan: settlement.lifespan } }
      : {}),
    ...(settlement.cultivationProgress
      ? { progress: settlement.cultivationProgress }
      : {}),
    inventoryChanges: settlement.inventoryChanges,
  };
}

function rewardBlueprintKey(reward: RewardBlueprint): string {
  return [
    reward.name?.trim() ?? '',
    reward.material_type ?? '',
    reward.element ?? '',
    reward.description?.trim() ?? '',
  ].join('|');
}

function selectMostValuableRewardBlueprints(
  rewards: RewardBlueprint[] | undefined,
  limit: number,
): RewardBlueprint[] {
  if (!rewards?.length || limit <= 0) return [];
  if (rewards.length <= limit) return rewards;

  return rewards
    .map((reward, index) => ({
      reward,
      index,
      score:
        typeof reward.reward_score === 'number' &&
        Number.isFinite(reward.reward_score)
          ? reward.reward_score
          : 0,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.reward);
}

function appendRoundRewards(
  state: DungeonState,
  acquiredItems: RewardBlueprint[] | undefined,
): RewardBlueprint[] {
  const remainingSlots = Math.max(
    0,
    DUNGEON_REWARD_BLUEPRINT_LIMIT - (state.accumulatedRewards?.length ?? 0),
  );
  const acceptedItems = (acquiredItems ?? []).slice(0, remainingSlots);
  state.currentRoundItems = acceptedItems;
  if (acceptedItems.length) {
    if (!state.accumulatedRewards) state.accumulatedRewards = [];
    state.accumulatedRewards.push(...acceptedItems);
  }
  return acceptedItems;
}

function normalizeSettlementRewards(
  settlement: DungeonSettlement,
  accumulatedRewards: RewardBlueprint[],
  args: {
    endDisposition: DungeonEndDisposition;
    dangerScore: number;
    committedCostCount: number;
  },
): DungeonSettlement {
  const inheritedRewards = selectMostValuableRewardBlueprints(
    accumulatedRewards,
    DUNGEON_REWARD_BLUEPRINT_LIMIT,
  );
  const inheritedKeys = new Set(inheritedRewards.map(rewardBlueprintKey));
  const extraRewards = settlement.settlement.reward_blueprints.filter(
    (reward) => !inheritedKeys.has(rewardBlueprintKey(reward)),
  );
  const acceptedExtraRewards =
    settlement.settlement.reward_tier === 'C' ||
    settlement.settlement.reward_tier === 'D'
      ? []
      : extraRewards;
  const reward_blueprints = [
    ...inheritedRewards,
    ...acceptedExtraRewards,
  ].slice(0, DUNGEON_REWARD_BLUEPRINT_LIMIT);
  const reward_tier = normalizeDungeonRewardTier({
    proposedTier: settlement.settlement.reward_tier,
    totalMaterialCount: reward_blueprints.length,
    endDisposition: args.endDisposition,
  });
  const performance_tags = buildDungeonPerformanceTags({
    tier: reward_tier,
    dangerScore: args.dangerScore,
    materialCount: reward_blueprints.length,
    committedCostCount: args.committedCostCount,
    endDisposition: args.endDisposition,
  });

  return DungeonSettlementSchema.parse({
    ...settlement,
    settlement: {
      ...settlement.settlement,
      reward_tier,
      reward_blueprints,
      performance_tags,
    },
  });
}

const DEFAULT_RECOVERABLE_ACTIONS: DungeonRecoverAction[] = [
  'safe_retreat',
  'force_quit',
];
const CONTINUE_RECOVERABLE_ACTIONS: DungeonRecoverAction[] = [
  'retry_continue',
  'safe_retreat',
  'force_quit',
];
const SETTLE_RECOVERABLE_ACTIONS: DungeonRecoverAction[] = [
  'retry_settle',
  'force_quit',
];
const ACTION_RECOVERABLE_ACTIONS: DungeonRecoverAction[] = [
  'retry',
  'safe_retreat',
  'force_quit',
];

function normalizeLegacySixAttributes(
  attributes: Record<string, unknown>,
  realm: string,
  stage: string,
) {
  const realmValue = REALM_VALUES.includes(realm as RealmType)
    ? (realm as RealmType)
    : REALM_VALUES[0];
  const stageValue = REALM_STAGE_VALUES.includes(stage as RealmStage)
    ? (stage as RealmStage)
    : REALM_STAGE_VALUES[0];
  const naturalValue = getRealmStageNaturalAttributeValue(
    realmValue,
    stageValue,
  );

  if (typeof attributes.strength !== 'number') {
    attributes.strength = naturalValue;
  }
  if (typeof attributes.endurance !== 'number') {
    attributes.endurance =
      typeof attributes.wisdom === 'number' ? attributes.wisdom : naturalValue;
  }
}

const COST_LIMITS: Partial<Record<DungeonOptionCost['type'], number>> = {
  spirit_stones: 10_000_000,
  lifespan: DUNGEON_LIFESPAN_COST_MAX,
  cultivation_exp: 1_000_000,
  comprehension_insight: 100,
  material: 999,
  hp_loss: 1,
  mp_loss: 1,
  battle: 100,
};
const DUNGEON_MATERIAL_TYPE_GUIDE = Object.entries(TYPE_DESCRIPTIONS)
  .map(([key, desc]) => `${key}=${desc}`)
  .join('；');

function assertDungeonRealmEligible(
  playerRealm: RealmType,
  dungeonRealm: RealmType,
) {
  if (!canChallengeDungeonRealm(playerRealm, dungeonRealm)) {
    throw new Error(
      `当前境界${playerRealm}不可挑战${dungeonRealm}秘境，请先提升大境界`,
    );
  }
}

// Helper to generate Redis key
function getDungeonKey(cultivatorId: string) {
  return `dungeon:active:${cultivatorId}`;
}

function getDungeonBattleKey(battleId: string) {
  return `dungeon:battle:${battleId}`;
}

interface DungeonBattleCachePayload {
  session: BattleSession;
  enemyObject: Cultivator;
}

function isActiveRunStatus(status: string | null | undefined) {
  return Boolean(status && !RUN_TERMINAL_STATUSES.has(status));
}

function cloneCosts(
  costs: DungeonOptionCost[] | undefined,
): DungeonOptionCost[] {
  return costs
    ? costs.map((cost) => ({
        ...cost,
        metadata: cost.metadata ? { ...cost.metadata } : undefined,
      }))
    : [];
}

export class DungeonService {
  private buildFallbackOption(
    state: Pick<DungeonState, 'currentRound' | 'maxRounds'>,
  ) {
    const isFinalRound = state.currentRound >= state.maxRounds;
    return {
      id: 1,
      text: isFinalRound
        ? '稳住心神，清点本更所得并结案收束。'
        : '稳住心神，沿着当前线索继续勘察。',
      risk_level: 'low' as const,
      costs: [],
      costPreview: [],
    };
  }

  private normalizeOptionCosts(option: { costs?: DungeonOptionCost[] }) {
    const costs = cloneCosts(option.costs)
      .map((cost) => {
        const max = COST_LIMITS[cost.type] ?? Number.MAX_SAFE_INTEGER;
        const rawValue = Number.isFinite(cost.value) ? cost.value : 0;
        const value =
          cost.type === 'hp_loss' || cost.type === 'mp_loss'
            ? Math.max(0, Math.min(max, rawValue))
            : Math.floor(Math.max(0, Math.min(max, rawValue)));
        return {
          ...cost,
          value,
        };
      })
      .filter((cost) => cost.value > 0 || cost.type === 'battle');

    const hasBattle = costs.some((cost) => cost.type === 'battle');
    let battleSeen = false;
    return costs.filter((cost) => {
      if (cost.type === 'battle') {
        if (battleSeen) return false;
        battleSeen = true;
        return true;
      }
      return !hasBattle || (cost.type !== 'hp_loss' && cost.type !== 'mp_loss');
    });
  }

  private normalizeRoundOptions(
    roundData: DungeonRound,
    state: Pick<DungeonState, 'currentRound' | 'maxRounds'>,
  ) {
    roundData.interaction.options = roundData.interaction.options.map(
      (option) => {
        const costPreview = this.normalizeOptionCosts(option);
        return {
          ...option,
          costs: costPreview,
          costPreview,
        };
      },
    );
    if (roundData.interaction.options.length === 0) {
      roundData.interaction.options = [this.buildFallbackOption(state)];
    }
    return roundData;
  }

  private normalizeState(state: DungeonState): DungeonState {
    const [realm = REALM_VALUES[0], stage = REALM_STAGE_VALUES[0]] =
      state.playerInfo.realm.trim().split(/\s+/);
    normalizeLegacySixAttributes(
      state.playerInfo.attributes as unknown as Record<string, unknown>,
      realm,
      stage,
    );
    state.costLedger = (state.costLedger ?? []).map((entry) => ({
      ...entry,
      costs: this.normalizeOptionCosts(entry),
    }));
    state.gainLedger ??= [];
    state.summary_of_sacrifice = state.costLedger.flatMap((entry) =>
      cloneCosts(entry.costs),
    );
    if (state.pendingAction) {
      state.pendingAction = {
        ...state.pendingAction,
        costs: this.normalizeOptionCosts(state.pendingAction),
      };
    }
    state.costPreview = this.normalizeOptionCosts({
      costs: state.costPreview,
    });
    state.currentOptions = state.currentOptions?.map((option) => {
      const costPreview = this.normalizeOptionCosts(option);
      return {
        ...option,
        costs: costPreview,
        costPreview,
      };
    });
    if (
      state.status === 'EXPLORING' &&
      (state.currentOptions?.length ?? 0) === 0
    ) {
      state.currentOptions = [this.buildFallbackOption(state)];
    }
    if (state.status === 'RECOVERABLE_ERROR') {
      state.recoverableActions ??= DEFAULT_RECOVERABLE_ACTIONS;
    }
    return state;
  }

  private async loadActiveRun(cultivatorId: string) {
    const rows = await getExecutor()
      .select()
      .from(dungeonRuns)
      .where(
        and(
          eq(dungeonRuns.cultivatorId, cultivatorId),
          isNull(dungeonRuns.endedAt),
        ),
      )
      .orderBy(desc(dungeonRuns.updatedAt))
      .limit(1);

    const row = rows[0];
    if (!row || !isActiveRunStatus(row.status)) return null;
    return row;
  }

  private async markRecoverable(
    cultivatorId: string,
    state: DungeonState,
    reason: string,
    actions: DungeonRecoverAction[] = DEFAULT_RECOVERABLE_ACTIONS,
    options: DungeonFlowOptions = {},
  ) {
    state.status = 'RECOVERABLE_ERROR';
    state.isFinished = false;
    state.statusReason = reason;
    state.recoverableActions = actions;
    if (state.pendingAction) {
      state.pendingAction.status = 'failed';
      state.pendingAction.error = reason;
    }
    if (!options.deferPersistence) {
      await this.saveState(cultivatorId, state);
    }
    return state;
  }

  private buildStateHooks(
    cultivatorId: string,
    state: DungeonState,
    battlePayload?: DungeonBattleCachePayload,
  ): DungeonPersistenceHooks {
    return {
      persist: async (tx) => {
        await this.persistStateRecord(cultivatorId, state, battlePayload, tx);
      },
      afterCommit: async () => {
        await this.saveRedisState(cultivatorId, state);
      },
    };
  }

  private async withFlowLock<T>(
    cultivatorId: string,
    context: string,
    task: () => Promise<T>,
    lease?: RedisLeaseContext,
  ): Promise<T> {
    if (lease) {
      lease.assertHeld();
      const result = await task();
      lease.assertHeld();
      return result;
    }

    try {
      return await withRedisLock(
        {
          key: redisLockKeys.dungeonCommand(cultivatorId),
          context,
          timeoutMs: FLOW_LOCK_TTL_SECONDS * 1000,
          retries: 0,
          delayMs: 50,
        },
        async (lease) => {
          const result = await task();
          lease.assertHeld();
          return result;
        },
      );
    } catch (error) {
      if (!isRedisLockContention(error)) {
        throw error;
      }
      throw new DungeonFlowError(
        DungeonFlowErrorCode.INVALID_STATE,
        '副本操作正在处理中，请稍后重试',
        409,
      );
    }
  }

  private hasCommittedAction(state: DungeonState, actionId: string) {
    return state.costLedger?.some((entry) => entry.actionId === actionId);
  }

  private commitCostsToState(
    state: DungeonState,
    action: DungeonPendingAction,
  ) {
    for (const cost of action.costs) {
      if (cost.type === 'hp_loss') {
        state.accumulatedHpLoss = Math.min(
          1,
          (state.accumulatedHpLoss ?? 0) + cost.value,
        );
      } else if (cost.type === 'mp_loss') {
        state.accumulatedMpLoss = Math.min(
          1,
          (state.accumulatedMpLoss ?? 0) + cost.value,
        );
      }
    }

    state.costLedger ??= [];
    state.costLedger.push({
      actionId: action.actionId,
      round: action.round,
      choiceId: action.choiceId,
      choiceText: action.choiceText,
      costs: cloneCosts(action.costs),
      committedAt: new Date().toISOString(),
    });
    state.summary_of_sacrifice = state.costLedger.flatMap((entry) =>
      cloneCosts(entry.costs),
    );
    state.pendingAction = {
      ...action,
      status: 'committed',
    };
  }

  private async applyConditionResourceLosses(
    cultivatorId: string,
    costs: DungeonOptionCost[],
    tx: DbTransaction,
  ) {
    const hpPercent = costs
      .filter((cost) => cost.type === 'hp_loss')
      .reduce((sum, cost) => sum + cost.value, 0);
    const mpPercent = costs
      .filter((cost) => cost.type === 'mp_loss')
      .reduce((sum, cost) => sum + cost.value, 0);

    if (hpPercent <= 0 && mpPercent <= 0) {
      return null;
    }

    const bundle = await loadCultivatorCombatInput(cultivatorId, tx);
    if (!bundle?.cultivator) {
      throw new Error('未找到修士数据');
    }

    const nextCondition = ConditionService.applyExternalResourceLoss(
      bundle.cultivator,
      bundle.cultivator.condition,
      {
        hpPercent,
        mpPercent,
      },
    );
    await updateCultivator(cultivatorId, { condition: nextCondition }, tx);
    return nextCondition;
  }

  private previewOptionResourceLoss(
    costs: DungeonOptionCost[],
    cultivator: CultivatorDisplayInput,
  ) {
    const hpPercent = costs
      .filter((cost) => cost.type === 'hp_loss')
      .reduce((sum, cost) => sum + cost.value, 0);
    const mpPercent = costs
      .filter((cost) => cost.type === 'mp_loss')
      .reduce((sum, cost) => sum + cost.value, 0);

    if (hpPercent <= 0 && mpPercent <= 0) {
      return;
    }

    const preview = ConditionService.previewExternalResourceLoss(
      cultivator,
      cultivator.condition,
      {
        hpPercent,
        mpPercent,
      },
    );

    for (const cost of costs) {
      if (cost.type === 'hp_loss') {
        cost.metadata = {
          ...cost.metadata,
          rawLoss: preview.rawHpLoss,
          actualLoss: preview.hpLoss,
        };
      } else if (cost.type === 'mp_loss') {
        cost.metadata = {
          ...cost.metadata,
          rawLoss: preview.rawMpLoss,
          actualLoss: preview.mpLoss,
        };
      }
    }
  }

  private async previewRoundResourceLoss(
    roundData: DungeonRound,
    cultivatorId: string,
  ) {
    const hasResourceLoss = roundData.interaction.options.some((option) =>
      (option.costPreview ?? option.costs ?? []).some(
        (cost) => cost.type === 'hp_loss' || cost.type === 'mp_loss',
      ),
    );
    if (!hasResourceLoss) {
      return roundData;
    }

    const bundle = await loadCultivatorCombatInput(cultivatorId);
    const cultivator = bundle?.cultivator;
    if (!cultivator) {
      return roundData;
    }

    roundData.interaction.options = roundData.interaction.options.map(
      (option) => {
        const costPreview = cloneCosts(option.costPreview ?? option.costs);
        this.previewOptionResourceLoss(costPreview, cultivator);
        return {
          ...option,
          costs: costPreview,
          costPreview,
        };
      },
    );

    return roundData;
  }

  private async getBattleContext(cultivatorId: string, battleId: string) {
    const state = await this.getState(cultivatorId);
    if (!state || state.activeBattleId !== battleId) {
      throw new Error('当前没有匹配的遭遇战');
    }

    const battleKey = getDungeonBattleKey(battleId);
    let battlePayload = parseRedisJson<DungeonBattleCachePayload>(
      await redis.get(battleKey),
      battleKey,
    );

    if (!battlePayload?.session || !battlePayload.enemyObject) {
      const run = await this.loadActiveRun(cultivatorId);
      const persistedPayload = run?.battlePayload as
        DungeonBattleCachePayload | null | undefined;
      if (
        persistedPayload?.session?.battleId === battleId &&
        persistedPayload.enemyObject
      ) {
        await redis.set(
          battleKey,
          JSON.stringify(persistedPayload),
          'EX',
          REDIS_TTL,
        );
        battlePayload = persistedPayload;
      }
    }

    if (!battlePayload?.session || !battlePayload.enemyObject) {
      await this.markRecoverable(
        cultivatorId,
        state,
        '遭遇战数据不存在或已失效',
        ['safe_retreat', 'force_quit'],
      );
      throw new Error('遭遇战数据不存在或已失效，可选择安全撤退或放弃副本');
    }

    if (battlePayload.session.cultivatorId !== cultivatorId) {
      throw new Error('无权访问该遭遇战');
    }

    normalizeLegacySixAttributes(
      battlePayload.enemyObject.attributes as unknown as Record<
        string,
        unknown
      >,
      battlePayload.enemyObject.realm,
      battlePayload.enemyObject.realm_stage,
    );

    return {
      state,
      battleKey,
      session: battlePayload.session,
      enemyObject: battlePayload.enemyObject,
    };
  }

  /**
   * 计算境界差距
   * @param playerRealm 玩家境界字符串，如 "忘川 中期"
   * @param mapRealm 地图要求境界
   * @returns 境界差距（正数表示玩家更强，负数表示地图更难）
   */
  private calculateRealmGap(playerRealm: string, mapRealm: RealmType): number {
    // 提取玩家境界（去掉阶段）
    const playerRealmName = playerRealm.split(' ')[0] as RealmType;

    const playerIndex = REALM_VALUES.indexOf(playerRealmName);
    const mapIndex = REALM_VALUES.indexOf(mapRealm);

    if (playerIndex === -1 || mapIndex === -1) {
      console.warn('[DungeonService] 无法识别境界:', { playerRealm, mapRealm });
      return 0;
    }

    return playerIndex - mapIndex;
  }

  // 核心配置：定义每个更次对应的诡案相位（五更制：点境→试探→深入→现真→处置→天明）
  private getPhase(
    currentRound: number,
    maxRounds: number,
    realmGap: number,
  ): string {
    // 境界碾压场景：简化剧情，降低风险
    if (realmGap >= 2) {
      if (currentRound === 1) return '点境期：境界占优，宜顺势勘察。';
      if (currentRound < maxRounds - 1) return '取证期：可稳取线索，代价宜轻。';
      if (currentRound === maxRounds - 1) return '现真期：阻碍将尽，风险应低。';
      return '处置期：可稳妥结案，满载而归。';
    }

    // 正常场景
    if (currentRound === 1) return '点境期：先发下规矩、勘察环境与入口。';
    if (currentRound < maxRounds - 1) return '深入期：引入转折，投放线索并开始消耗资源。';
    if (currentRound === maxRounds - 1)
      return '现真期：诡异本体现身，风险应显著抬升。';
    return '处置期：根据前情收束因果与余波。';
  }

  /**
   * 初始化副本
   */
  async startDungeon(
    cultivatorId: string,
    mapNodeId: string,
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-start',
      () => this.startDungeonUnlocked(cultivatorId, mapNodeId, options),
      options.lease,
    );
  }

  private async startDungeonUnlocked(
    cultivatorId: string,
    mapNodeId: string,
    options: DungeonFlowOptions,
  ) {
    let qiActionInstanceId: string | null = null;
    let qiReservationOpen = false;

    try {
      const existingSession = await this.loadActiveRun(cultivatorId);
      if (existingSession) {
        throw new Error('当前已有正在进行的副本，请先完成或放弃');
      }

      // 只有卫星地图节点可以进行副本挑战
      if (!isSatelliteNode(mapNodeId)) {
        throw new Error('只有秘境节点可以进行副本挑战');
      }

      // 1. 获取玩家与地图数据 (逻辑同你之前)
      const context = await this.prepareDungeonContext(cultivatorId, mapNodeId);

      qiActionInstanceId = randomUUID();
      if (!options.deferPersistence) {
        await QiService.reserveQi({
          cultivatorId,
          action: 'dungeon_start',
          actionInstanceId: qiActionInstanceId,
          metadata: {
            mapNodeId,
          },
        });
        qiReservationOpen = true;
      }

      // 2. 初始状态
      const state: DungeonState = {
        ...context,
        mapNodeId, // 保存地图节点ID
        currentRound: 1,
        maxRounds: 5, // 建议固定或根据地图设定
        history: [],
        dangerScore: 10,
        isFinished: false,
        cultivatorId: context.playerInfo.id!,
        theme: context.location.location,
        summary_of_sacrifice: [],
        costLedger: [],
        gainLedger: [],
        accumulatedRewards: [],
        status: 'EXPLORING',
        accumulatedHpLoss: 0, // 累积气血损失百分比 (0-1)
        accumulatedMpLoss: 0, // 累积灯焰损失百分比 (0-1)
      };

      // 3. 首次 AI 调用
      const roundData = await this.previewRoundResourceLoss(
        this.normalizeRoundOptions(
          await this.callAI(state, {
            narrativeStream: options.narrativeStream,
            abortSignal: options.abortSignal,
          }),
          state,
        ),
        cultivatorId,
      );

      // 4. 更新历史并存入 Redis
      const acceptedItems = appendRoundRewards(state, roundData.acquired_items);
      const gainedNames = acceptedItems.map((i) => i.name || '未知物品');
      state.history.push({
        round: 1,
        scene: roundData.scene_description,
        gained_items: gainedNames,
      });
      state.currentOptions = roundData.interaction.options;
      if (!options.deferPersistence) {
        await this.saveState(cultivatorId, state);
      }

      if (!options.deferPersistence && qiActionInstanceId) {
        await QiService.commitReservation({
          actionInstanceId: qiActionInstanceId,
          metadata: {
            runId: state.runId,
            committedAt: new Date().toISOString(),
          },
        });
        qiReservationOpen = false;
      }

      if (options.deferPersistence) {
        return {
          state,
          roundData,
          persist: async (tx: DbTransaction) => {
            if (!qiActionInstanceId) {
              throw new Error('副本灯油预扣标识缺失');
            }
            const reservation = await QiService.reserveQi({
              cultivatorId,
              action: 'dungeon_start',
              actionInstanceId: qiActionInstanceId,
              metadata: {
                mapNodeId,
              },
              tx,
            });
            await this.persistStateRecord(cultivatorId, state, undefined, tx);
            await QiService.commitReservation({
              actionInstanceId: qiActionInstanceId,
              metadata: {
                runId: state.runId,
                committedAt: new Date().toISOString(),
              },
              tx,
            });
            return {
              currency: {
                qi: reservation.qiAfter,
                qiLastRefreshedAt: reservation.qiLastRefreshedAt,
              },
            } satisfies DungeonPersistenceSettlement;
          },
          afterCommit: async () => {
            await this.saveRedisState(cultivatorId, state);
          },
        };
      }

      return { state, roundData };
    } catch (error) {
      if (qiReservationOpen && qiActionInstanceId) {
        try {
          await QiService.refundReservation({
            actionInstanceId: qiActionInstanceId,
            reason: 'dungeon_start_failed',
            metadata: {
              mapNodeId,
            },
          });
        } catch (refundError) {
          console.error('[DungeonService] 回滚灯油预扣失败:', refundError);
        }
      }
      throw error;
    }
  }

  /**
   * 处理玩家交互
   */
  async handleAction(
    cultivatorId: string,
    choiceId: number,
    actionId: string = randomUUID(),
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-action',
      () =>
        this.handleActionUnlocked(cultivatorId, choiceId, actionId, options),
      options.lease,
    );
  }

  private async handleActionUnlocked(
    cultivatorId: string,
    choiceId: number,
    actionId: string = randomUUID(),
    options: DungeonFlowOptions = {},
  ) {
    const state = await this.getState(cultivatorId);
    if (!state) throw new Error('副本已失效');
    if (this.hasCommittedAction(state, actionId)) {
      return { actionId, state, isFinished: state.isFinished };
    }

    // 1. 校验选项
    const chosenOption = state.currentOptions?.find((o) => o.id === choiceId);
    if (!chosenOption) {
      throw new Error(`无效的交互选项: ${choiceId}`);
    }

    const actionCosts = this.normalizeOptionCosts(chosenOption);

    const consumeActionCostsOrThrow = async (dryRun = false) => {
      if (actionCosts.length === 0) return;

      // 获取 userId
      const userId = await findActiveCultivatorOwnerId(cultivatorId);
      if (!userId) {
        throw new Error('无法获取修士所属用户');
      }

      // 动态匹配材料
      for (const cost of actionCosts) {
        if (cost.type === 'material' && !cost.name) {
          const reqType = cost.required_type as MaterialType;
          const reqQual = cost.required_quality as Quality;

          const requiredIndex = QUALITY_VALUES.indexOf(reqQual || '凡品');
          const validRanks = QUALITY_VALUES.slice(Math.max(0, requiredIndex));

          const matchPage = await getPaginatedInventoryByType(
            userId,
            cultivatorId,
            {
              type: 'materials',
              page: 1,
              pageSize: 10, // 获取前10个符合条件的材料
              materialTypes: reqType ? [reqType] : undefined,
              materialRanks:
                validRanks.length > 0 ? (validRanks as Quality[]) : undefined,
              materialSortBy: 'rank',
              materialSortOrder: 'asc',
            },
          );

          if (matchPage.items.length === 0) {
            const typeStr = reqType
              ? TYPE_DESCRIPTIONS[reqType] || reqType
              : '材料';
            const qualStr = reqQual ? reqQual + '以上的' : '';
            throw new Error(
              `储物袋中没有符合条件的材料（需要：${qualStr}${typeStr}），请重新选择或退出副本。`,
            );
          }

          // 选择第一个符合条件的材料
          cost.name = matchPage.items[0].name;
        }
      }

      const costs = actionCosts as ResourceOperation[];
      const result = dryRun
        ? await resourceEngine
            .validate(userId, cultivatorId, costs, getExecutor())
            .then((validation): ResourceOperationResult => ({
              success: validation.valid,
              operations: costs,
              errors: validation.errors,
            }))
        : await getExecutor().transaction(async (tx) => {
            const applied = await resourceEngine.applyInTransaction({
              userId,
              cultivatorId,
              consume: costs,
              tx,
            });
            if (applied.success) {
              await this.applyConditionResourceLosses(
                cultivatorId,
                actionCosts,
                tx,
              );
            }
            return applied;
          });

      if (!result.success) {
        throw new Error(result.errors?.join('; ') || '资源消耗失败');
      }
    };

    await consumeActionCostsOrThrow(true);

    const pendingAction: DungeonPendingAction = {
      actionId,
      choiceId,
      choiceText: chosenOption.text,
      round: state.currentRound,
      status: 'pending',
      costs: actionCosts,
      createdAt: new Date().toISOString(),
    };
    state.pendingAction = pendingAction;
    state.costPreview = actionCosts;

    // 2. 推进状态
    state.history[state.history.length - 1].choice = chosenOption?.text;
    const battleCost = actionCosts.find((c) => c.type === 'battle');
    if (battleCost) {
      let session: BattleSession & { enemyObject: Cultivator };
      try {
        session = await this.createBattleSession(
          cultivatorId,
          getDungeonKey(cultivatorId),
          battleCost,
          state.playerInfo,
          state,
          options,
        );
      } catch (error) {
        const recoverable = await this.markRecoverable(
          cultivatorId,
          state,
          error instanceof Error ? error.message : '遭遇战生成失败',
          ACTION_RECOVERABLE_ACTIONS,
          options,
        );
        return options.deferPersistence
          ? {
              actionId,
              state: recoverable,
              isFinished: false,
              ...this.buildStateHooks(cultivatorId, recoverable),
            }
          : { actionId, state: recoverable, isFinished: false };
      }

      if (!options.deferPersistence) {
        try {
          await consumeActionCostsOrThrow();
        } catch (error) {
          state.pendingAction = {
            ...pendingAction,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          };
          state.costPreview = undefined;
          state.status = 'EXPLORING';
          await this.saveState(cultivatorId, state);
          throw error;
        }
      }

      this.commitCostsToState(state, pendingAction);
      state.pendingAction = undefined;
      state.costPreview = undefined;
      state.status = 'WAITING_BATTLE';
      state.activeBattleId = session.battleId;
      const { enemyObject, ...battleSession } = session;
      const battlePayload = {
        session: battleSession,
        enemyObject,
      };

      if (options.deferPersistence) {
        return {
          actionId,
          state,
          type: 'TRIGGER_BATTLE',
          battleId: session.battleId,
          isFinished: false,
          persist: async (tx: DbTransaction) => {
            const userId = await findActiveCultivatorOwnerId(cultivatorId);
            if (!userId) {
              throw new Error('无法获取修士所属用户');
            }
            const consumeResult = await resourceEngine.applyInTransaction({
              userId,
              cultivatorId,
              consume: actionCosts as ResourceOperation[],
              tx,
            });
            if (!consumeResult.success) {
              throw new Error(
                consumeResult.errors?.join('; ') || '资源消耗失败',
              );
            }
            const condition: Cultivator['condition'] | undefined =
              (await this.applyConditionResourceLosses(
                cultivatorId,
                actionCosts,
                tx,
              )) ?? undefined;
            await this.persistStateRecord(
              cultivatorId,
              state,
              battlePayload,
              tx,
            );
            return mergeDungeonPersistenceSettlements(
              toDungeonPersistenceSettlement(consumeResult),
              condition ? { condition } : null,
            );
          },
          afterCommit: async () => {
            await this.saveRedisState(cultivatorId, state);
            await redis.set(
              getDungeonBattleKey(session.battleId),
              JSON.stringify(battlePayload),
              'EX',
              3600,
            );
          },
        };
      }

      await this.saveState(cultivatorId, state, battlePayload);

      return {
        actionId,
        state,
        type: 'TRIGGER_BATTLE',
        battleId: session.battleId,
        isFinished: false,
      };
    }

    if (state.currentRound >= state.maxRounds) {
      state.status = 'SETTLING';
      if (!options.deferPersistence) {
        await this.saveState(cultivatorId, state);
      }
      try {
        const result = await this.settleDungeon(state, {
          pendingAction,
          deferPersistence: options.deferPersistence,
        });
        return { actionId, ...result };
      } catch (error) {
        await this.markRecoverable(
          cultivatorId,
          state,
          error instanceof Error ? error.message : '结算生成失败',
          SETTLE_RECOVERABLE_ACTIONS,
        );
        throw error;
      }
    }

    state.status = 'GENERATING_NEXT';
    if (!options.deferPersistence) {
      await this.saveState(cultivatorId, state);
    }
    state.currentRound++;

    // 3. AI 生成下一轮
    let roundData: DungeonRound;
    try {
      roundData = await this.previewRoundResourceLoss(
        this.normalizeRoundOptions(
          await this.callAI(state, {
            narrativeStream: options.narrativeStream,
            abortSignal: options.abortSignal,
          }),
          state,
        ),
        cultivatorId,
      );
    } catch (error) {
      state.currentRound--;
      const recoverable = await this.markRecoverable(
        cultivatorId,
        state,
        error instanceof Error ? error.message : '下一轮生成失败',
        ACTION_RECOVERABLE_ACTIONS,
        options,
      );
      return options.deferPersistence
        ? {
            actionId,
            state: recoverable,
            isFinished: false,
            ...this.buildStateHooks(cultivatorId, recoverable),
          }
        : { actionId, state: recoverable, isFinished: false };
    }

    // LLM 成功后再扣资源，避免“生成失败但资源已扣除”
    if (!options.deferPersistence) {
      try {
        await consumeActionCostsOrThrow();
      } catch (error) {
        state.currentRound--;
        state.status = 'EXPLORING';
        state.pendingAction = {
          ...pendingAction,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        };
        state.costPreview = undefined;
        await this.saveState(cultivatorId, state);
        throw error;
      }
    }
    this.commitCostsToState(state, pendingAction);
    state.pendingAction = undefined;
    state.costPreview = undefined;

    // 记录过程战利品
    const acceptedItems = appendRoundRewards(state, roundData.acquired_items);
    const gainedNames = acceptedItems.map((i) => i.name || '未知物品');

    // 4. 更新状态
    state.history.push({
      round: state.currentRound,
      scene: roundData.scene_description,
      gained_items: gainedNames,
    });
    state.currentOptions = roundData.interaction.options;
    state.dangerScore = roundData.status_update.internal_danger_score;
    state.status = 'EXPLORING';

    if (options.deferPersistence) {
      return {
        actionId,
        state,
        roundData,
        isFinished: false,
        persist: async (tx: DbTransaction) => {
          const userId = await findActiveCultivatorOwnerId(cultivatorId);
          if (!userId) {
            throw new Error('无法获取修士所属用户');
          }
          const consumeResult = await resourceEngine.applyInTransaction({
            userId,
            cultivatorId,
            consume: actionCosts as ResourceOperation[],
            tx,
          });
          if (!consumeResult.success) {
            throw new Error(consumeResult.errors?.join('; ') || '资源消耗失败');
          }
          const condition: Cultivator['condition'] | undefined =
            (await this.applyConditionResourceLosses(
              cultivatorId,
              actionCosts,
              tx,
            )) ?? undefined;
          await this.persistStateRecord(cultivatorId, state, undefined, tx);
          return mergeDungeonPersistenceSettlements(
            toDungeonPersistenceSettlement(consumeResult),
            condition ? { condition } : null,
          );
        },
        afterCommit: async () => {
          await this.saveRedisState(cultivatorId, state);
        },
      };
    }

    await this.saveState(cultivatorId, state);
    return { actionId, state, roundData, isFinished: false };
  }

  // --- Battle Integration ---

  /* Removed old generateEnemy in favor of enemyGenerator */

  private async createBattleSession(
    cultivatorId: string,
    dungeonStateKey: string,
    battleCost: DungeonOptionCost,
    playerInfo: PlayerInfo,
    dungeonState: DungeonState,
    options: DungeonFlowOptions = {},
  ): Promise<BattleSession & { enemyObject: Cultivator }> {
    console.log('[createBattleSession]', battleCost);
    const battleId = randomUUID();

    // 获取地图节点的境界要求
    const mapNode = getMapNode(dungeonState.mapNodeId);
    if (!mapNode || !('realm_requirement' in mapNode)) {
      throw new Error('Invalid map node or missing realm_requirement');
    }
    const realmRequirement = (mapNode as { realm_requirement: string })
      .realm_requirement;
    const mapConfig = resolveDungeonMapConfig(mapNode);
    const metadata = battleCost.metadata;
    if (!metadata?.clan || !metadata.realm_stage) {
      throw new Error('Battle cost metadata must include clan and realm_stage');
    }

    const enemyDifficulty = mapConfig.enemyDifficulty;
    const enemyRealmStage = clampDungeonEnemyRealmStage(
      metadata.realm_stage,
      mapConfig,
    );

    const draft = await dungeonEnemyGenerator.enrichNarrative(
      dungeonEnemyGenerator.buildDraft({
        realm: realmRequirement as import('@shared/types/constants').RealmType,
        realmStage: enemyRealmStage,
        clan: metadata.clan,
        difficulty: enemyDifficulty,
        name: metadata.enemy_name,
        background: metadata.background,
        description: metadata.description,
        isBoss:
          mapConfig.difficultyTier === 'boss' && Boolean(metadata.is_boss),
      }),
    );
    const enemy = draft.cultivator;

    // 构建 BattleSession。角色当前 HP/MP 会在执行战斗时从持久 condition 注入。
    const session: BattleSession = {
      battleId,
      dungeonStateKey,
      cultivatorId,
      enemyData: {
        name: enemy.name,
        realm: enemy.realm,
        stage: enemy.realm_stage,
        level: `${enemy.realm} ${enemy.realm_stage}`,
        difficulty: enemyDifficulty,
      },
    };

    if (!options.deferPersistence) {
      await redis.set(
        `dungeon:battle:${battleId}`,
        JSON.stringify({ session, enemyObject: enemy }),
        'EX',
        3600,
      );
    }

    return {
      ...session,
      enemyObject: enemy,
    };
  }

  async handleBattleCallback(
    cultivatorId: string,
    battleResult: BattleRecordV3,
    nextCondition: CultivatorCondition,
    didLose: boolean,
    options: DungeonFlowOptions = {},
  ): Promise<{
    state?: DungeonState;
    roundData?: DungeonRound;
    isFinished: boolean;
    realGains?: ResourceOperation[];
    settlement?: DungeonSettlement;
    persist?: (
      tx: DbTransaction,
    ) => Promise<DungeonPersistenceSettlement | void>;
    afterCommit?: () => Promise<void>;
  }> {
    const state = await this.getState(cultivatorId);
    if (!state) throw new Error('Dungeon state not found');

    const lastHistory = state.history[state.history.length - 1];

    // Update State
    state.status = 'EXPLORING';
    delete state.activeBattleId;

    // Construct Narrative
    const enemyName = didLose
      ? battleResult.outcome.winner.name
      : battleResult.outcome.loser.name;
    const isWin = !didLose;
    if (!options.deferPersistence) {
      await updateCultivator(cultivatorId, { condition: nextCondition });
    }

    // 战斗失败处理：生成伤势状态
    if (!isWin) {
      const outcomeText = `你终究不敌 ${enemyName}，在其重击下狼狈遁走，侥幸捡回一条命。但你已无力再战，只得退出秘境。`;
      lastHistory.outcome = outcomeText;

      const settled = await this.settleDungeon(state, {
        endDisposition: 'retreated_after_battle',
        deferPersistence: options.deferPersistence,
      });
      if (!options.deferPersistence) {
        return settled;
      }
      return {
        ...settled,
        persist: async (tx) => {
          await updateCultivator(
            cultivatorId,
            { condition: nextCondition },
            tx,
          );
          const settlement = settled.persist
            ? await settled.persist(tx)
            : undefined;
          return mergeDungeonPersistenceSettlements(
            { condition: nextCondition },
            settlement && typeof settlement === 'object'
              ? settlement
              : undefined,
          );
        },
        afterCommit: settled.afterCommit,
      };
    }

    const outcomeText = `历经 ${battleResult.outcome.turns} 个回合的苦战，你成功击败了 ${enemyName}。虽然负了些伤，但总算化险为夷。`;
    lastHistory.outcome = outcomeText;

    // FIX: Instead of calling AI immediately, enter LOOTING state
    state.status = 'LOOTING';
    if (!options.deferPersistence) {
      await this.saveState(cultivatorId, state);
    }
    if (options.deferPersistence) {
      return {
        state,
        isFinished: false,
        persist: async (tx) => {
          await updateCultivator(
            cultivatorId,
            { condition: nextCondition },
            tx,
          );
          await this.persistStateRecord(cultivatorId, state, undefined, tx);
          return { condition: nextCondition };
        },
        afterCommit: async () => {
          await this.saveRedisState(cultivatorId, state);
        },
      };
    }
    return { state, isFinished: false };
  }

  async probeBattleEnemy(cultivatorId: string, battleId: string) {
    const { enemyObject } = await this.getBattleContext(cultivatorId, battleId);
    return enemyObject;
  }

  async executeBattle(
    cultivatorId: string,
    battleId: string,
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-battle-execute',
      () => this.executeBattleUnlocked(cultivatorId, battleId, options),
      options.lease,
    );
  }

  private async executeBattleUnlocked(
    cultivatorId: string,
    battleId: string,
    options: DungeonFlowOptions = {},
  ) {
    const { battleKey, enemyObject } = await this.getBattleContext(
      cultivatorId,
      battleId,
    );

    const cultivatorBundle = await loadCultivatorCombatInput(cultivatorId);
    if (!cultivatorBundle?.cultivator) {
      throw new Error('未找到修士数据');
    }

    const execution = executePersistentWorldBattle({
      strategyId: 'persistent_world',
      player: cultivatorBundle.cultivator,
      opponent: enemyObject,
    });
    const { battleResult, nextCondition, didLose } = execution;

    try {
      const callbackData = await this.handleBattleCallback(
        cultivatorId,
        battleResult,
        nextCondition,
        didLose,
        options,
      );
      if (options.deferPersistence) {
        const callbackAfterCommit = callbackData.afterCommit;
        return {
          battleResult,
          ...callbackData,
          afterCommit: async () => {
            if (callbackAfterCommit) {
              await callbackAfterCommit();
            }
            await redis.del(battleKey);
          },
        };
      }
      return {
        battleResult,
        ...callbackData,
      };
    } catch (error) {
      console.error('[DungeonService] 战斗回调失败，进入恢复路径:', error);
      const recovered = await this.recoverAfterBattleCallbackFailure(
        cultivatorId,
        battleResult,
        nextCondition,
        didLose,
        error instanceof Error ? error.message : undefined,
        options,
      );
      if (options.deferPersistence) {
        const recoveredAfterCommit = recovered.afterCommit;
        return {
          battleResult,
          ...recovered,
          afterCommit: async () => {
            if (recoveredAfterCommit) {
              await recoveredAfterCommit();
            }
            await redis.del(battleKey);
          },
        };
      }
      return {
        battleResult,
        ...recovered,
      };
    } finally {
      if (!options.deferPersistence) {
        await redis.del(battleKey);
      }
    }
  }

  async abandonBattle(
    cultivatorId: string,
    battleId: string,
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-battle-abandon',
      () => this.abandonBattleUnlocked(cultivatorId, battleId, options),
      options.lease,
    );
  }

  private async abandonBattleUnlocked(
    cultivatorId: string,
    battleId: string,
    options: DungeonFlowOptions = {},
  ) {
    const state = await this.getState(cultivatorId);
    if (!state || state.activeBattleId !== battleId) {
      throw new Error('当前没有匹配的遭遇战');
    }
    const battleKey = getDungeonBattleKey(battleId);

    delete state.activeBattleId;
    state.status = 'FINISHED';

    try {
      const result = await this.settleDungeon(state, {
        abandonedBattle: true,
        endDisposition: 'abandoned_before_battle',
        deferPersistence: options.deferPersistence,
      });
      if (!options.deferPersistence) {
        return result;
      }
      const settlementAfterCommit = result.afterCommit;
      return {
        ...result,
        afterCommit: async () => {
          if (settlementAfterCommit) {
            await settlementAfterCommit();
          }
          await redis.del(battleKey);
        },
      };
    } finally {
      if (!options.deferPersistence) {
        await redis.del(battleKey);
      }
    }
  }

  /**
   * 休整后继续探索 (触发 AI 生成下一轮)
   */
  async continueFromLooting(
    cultivatorId: string,
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-looting-continue',
      () => this.continueFromLootingUnlocked(cultivatorId, options),
      options.lease,
    );
  }

  private async continueFromLootingUnlocked(
    cultivatorId: string,
    options: DungeonFlowOptions,
  ) {
    const state = await this.getState(cultivatorId);
    if (!state) {
      throw new DungeonFlowError(
        DungeonFlowErrorCode.NOT_FOUND,
        '副本已失效',
        404,
      );
    }
    if (state.status !== 'LOOTING') {
      throw new DungeonFlowError(
        DungeonFlowErrorCode.INVALID_STATE,
        '当前副本状态已变化，请刷新后重试',
        409,
      );
    }

    state.status = 'GENERATING_NEXT';
    state.statusReason = undefined;
    state.recoverableActions = undefined;
    state.currentRound++;

    if (state.currentRound > state.maxRounds) {
      return this.settleDungeon(state, {
        deferPersistence: options.deferPersistence,
      });
    }

    return this.generateRoundAfterLooting(cultivatorId, state, options);
  }

  private async generateRoundAfterLooting(
    cultivatorId: string,
    state: DungeonState,
    options: DungeonFlowOptions = {},
  ) {
    let roundData: DungeonRound;
    try {
      roundData = await this.previewRoundResourceLoss(
        this.normalizeRoundOptions(
          await this.callAI(state, {
            narrativeStream: options.narrativeStream,
            abortSignal: options.abortSignal,
          }),
          state,
        ),
        cultivatorId,
      );
    } catch (error) {
      console.error('[DungeonService] 战后生成失败:', error);
      const recoverable = await this.markRecoverable(
        cultivatorId,
        state,
        error instanceof Error ? error.message : '战后继续推演失败',
        CONTINUE_RECOVERABLE_ACTIONS,
        options,
      );
      return options.deferPersistence
        ? {
            state: recoverable,
            isFinished: false,
            ...this.buildStateHooks(cultivatorId, recoverable),
          }
        : { state: recoverable, isFinished: false };
    }

    const acceptedItems = appendRoundRewards(state, roundData.acquired_items);
    const gainedNames = acceptedItems.map((i) => i.name || '未知物品');

    state.history.push({
      round: state.currentRound,
      scene: roundData.scene_description,
      gained_items: gainedNames,
    });
    state.currentOptions = roundData.interaction.options;
    state.dangerScore = roundData.status_update.internal_danger_score;
    state.status = 'EXPLORING';
    state.statusReason = undefined;
    state.recoverableActions = undefined;

    if (options.deferPersistence) {
      return {
        state,
        roundData,
        isFinished: false,
        ...this.buildStateHooks(cultivatorId, state),
      };
    }

    await this.saveState(cultivatorId, state);
    return { state, roundData, isFinished: false };
  }

  /**
   * 战后见好就收
   */
  async escapeFromLooting(
    cultivatorId: string,
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-looting-escape',
      () => this.escapeFromLootingUnlocked(cultivatorId, options),
      options.lease,
    );
  }

  private async escapeFromLootingUnlocked(
    cultivatorId: string,
    options: DungeonFlowOptions,
  ) {
    const state = await this.getState(cultivatorId);
    if (!state) {
      throw new DungeonFlowError(
        DungeonFlowErrorCode.NOT_FOUND,
        '副本已失效',
        404,
      );
    }
    if (state.status !== 'LOOTING') {
      throw new DungeonFlowError(
        DungeonFlowErrorCode.INVALID_STATE,
        '当前副本状态已变化，请刷新后重试',
        409,
      );
    }
    return this.settleDungeon(state, {
      abandonedBattle: true,
      endDisposition: 'retreated_after_battle',
      deferPersistence: options.deferPersistence,
    });
  }

  /**
   * 战斗回调失败时的恢复路径。
   * 目标：确保不会卡在战斗中，后续结算失败也能进入可重试状态。
   */
  async recoverAfterBattleCallbackFailure(
    cultivatorId: string,
    battleResult: BattleRecordV3,
    nextCondition: CultivatorCondition,
    didLose: boolean,
    reason?: string,
    options: DungeonFlowOptions = {},
  ): Promise<{
    state?: DungeonState;
    roundData?: DungeonRound;
    isFinished: boolean;
    settlement?: DungeonSettlement;
    realGains?: ResourceOperation[];
    persist?: (
      tx: DbTransaction,
    ) => Promise<DungeonPersistenceSettlement | void>;
    afterCommit?: () => Promise<void>;
  }> {
    const state = await this.getState(cultivatorId);
    if (!state) {
      throw new Error('Dungeon state not found during recovery');
    }

    delete state.activeBattleId;

    const enemyName = didLose
      ? battleResult.outcome.winner.name
      : battleResult.outcome.loser.name;
    const isWin = !didLose;
    const lastHistory = state.history[state.history.length - 1];
    if (!options.deferPersistence) {
      await updateCultivator(cultivatorId, { condition: nextCondition });
    }

    if (!isWin) {
      if (lastHistory) {
        lastHistory.outcome = `你不敌 ${enemyName}，被迫退出秘境。${reason ? `（天机紊乱：${reason}）` : ''}`;
      }

      const settled = await this.settleDungeon(state, {
        endDisposition: 'retreated_after_battle',
        deferPersistence: options.deferPersistence,
      });
      if (!options.deferPersistence) return settled;
      const persistSettlement = settled.persist;
      return {
        ...settled,
        persist: async (tx) => {
          await updateCultivator(
            cultivatorId,
            { condition: nextCondition },
            tx,
          );
          const persisted = persistSettlement
            ? await persistSettlement(tx)
            : undefined;
          return mergeDungeonPersistenceSettlements(
            { condition: nextCondition },
            persisted && typeof persisted === 'object' ? persisted : undefined,
          );
        },
      };
    }

    // 胜利但回调失败，强制进入 LOOTING 状态进行自我修复
    state.status = 'LOOTING';
    if (lastHistory) {
      lastHistory.outcome = `你击败了 ${enemyName}，但天机推演一时失序，需稳住心神。`;
    }
    if (!options.deferPersistence) {
      await this.saveState(cultivatorId, state);
    }
    if (options.deferPersistence) {
      return {
        state,
        isFinished: false,
        persist: async (tx) => {
          await updateCultivator(
            cultivatorId,
            { condition: nextCondition },
            tx,
          );
          await this.persistStateRecord(cultivatorId, state, undefined, tx);
          return { condition: nextCondition };
        },
        afterCommit: async () => {
          await this.saveRedisState(cultivatorId, state);
        },
      };
    }
    return { state, isFinished: false };
  }

  /**
   * 结算副本：采用“AI评价 + 后端发放”模式
   */
  async settleDungeon(
    state: DungeonState,
    options?: DungeonSettlementOptions,
  ): Promise<DungeonSettlementResult> {
    state.status = 'SETTLING';
    state.statusReason = undefined;
    state.recoverableActions = undefined;

    try {
      return await this.performSettlement(state, options);
    } catch (error) {
      console.error('[DungeonSettlement] 结算失败，进入可恢复状态:', error);
      const recoverableActions =
        error instanceof DungeonSettlementRecoverableError
          ? error.actions
          : SETTLE_RECOVERABLE_ACTIONS;
      const recoverable = await this.markRecoverable(
        state.cultivatorId,
        state,
        error instanceof Error ? error.message : '副本结算失败',
        recoverableActions,
        { deferPersistence: options?.deferPersistence },
      );
      return options?.deferPersistence
        ? {
            state: recoverable,
            isFinished: false,
            ...this.buildStateHooks(state.cultivatorId, recoverable),
          }
        : { state: recoverable, isFinished: false };
    }
  }

  private async performSettlement(
    state: DungeonState,
    options?: DungeonSettlementOptions,
  ): Promise<DungeonSettlementResult> {
    // --- 核心优化：使用 RewardFactory 将 AI 蓝图转化为真实奖励 ---
    // 获取地图境界门槛
    const mapNode = getMapNode(state.mapNodeId);
    const mapRealm =
      mapNode && 'realm_requirement' in mapNode
        ? (mapNode as SatelliteNode).realm_requirement
        : ('守灯' as RealmType);

    const endDisposition =
      options?.endDisposition ??
      (options?.abandonedBattle ? 'abandoned_before_battle' : 'completed');
    const deferPersistence = options?.deferPersistence === true;
    const pendingActionToCommit =
      options?.pendingAction &&
      !this.hasCommittedAction(state, options.pendingAction.actionId)
        ? options.pendingAction
        : undefined;
    let settlement = state.settlement;
    if (!settlement) {
      const settlementContext = buildDungeonSettlementLlmContext({
        state,
        mapRealm,
        endDisposition,
        pendingCosts: pendingActionToCommit?.costs,
      });
      const { system: settlementPrompt, user: settlementUserPrompt } =
        renderPrompt('dungeon-settlement', {
          materialTypeTable: DUNGEON_MATERIAL_TYPE_GUIDE,
          settlementContextJson: stableCompactStringify(settlementContext),
        });

      const aiRes = await generateAiObject({
        system: settlementPrompt,
        prompt: settlementUserPrompt,
        schema: createDungeonSettlementLlmSchema({
          remainingRewardSlots: settlementContext.remainingExtraRewardSlots,
          endDisposition,
        }),
        name: 'DungeonSettlement',
        sceneId: 'dungeon-settlement',
        maxOutputTokens: 1600,
      });
      const generatedSettlement = DungeonSettlementGeneratedSchema.parse({
        ending_narrative: aiRes.output.ending_narrative,
        reward_tier: aiRes.output.reward_tier,
        reward_blueprints: aiRes.output.reward_blueprints,
      });
      settlement = normalizeSettlementRewards(
        {
          ending_narrative: generatedSettlement.ending_narrative,
          settlement: {
            reward_tier: generatedSettlement.reward_tier,
            reward_blueprints: generatedSettlement.reward_blueprints,
            performance_tags: [],
          },
        },
        state.accumulatedRewards ?? [],
        {
          endDisposition,
          dangerScore: state.dangerScore,
          committedCostCount:
            (state.summary_of_sacrifice?.length ?? 0) +
            (pendingActionToCommit?.costs.length ?? 0),
        },
      );
    }
    settlement = normalizeSettlementRewards(
      settlement,
      state.accumulatedRewards ?? [],
      {
        endDisposition,
        dangerScore: state.dangerScore,
        committedCostCount:
          (state.summary_of_sacrifice?.length ?? 0) +
          (pendingActionToCommit?.costs.length ?? 0),
      },
    );

    if (pendingActionToCommit) {
      const userId = await findActiveCultivatorOwnerId(state.cultivatorId);
      if (!userId) {
        throw new Error('无法获取修士所属用户');
      }
      if (!deferPersistence) {
        const result = await getExecutor().transaction(async (tx) => {
          const applied = await resourceEngine.applyInTransaction({
            userId,
            cultivatorId: state.cultivatorId,
            consume: pendingActionToCommit.costs as ResourceOperation[],
            tx,
          });
          if (applied.success) {
            await this.applyConditionResourceLosses(
              state.cultivatorId,
              pendingActionToCommit.costs,
              tx,
            );
          }
          return applied;
        });
        if (!result.success) {
          state.status = 'EXPLORING';
          state.pendingAction = {
            ...pendingActionToCommit,
            status: 'failed',
            error: result.errors?.join('; ') || '资源消耗失败',
          };
          state.costPreview = undefined;
          await this.saveState(state.cultivatorId, state);
          throw new DungeonSettlementRecoverableError(
            result.errors?.join('; ') || '资源消耗失败',
            ACTION_RECOVERABLE_ACTIONS,
          );
        }
      }
      this.commitCostsToState(state, pendingActionToCommit);
      state.pendingAction = undefined;
      state.costPreview = undefined;
      if (!deferPersistence) {
        await this.saveState(state.cultivatorId, state);
      }
    }

    if (!state.settlement) {
      state.settlement = settlement;
      if (!deferPersistence) {
        await this.saveState(state.cultivatorId, state);
      }
    }

    const committedSettlementGain = state.gainLedger?.find(
      (entry) => entry.source === 'settlement',
    );
    const realGains =
      state.realGains ??
      committedSettlementGain?.gains ??
      RewardFactory.generateAllRewards(
        settlement.settlement.reward_blueprints as RewardBlueprint[],
        mapRealm,
        settlement.settlement.reward_tier,
        state.dangerScore, // 传递危险分数用于奖励计算
        state.playerInfo, // 传递玩家信息用于灯韵计算
        mapNode ? resolveDungeonMapConfig(mapNode).difficultyTier : undefined,
      );
    state.realGains = realGains;
    if (!deferPersistence) {
      await this.saveState(state.cultivatorId, state);
    }

    // 获取 userId
    const userId = await findActiveCultivatorOwnerId(state.cultivatorId);
    if (!userId) {
      throw new Error('无法获取修士所属用户');
    }

    let nextGainLedger = state.gainLedger ?? [];
    if (!committedSettlementGain) {
      // DungeonResourceGain 与 ResourceOperation 结构兼容
      // desc 字段在 ResourceEngine 中会被忽略
      nextGainLedger = [
        ...(state.gainLedger ?? []),
        {
          source: 'settlement' as const,
          gains: realGains,
          committedAt: new Date().toISOString(),
        },
      ];
      if (!deferPersistence) {
        const runId = state.runId;
        const result = await getExecutor().transaction(async (tx) => {
          const applied = await resourceEngine.applyInTransaction({
            userId,
            cultivatorId: state.cultivatorId,
            gain: realGains as ResourceOperation[],
            tx,
          });
          if (applied.success && runId) {
            await tx
              .update(dungeonRuns)
              .set({
                runState: {
                  ...state,
                  gainLedger: nextGainLedger,
                  realGains,
                },
                gainLedger: nextGainLedger,
              })
              .where(eq(dungeonRuns.id, runId));
          }
          return applied;
        });

        if (!result.success) {
          throw new Error(result.errors?.join('; ') || '资源获得失败');
        }
      }

      state.gainLedger = nextGainLedger;
      if (!deferPersistence) {
        await this.saveState(state.cultivatorId, state);
      }
    }

    let domainEventId: string | undefined;
    const recordDungeonSettledEvent = async (tx: DbTransaction) => {
      if (!state.runId) throw new Error('副本结算缺少运行编号');
      const event = await createDomainEvent(
        {
          type: 'dungeon.run.settled',
          aggregate: { type: 'dungeon-run', id: state.runId },
          data: {
            cultivatorId: state.cultivatorId,
            runId: state.runId,
            mapNodeId: state.mapNodeId,
            outcome: endDisposition,
          },
          deduplicationKey: `${state.cultivatorId}:dungeon:${state.runId}`,
        },
        tx,
      );
      domainEventId = event.id;
    };

    if (!deferPersistence) {
      await getExecutor().transaction(async (tx) => {
        await this.archiveDungeon(state, settlement, realGains, {
          tx,
          clearRedis: false,
        });
        await recordDungeonSettledEvent(tx);
      });
      await redis.del(getDungeonKey(state.cultivatorId));
      publishTransactionalMessageBestEffort(domainEventId, {
        source: 'dungeon_settlement',
        cultivatorId: state.cultivatorId,
        runId: state.runId,
      });
    }

    if (!deferPersistence) {
      return { isFinished: true, settlement, realGains };
    }

    return {
      isFinished: true,
      settlement,
      realGains,
      persist: async (tx) => {
        await this.assertTerminalRunCanCommit(tx, state);

        let consumedSettlement: DungeonPersistenceSettlement | undefined;
        let gainedSettlement: DungeonPersistenceSettlement | undefined;
        let condition: Cultivator['condition'] | undefined;
        if (pendingActionToCommit) {
          const consumeResult = await resourceEngine.applyInTransaction({
            userId,
            cultivatorId: state.cultivatorId,
            consume: pendingActionToCommit.costs as ResourceOperation[],
            tx,
          });
          if (!consumeResult.success) {
            throw new Error(consumeResult.errors?.join('; ') || '资源消耗失败');
          }
          condition =
            (await this.applyConditionResourceLosses(
              state.cultivatorId,
              pendingActionToCommit.costs,
              tx,
            )) ?? undefined;
          consumedSettlement = toDungeonPersistenceSettlement(consumeResult);
        }

        if (!committedSettlementGain) {
          const runId = state.runId;
          const gainResult = await resourceEngine.applyInTransaction({
            userId,
            cultivatorId: state.cultivatorId,
            gain: realGains as ResourceOperation[],
            tx,
          });
          if (gainResult.success && runId) {
            await tx
              .update(dungeonRuns)
              .set({
                runState: {
                  ...state,
                  gainLedger: nextGainLedger,
                  realGains,
                },
                gainLedger: nextGainLedger,
              })
              .where(eq(dungeonRuns.id, runId));
          }
          if (!gainResult.success) {
            throw new Error(gainResult.errors?.join('; ') || '资源获得失败');
          }
          gainedSettlement = toDungeonPersistenceSettlement(gainResult);
        }

        await this.archiveDungeon(state, settlement, realGains, {
          tx,
          clearRedis: false,
        });
        await recordDungeonSettledEvent(tx);
        return mergeDungeonPersistenceSettlements(
          consumedSettlement,
          gainedSettlement,
          condition ? { condition } : null,
        );
      },
      afterCommit: async () => {
        await redis.del(getDungeonKey(state.cultivatorId));
        publishTransactionalMessageBestEffort(domainEventId, {
          source: 'dungeon_settlement',
          cultivatorId: state.cultivatorId,
          runId: state.runId,
        });
      },
    };
  }

  /**
   * 内部工具：调用 AI 并处理上下文压缩。
   * 未配置 LLM 时降级到内置模板生成副本回合（与角色生成降级策略一致）。
   */
  private async callAI(
    state: DungeonState,
    stream?: Pick<DungeonFlowOptions, 'narrativeStream' | 'abortSignal'>,
  ): Promise<DungeonRound> {
    if (!hasAnyServerLlmProviderConfigured()) {
      console.warn(
        '[DungeonService] 未配置 LLM Provider，使用内置模板生成副本回合',
      );
      return this.buildTemplateRound(state);
    }

    const mapNode = getMapNode(state.mapNodeId);
    const mapRealm =
      mapNode && 'realm_requirement' in mapNode
        ? (mapNode as SatelliteNode).realm_requirement
        : ('守灯' as RealmType);
    const mapConfig = mapNode
      ? resolveDungeonMapConfig(mapNode)
      : resolveDungeonMapConfig({
          id: 'fallback-dungeon-map',
          name: '未知秘境',
          parent_id: 'fallback',
          type: '秘境',
          realm_requirement: mapRealm,
          tags: [],
          description: '',
          connections: [],
          x: 0,
          y: 0,
        });
    const realmGap = this.calculateRealmGap(state.playerInfo.realm, mapRealm);
    const phase = this.getPhase(state.currentRound, state.maxRounds, realmGap);
    const userContext: DungeonRoundLlmContext = buildDungeonRoundLlmContext({
      state,
      mapConfig,
      realmGap,
      phase,
    });

    const remainingRewardSlots = Math.max(
      0,
      DUNGEON_REWARD_BLUEPRINT_LIMIT - state.accumulatedRewards.length,
    );
    const { system: roundPrompt, user: roundUserPrompt } = renderPrompt(
      'dungeon-round',
      {
        materialTypeTable: DUNGEON_MATERIAL_TYPE_GUIDE,
        userContextJson: stableCompactStringify(userContext),
      },
    );
    const sampleSystem = renderPromptSystem('sample-scenarios');
    const llmRequest = {
      system: [roundPrompt, sampleSystem].filter(Boolean).join('\n\n'),
      prompt: roundUserPrompt,
      schema: createDungeonRoundLlmSchema(remainingRewardSlots),
      name: 'DungeonRound',
      sceneId: 'dungeon-round' as const,
      // 硬性输出上限：glm-4-flash 等模型可能无视字数约束放飞（实测输出过 1.5 万字/回合），
      // 上限设为可容纳 480 字叙事 + 3 选项 + 战利品蓝图的合理量级。
      maxOutputTokens: 2400,
    };
    // 使用「宽松文本模式」（无 schema 校验）：
    // glm-4-flash 等模型对复杂 Zod schema 的 AI SDK 结构化输出（Output.object）实测 100% 校验失败，
    // 每轮白白消耗 3 次调用（流式 1 + fallback 2）约 40s 后仍降级模板。
    // 宽松模式：streamText/generateText 拿原始文本 → extractJsonObjectFromText 手动提取 JSON →
    // repairDungeonRoundOutput 宽容修复。scene_description 在流式过程中渐进提取推给前端展示。
    let aiOutput: DungeonRoundLlmOutput | null = null;
    try {
      if (stream?.narrativeStream) {
        const result = streamAiText({
          ...llmRequest,
          abortSignal: stream.abortSignal,
        });
        let accum = '';
        let lastScene = '';
        for await (const part of result.textStream) {
          accum += part;
          const scene = extractSceneDescriptionProgress(accum);
          // 只在 scene_description 增长时才推送（避免每个 token 一个 SSE 事件）
          if (scene && scene !== lastScene) {
            lastScene = scene;
            stream.narrativeStream?.(scene);
          }
        }
        aiOutput = extractJsonObjectFromText(accum) as
          | DungeonRoundLlmOutput
          | null;
      } else {
        const result = await generateAiText(llmRequest);
        aiOutput = extractJsonObjectFromText(result.text) as
          | DungeonRoundLlmOutput
          | null;
      }
    } catch (llmError) {
      console.warn(
        '[DungeonService] callAI LLM 生成失败，降级模板回合:',
        llmError instanceof Error ? llmError.message : String(llmError),
      );
      return this.buildTemplateRound(state);
    }
    if (!aiOutput || typeof aiOutput !== 'object') {
      console.warn(
        '[DungeonService] callAI 输出为空或非对象，降级模板回合',
      );
      return this.buildTemplateRound(state);
    }

    // 宽容修复：模型输出结构"差不多"时补齐/截断，尽量保留 AI 叙事。
    // - scene_description 剥离 Markdown 代码块标记（```json{...}```），避免当正文渲染
    // - options 不足 3 个用模板选项补齐；高风险选项（index 1）零代价时注入标准代价
    // - internal_danger_score 越界/非整数时夹取到 [0,100] 整数
    // - acquired_items 超出剩余槽位时截断
    const repaired = this.repairDungeonRoundOutput(aiOutput, {
      maxRewardSlots: remainingRewardSlots,
    });
    if (!repaired) {
      return this.buildTemplateRound(state);
    }
    const sanitizedScene =
      typeof repaired.scene_description === 'string'
        ? repaired.scene_description
            .replace(/```(?:json)?\s*[\s\S]*?```/g, '')
            .replace(/```/g, '')
            .trim() || repaired.scene_description
        : repaired.scene_description;
    try {
      return DungeonRoundSchema.parse({
        scene_description: sanitizedScene,
        interaction: {
          options: repaired.options.map((option, index) => {
            const costs: DungeonOptionCost[] = [
              ...option.costs.resources.map((cost) => ({
                type: cost.type,
                value: calculateDungeonResourceCost({
                  ...cost,
                  realm: mapConfig.realmRequirement,
                  difficulty: mapConfig.difficultyTier,
                }),
              })),
              ...option.costs.materials.map((cost) => {
                const resolved = calculateDungeonMaterialCost({
                  realm: mapConfig.realmRequirement,
                  difficulty: mapConfig.difficultyTier,
                  rank: cost.rank,
                });
return {
                type: 'material' as const,
                required_type: cost.required_type,
                required_quality: resolved.requiredQuality,
                value: resolved.value,
              };
            }),
            ...option.costs.stat_losses.map((cost) => ({
              type: cost.type,
              value: calculateDungeonStatLoss({
                realm: mapConfig.realmRequirement,
                difficulty: mapConfig.difficultyTier,
                rank: cost.rank,
              }),
            })),
            ...option.costs.battles.map((metadata) => ({
              type: 'battle' as const,
              value: 1,
              metadata,
            })),
            ];
            return {
              text: option.text,
              id: index + 1,
              risk_level: (['low', 'high', 'medium'] as const)[index] ?? 'medium',
              costs,
            };
          }),
        },
        acquired_items: repaired.acquired_items,
        status_update: {
          is_final_round: state.currentRound >= state.maxRounds,
          internal_danger_score: repaired.internal_danger_score,
        },
      });
    } catch (parseError) {
      console.warn(
        '[DungeonService] callAI schema parse failed, fallback to template round:',
        parseError instanceof Error ? parseError.message : String(parseError),
      );
      return this.buildTemplateRound(state);
    }
  }

  /**
   * 宽容修复：模型输出结构"差不多"时补齐/截断，尽量保留 AI 叙事。
   * - scene_description 剥离 Markdown 代码块标记（```json{...}```），避免当正文渲染
   * - options 不足 3 个用模板选项补齐；高风险选项（index 1）零代价时注入标准代价
   * - internal_danger_score 越界/非整数时夹取到 [0,100] 整数
   * - acquired_items 超出剩余槽位时截断
   * 返回 null 表示结构损坏不可救，调用方应降级模板回合。
   */
  private repairDungeonRoundOutput(
    output: DungeonRoundLlmOutput,
    opts: { maxRewardSlots: number },
  ): DungeonRoundLlmOutput | null {
    if (!output || typeof output !== 'object') return null;
    const scene =
      typeof output.scene_description === 'string'
        ? output.scene_description
        : '';
    if (!scene.trim()) return null;

    let options = Array.isArray(output.options) ? output.options : [];
    if (options.length === 0) return null;
    // 不足 3 个：用模板选项补齐（复用 buildTemplateRound 的语义，简单注入标准代价）
    while (options.length < 3) {
      options = [
        ...options,
        {
          text: '凝神戒备，先看清四周再说。',
          costs: {
            resources: [],
            materials: [],
            stat_losses: [{ type: 'hp_loss', rank: 'minor' as const }],
            battles: [],
          },
        },
      ];
    }
    // 高风险选项（index 1）零代价时注入标准灵石代价，满足 schema superRefine
    const highRisk = options[1];
    if (highRisk?.costs) {
      const total =
        (highRisk.costs.resources?.length ?? 0) +
        (highRisk.costs.materials?.length ?? 0) +
        (highRisk.costs.stat_losses?.length ?? 0) +
        (highRisk.costs.battles?.length ?? 0);
      if (total === 0) {
        highRisk.costs.resources = [
          { type: 'spirit_stones', rank: 'standard' as const },
        ];
      }
    }
    // 每个选项最多两项代价（schema superRefine），超出截断
    for (const option of options) {
      if (!option?.costs) continue;
      const costs = option.costs;
      const stack = [
        ...(costs.resources ?? []).map((c) => ({ type: 'r', v: c })),
        ...(costs.materials ?? []).map((c) => ({ type: 'm', v: c })),
        ...(costs.stat_losses ?? []).map((c) => ({ type: 's', v: c })),
        ...(costs.battles ?? []).map((c) => ({ type: 'b', v: c })),
      ];
      if (stack.length > 2) {
        const keep = stack.slice(0, 2);
        costs.resources = keep
          .filter((k) => k.type === 'r')
          .map((k) => k.v as (typeof costs.resources)[number]);
        costs.materials = keep
          .filter((k) => k.type === 'm')
          .map((k) => k.v as (typeof costs.materials)[number]);
        costs.stat_losses = keep
          .filter((k) => k.type === 's')
          .map((k) => k.v as (typeof costs.stat_losses)[number]);
        costs.battles = keep
          .filter((k) => k.type === 'b')
          .map((k) => k.v as (typeof costs.battles)[number]);
      }
    }

    // internal_danger_score 夹取到 [0,100] 整数
    let danger =
      typeof output.internal_danger_score === 'number' &&
      Number.isFinite(output.internal_danger_score)
        ? Math.round(output.internal_danger_score)
        : 30;
    if (!Number.isFinite(danger)) danger = 30;
    danger = Math.min(100, Math.max(0, danger));

    // acquired_items 超出剩余槽位时截断
    let acquired = Array.isArray(output.acquired_items)
      ? output.acquired_items
      : [];
    if (acquired.length > Math.max(0, opts.maxRewardSlots)) {
      acquired = acquired.slice(0, Math.max(0, opts.maxRewardSlots));
    }

    return {
      scene_description: scene,
      options: options as DungeonRoundLlmOutput['options'],
      acquired_items: acquired,
      internal_danger_score: danger,
    };
  }

  /**
   * 内部工具：未配置 LLM 时的模板降级回合生成。
   * 生成符合克苏鲁修仙世界观的最小可用副本回合（场景 + 三个抉择），
   * 数值成本复用引擎归一化函数，奖励留空由后续流程兜底。
   */
  private buildTemplateRound(state: DungeonState): DungeonRound {
    const mapNode = getMapNode(state.mapNodeId);
    const mapConfig = mapNode
      ? resolveDungeonMapConfig(mapNode)
      : { difficultyTier: 'easy' as const };
    const difficulty = mapConfig.difficultyTier;
    const realm = state.playerInfo.realm as RealmType;
    const locationName = mapNode?.name ?? state.theme ?? '未知秘境';
    const isFinalRound = state.currentRound >= state.maxRounds;
    const roundIdx = state.currentRound;

    // 场景描写（窥渊录克苏鲁叙事，随地图与回合渐进；每段≥350字，三段意象互不雷同）
    const sceneVariants = [
      `${locationName}深处，昏黄灯影在黏腻的潮气里晃成一片。你听见低低的、像是从墙壁里渗出的窸窣声——那不是风声，是某种东西在缓慢挪动。你停下脚步，那声音也跟着停了，仿佛有谁隔着墙在听你呼吸。灯油的气味里混进一丝铁锈般的腥甜，你低头，看见脚边石缝里缓缓漫出一线深色的水，不流向低处，却逆着坡度往上爬。`,
      `${locationName}的阴影比灯更沉。暗处一双双不该有的眼睛半阖半睁，它们不看你，却仿佛在等你先迈出那一步。你数了数，又数不清，因为每当你把灯照过去，那些眼睛就闭上一只、再在别处睁开两只。脚边漫过一摊深色的、像血又像油的积水，水面倒影里多出一个不该在身后的轮廓，一动不动。`,
      `${locationName}尽头，一扇爬满旧符的窄门半掩着。门缝里漏出的不是光，而是更浓的黑暗——黑暗中隐约有叹息，又有推门声，一下、又一下，节奏与你自己的心跳错开半拍。符纸被潮气泡得发软，有些字被啃掉了一半，剩下的一半你认得，却念不出口。`,
    ];
    const sceneTail = isFinalRound
      ? '\n这是最后一步了。前面再没有更次，也没有退路——你要么在此收束此行，要么被这地方的什么东西永远留下。灯芯跳了跳，像在等你作个了断。'
      : '\n你握紧手中的灯，灯芯跳了跳。路还在前面，可每一步都要拿点东西来换。';
    const scene =
      sceneVariants[(roundIdx - 1) % sceneVariants.length] + sceneTail;

    // 三个抉择的代价（复用引擎归一化函数）
    const lowRisk: DungeonOptionCost[] = [
      {
        type: 'hp_loss',
        value: calculateDungeonStatLoss({ realm, difficulty, rank: 'minor' }),
      },
    ];
    const midRisk: DungeonOptionCost[] = [
      {
        type: 'spirit_stones',
        value: calculateDungeonResourceCost({
          type: 'spirit_stones',
          realm,
          difficulty,
          rank: 'standard',
        }),
      },
    ];
    const highRisk: DungeonOptionCost[] = [
      {
        type: 'hp_loss',
        value: calculateDungeonStatLoss({ realm, difficulty, rank: 'major' }),
      },
      {
        type: 'cultivation_exp',
        value: calculateDungeonResourceCost({
          type: 'cultivation_exp',
          realm,
          difficulty,
          rank: 'standard',
        }),
      },
    ];

    // 选项措辞随回合与意象递进，避免一成不变的“绕行/点灯/惊动”三件套。
    const optionSets = [
      {
        low: '贴着墙根缓步绕行，避开那逆流而上的水线，先看清渗声从何而来。',
        mid: '取一撮灯油抹在刃上，将火光照进最黑的角落，逼那挪动之物显出痕迹。',
        high: '一脚踩上那摊逆流的水，喝破暗处，逼它现形。',
      },
      {
        low: '屏住呼吸，不惊动那些半阖的眼睛，退到阴影外重新数一遍出口。',
        mid: '把灯挑高，借水面倒影确认身后那个轮廓的方位，再决定如何下脚。',
        high: '猛地回身，将灯照向身后的轮廓，正面与它照个对眼。',
      },
      {
        low: '不推那扇门，先顺着符纸被啃掉的缺口，辨认门后到底封着什么。',
        mid: '撕下半张尚完好的旧符缠在腕上，隔门低语，探问门内之物。',
        high: '一脚踹开窄门，把灯探进那比夜更浓的黑暗。',
      },
    ];
    const opts = optionSets[(roundIdx - 1) % optionSets.length];

    return {
      scene_description: scene,
      interaction: {
        options: [
          {
            id: 1,
            text: opts.low,
            risk_level: 'low',
            costs: lowRisk,
          },
          {
            id: 2,
            text: opts.mid,
            risk_level: 'medium',
            costs: midRisk,
          },
          {
            id: 3,
            text: isFinalRound ? '咬紧牙关，径直穿进黑暗，去拿这一趟的因果。' : opts.high,
            risk_level: 'high',
            costs: highRisk,
          },
        ],
      },
      acquired_items: [],
      status_update: {
        is_final_round: isFinalRound,
        internal_danger_score: Math.min(100, 10 + roundIdx * 8),
      },
    };
  }

  async saveState(
    cultivatorId: string,
    state: DungeonState,
    battlePayload?: DungeonBattleCachePayload,
  ) {
    this.normalizeState(state);
    await this.persistStateRecord(cultivatorId, state, battlePayload);
    await this.saveRedisState(cultivatorId, state);
  }

  private async persistStateRecord(
    cultivatorId: string,
    state: DungeonState,
    battlePayload?: DungeonBattleCachePayload,
    tx?: DbTransaction,
  ) {
    this.normalizeState(state);
    const values = {
      cultivatorId,
      mapNodeId: state.mapNodeId,
      status: state.status,
      currentRound: state.currentRound,
      maxRounds: state.maxRounds,
      dangerScore: state.dangerScore,
      runState: state,
      costLedger: state.costLedger ?? [],
      gainLedger: state.gainLedger ?? [],
      pendingAction: state.pendingAction ?? null,
      activeBattleId: state.activeBattleId ?? null,
      battlePayload: battlePayload ?? null,
    };
    const q = tx ?? getExecutor();

    if (state.runId) {
      await q
        .update(dungeonRuns)
        .set(values)
        .where(eq(dungeonRuns.id, state.runId));
    } else {
      const inserted = await q
        .insert(dungeonRuns)
        .values(values)
        .returning({ id: dungeonRuns.id });
      state.runId = inserted[0]?.id;
      if (state.runId) {
        await q
          .update(dungeonRuns)
          .set({ runState: state })
          .where(eq(dungeonRuns.id, state.runId));
      }
    }
  }

  private async assertTerminalRunCanCommit(
    tx: DbTransaction,
    state: DungeonState,
  ) {
    if (!state.runId) {
      return;
    }

    const claimed = await tx
      .update(dungeonRuns)
      .set({
        status: 'FINISHED',
        endedAt: new Date(),
      })
      .where(
        and(
          eq(dungeonRuns.id, state.runId),
          isNull(dungeonRuns.endedAt),
          ne(dungeonRuns.status, 'FINISHED'),
        ),
      )
      .returning({ id: dungeonRuns.id });

    if (claimed.length === 1) {
      return;
    }

    const [run] = await tx
      .select({ id: dungeonRuns.id })
      .from(dungeonRuns)
      .where(eq(dungeonRuns.id, state.runId))
      .limit(1);
    if (!run) {
      throw new DungeonFlowError(
        DungeonFlowErrorCode.NOT_FOUND,
        '副本已失效',
        404,
      );
    }

    throw new DungeonFlowError(
      DungeonFlowErrorCode.INVALID_STATE,
      '当前副本已完成，请刷新查看结算',
      409,
    );
  }

  private async saveRedisState(cultivatorId: string, state: DungeonState) {
    await redis.set(
      getDungeonKey(cultivatorId),
      JSON.stringify(state),
      'EX',
      REDIS_TTL,
    );
  }

  async getState(cultivatorId: string) {
    const key = getDungeonKey(cultivatorId);
    const run = await this.loadActiveRun(cultivatorId);
    let state: DungeonState | null;
    if (run) {
      state = run.runState as DungeonState;
      state.runId = run.id;
      state.status = run.status as DungeonState['status'];
      state.currentRound = run.currentRound;
      state.maxRounds = run.maxRounds;
      state.dangerScore = run.dangerScore;
      state.costLedger = (run.costLedger as DungeonState['costLedger']) ?? [];
      state.gainLedger = (run.gainLedger as DungeonState['gainLedger']) ?? [];
      state.pendingAction =
        (run.pendingAction as DungeonState['pendingAction']) ?? undefined;
      state.activeBattleId = run.activeBattleId ?? state.activeBattleId;
      this.normalizeState(state);
      await redis.set(key, JSON.stringify(state), 'EX', REDIS_TTL);
    } else {
      state = parseRedisJson<DungeonState>(await redis.get(key), key);
    }
    if (!state) return null;
    return this.normalizeState(state);
  }

  async prepareDungeonContext(cultivatorId: string, mapNodeId: string) {
    const player = await this.getPlayer(cultivatorId);
    const mapNode = this.getMapNode(mapNodeId);
    assertDungeonRealmEligible(
      player.realm.split(' ')[0] as RealmType,
      mapNode.realm_requirement,
    );
    return {
      playerInfo: player,
      location: {
        location: mapNode.name,
        location_tags: mapNode.tags,
        location_description: mapNode.description,
      },
    };
  }

  async getPlayer(cultivatorId: string) {
    const cultivatorBundle =
      await loadCultivatorDungeonPromptFacts(cultivatorId);
    if (!cultivatorBundle) throw new Error('未找到名为该道友的记录');
    const cultivator = cultivatorBundle;
    const { finalAttributes, attrs } =
      getCultivatorDisplayAttributes(cultivator);
    return {
      id: cultivator.id,
      name: cultivator.name,
      realm: `${cultivator.realm} ${cultivator.realm_stage}`,
      gender: cultivator.gender,
      age: cultivator.age,
      lifespan: cultivator.lifespan,
      personality: cultivator.personality || '普通',
      attributes: { ...finalAttributes },
      resourceCaps: {
        maxHp: attrs.maxHp,
        maxMp: attrs.maxMp,
      },
      spiritual_roots: cultivator.spiritual_roots.map(
        (root) => `${root.element}(${root.grade})`,
      ),
      fates: cultivator.pre_heaven_fates.map(
        (fate) => `${fate.name}(${fate.description})`,
      ),
      skills: cultivator.cultivations.map((skill) => skill.name),
      spirit_stones: cultivator.spirit_stones,
      background: cultivator.background || '',
      inventory_summary:
        '玩家拥有储物袋。如有需要特定材料的操作，请使用模糊类型与品质要求。',
    };
  }

  getMapNode(mapNodeId: string) {
    const mapNode = getMapNode(mapNodeId);
    if (!mapNode) throw new Error('无效的地图节点');
    return mapNode;
  }

  async archiveDungeon(
    state: DungeonState,
    settlement: DungeonSettlement,
    realGains?: ResourceOperation[],
    options: { tx?: DbTransaction; clearRedis?: boolean } = {},
  ) {
    state.status = 'FINISHED';
    state.isFinished = true;
    state.settlement = settlement;
    state.realGains = realGains;
    state.pendingAction = undefined;
    state.costPreview = undefined;
    state.recoverableActions = undefined;
    state.activeBattleId = undefined;

    const archive = async (tx: DbTransaction) => {
      if (!state.archiveHistoryCommittedAt) {
        await tx.insert(dungeonHistories).values({
          cultivatorId: state.cultivatorId,
          theme: state.theme,
          result: settlement,
          log: state.history
            .map((h) => `[Round ${h.round}] ${h.scene} -> Choice: ${h.choice}`)
            .join('\n'),
          realGains: realGains ?? null,
        });
        state.archiveHistoryCommittedAt = new Date().toISOString();
      }

      if (state.runId) {
        await tx
          .update(dungeonRuns)
          .set({
            status: 'FINISHED',
            runState: this.normalizeState(state),
            costLedger: state.costLedger ?? [],
            gainLedger: state.gainLedger ?? [],
            pendingAction: null,
            activeBattleId: null,
            battlePayload: null,
            endedAt: new Date(),
          })
          .where(eq(dungeonRuns.id, state.runId));
      }
    };

    if (options.tx) {
      await archive(options.tx);
    } else {
      await getExecutor().transaction(archive);
    }

    if (options.clearRedis !== false) {
      await redis.del(getDungeonKey(state.cultivatorId));
    }
  }

  /**
   * Abandon the current dungeon
   */
  async recoverDungeon(
    cultivatorId: string,
    action: DungeonRecoverAction,
    options: DungeonFlowOptions = {},
  ) {
    return this.withFlowLock(
      cultivatorId,
      'dungeon-recover',
      () => this.recoverDungeonUnlocked(cultivatorId, action, options),
      options.lease,
    );
  }

  private async recoverDungeonUnlocked(
    cultivatorId: string,
    action: DungeonRecoverAction,
    options: DungeonFlowOptions = {},
  ) {
    const state = await this.getState(cultivatorId);
    if (!state) {
      throw new Error('副本已失效');
    }

    if (action === 'force_quit') {
      return this.quitDungeon(cultivatorId, options);
    }

    if (action === 'safe_retreat') {
      delete state.activeBattleId;
      state.status = 'SETTLING';
      state.statusReason = '已选择安全撤退';
      state.recoverableActions = undefined;
      return this.settleDungeon(state, {
        abandonedBattle: true,
        endDisposition: 'retreated_after_battle',
        deferPersistence: options.deferPersistence,
      });
    }

    if (action === 'retry_continue') {
      if (
        state.status !== 'RECOVERABLE_ERROR' ||
        !state.recoverableActions?.includes('retry_continue')
      ) {
        throw new DungeonFlowError(
          DungeonFlowErrorCode.INVALID_STATE,
          '当前副本状态无法重试推进',
          409,
        );
      }
      state.status = 'GENERATING_NEXT';
      state.statusReason = undefined;
      state.recoverableActions = undefined;
      if (state.currentRound > state.maxRounds) {
        return this.settleDungeon(state, {
          deferPersistence: options.deferPersistence,
        });
      }
      return this.generateRoundAfterLooting(cultivatorId, state, options);
    }

    if (action === 'retry_settle') {
      if (
        state.status !== 'RECOVERABLE_ERROR' ||
        !state.recoverableActions?.includes('retry_settle')
      ) {
        throw new DungeonFlowError(
          DungeonFlowErrorCode.INVALID_STATE,
          '当前副本状态无法重试结算',
          409,
        );
      }
      state.status = 'SETTLING';
      state.statusReason = undefined;
      state.recoverableActions = undefined;
      delete state.activeBattleId;
      return this.settleDungeon(state, {
        deferPersistence: options.deferPersistence,
      });
    }

    if (action === 'retry') {
      const pending = state.pendingAction;
      if (!pending?.choiceId) {
        state.status = 'EXPLORING';
        state.statusReason = undefined;
        state.recoverableActions = undefined;
        state.pendingAction = undefined;
        state.costPreview = undefined;
        if (options.deferPersistence) {
          return {
            state,
            isFinished: false,
            ...this.buildStateHooks(cultivatorId, state),
          };
        }
        await this.saveState(cultivatorId, state);
        return { state, isFinished: false };
      }

      state.status = 'EXPLORING';
      state.statusReason = undefined;
      state.recoverableActions = undefined;
      state.pendingAction = undefined;
      state.costPreview = undefined;
      if (!options.deferPersistence) {
        await this.saveState(cultivatorId, state);
      }
      return this.handleActionUnlocked(
        cultivatorId,
        pending.choiceId,
        pending.actionId,
        options,
      );
    }

    throw new Error('未知的副本恢复动作');
  }

  async quitDungeon(cultivatorId: string, options: DungeonFlowOptions = {}) {
    const key = getDungeonKey(cultivatorId);

    const state = await this.getState(cultivatorId);
    if (state) {
      state.status = 'FINISHED';
      state.isFinished = true;
      state.pendingAction = undefined;
      state.costPreview = undefined;
      state.recoverableActions = undefined;
      state.activeBattleId = undefined;
      const persist = async (tx: DbTransaction) => {
        await tx.insert(dungeonHistories).values({
          cultivatorId: state.cultivatorId,
          theme: state.theme,
          result: {
            settlement: {
              reward_tier: '放弃',
              ending_narrative: '道友中途放弃了探索。',
            },
          },
          log:
            state.history
              .map(
                (h) => `[Round ${h.round}] ${h.scene} -> Choice: ${h.choice}`,
              )
              .join('\n') + '\n[ABANDONED]',
        });
        if (state.runId) {
          await tx
            .update(dungeonRuns)
            .set({
              status: 'FINISHED',
              runState: this.normalizeState(state),
              pendingAction: null,
              activeBattleId: null,
              battlePayload: null,
              endedAt: new Date(),
            })
            .where(eq(dungeonRuns.id, state.runId));
        }
      };

      if (options.deferPersistence) {
        return {
          success: true,
          persist,
          afterCommit: async () => {
            await redis.del(key);
          },
        };
      }

      await getExecutor().transaction(persist);
    }

    await redis.del(key);
    return { success: true };
  }
}

export const dungeonService = new DungeonService();

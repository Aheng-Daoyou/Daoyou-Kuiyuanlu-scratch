import { describe, expect, it, vi } from 'vitest';
import { AbilityFactory } from '@shared/engine/battle-v5/factories/AbilityFactory';
import { createCombatUnitFromCultivator } from '@shared/engine/battle-v5/adapters/CultivatorCombatAdapter';
import { getCultivatorDisplayAttributes } from '@shared/engine/battle-v5/adapters/CultivatorDisplayAdapter';
import { BASIC_SKILLS, BASIC_TECHNIQUES } from '@shared/engine/cultivator/creation/config';
import { CreationSession } from '@shared/engine/creation-v2/CreationSession';
import { CreationPhase } from '@shared/engine/creation-v2/core/types';
import type { SkillProductModel } from '@shared/engine/creation-v2/models/types';
import {
  deserializeAndRehydrate,
  serializeProductModel,
} from '@shared/engine/creation-v2/persistence/ProductPersistenceMapper';
import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { simulateBattleV5 } from '@shared/lib/battle/simulateBattleV5';
import { prepareStandardFullBattle } from '@shared/engine/battle-v5/setup/BattleStateStrategy';
import {
  getRealmStageAttributeBudget,
  getRealmStageNaturalAttributeValue,
} from '@shared/config/realmProgression';
import {
  ENEMY_CLAN_VALUES,
  QUALITY_ORDER,
  type EnemyClan,
  type Quality,
} from '@shared/types/constants';
import type { Cultivator } from '@shared/types/cultivator';
import {
  enemyGenerator,
  EnemyCraftExecutor,
  EnemyGenerator,
  EnemyLoadoutPlanner,
  NoopEnemyCopyProvider,
} from './enemyGenerator';
import {
  getEnemyCombatPolicy,
  validateEnemySkillRoles,
} from './enemy-generation/EnemyCombatPolicy';
import {
  resolveEnemyProductEnergyBudget,
  resolveEnemyProductQualityFloor,
} from './enemy-generation/utils';

function sumAttributes(attributes: Cultivator['attributes']): number {
  return Object.values(attributes).reduce((sum, value) => sum + value, 0);
}

function createPlayerFixture(): Cultivator {
  return {
    id: 'player-fixture',
    name: '韩立',
    title: null,
    gender: '男',
    realm: '守灯',
    realm_stage: '中期',
    age: 40,
    lifespan: 260,
    attributes: {
      vitality: 52,
      strength: 46,
      spirit: 58,
      endurance: 50,
      speed: 48,
      willpower: 44,
    },
    spiritual_roots: [{ element: '尸', strength: 82 }],
    pre_heaven_fates: [],
    cultivations: [BASIC_TECHNIQUES.尸()],
    skills: [...BASIC_SKILLS.尸],
    inventory: {
      artifacts: [],
      consumables: [],
      materials: [],
    },
    equipped: {
      weapon: null,
      armor: null,
      accessory: null,
    },
    spirit_stones: 0,
    background: '测试用玩家角色',
  };
}

function snapshotEnemy(draft: ReturnType<typeof enemyGenerator.buildDraft>): string {
  return JSON.stringify({
    balance: draft.balance,
    cultivator: {
      id: draft.cultivator.id,
      name: draft.cultivator.name,
      title: draft.cultivator.title,
      background: draft.cultivator.background,
      description: draft.cultivator.description,
      attributes: draft.cultivator.attributes,
      condition: draft.cultivator.condition,
      spiritual_roots: draft.cultivator.spiritual_roots,
      equipped: draft.cultivator.equipped,
      cultivations: draft.cultivator.cultivations.map((technique) => ({
        id: technique.id,
        name: technique.name,
        description: technique.description,
        quality: technique.quality,
        slug: technique.abilityConfig?.slug,
        tags: technique.abilityConfig?.tags,
      })),
      skills: draft.cultivator.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        quality: skill.quality,
        cost: skill.cost,
        cooldown: skill.cooldown,
        target_self: skill.target_self,
        slug: skill.abilityConfig?.slug,
        tags: skill.abilityConfig?.tags,
      })),
      artifacts: draft.cultivator.inventory.artifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        description: artifact.description,
        quality: artifact.quality,
        slot: artifact.slot,
        slug: artifact.abilityConfig?.slug,
        tags: artifact.abilityConfig?.tags,
        battleRuntimeMeta: artifact.battleRuntimeMeta,
      })),
    },
    copyFacts: draft.copyFacts,
  });
}

function assertV5Compatible(draft: ReturnType<typeof enemyGenerator.buildDraft>) {
  for (const technique of draft.cultivator.cultivations) {
    expect(technique.abilityConfig).toBeDefined();
    expect(() => AbilityFactory.create(technique.abilityConfig!)).not.toThrow();
    expectProductModelAffixes(technique.productModel, 'gongfa');
  }

  for (const skill of draft.cultivator.skills) {
    expect(skill.abilityConfig).toBeDefined();
    expect(() => AbilityFactory.create(skill.abilityConfig!)).not.toThrow();
    expectProductModelAffixes(skill.productModel, 'skill');
  }

  const artifactIds = new Set(
    draft.cultivator.inventory.artifacts.map((artifact) => artifact.id),
  );
  for (const artifact of draft.cultivator.inventory.artifacts) {
    expect(artifact.abilityConfig).toBeDefined();
    expect(() => AbilityFactory.create(artifact.abilityConfig!)).not.toThrow();
    expectProductModelAffixes(artifact.productModel, 'artifact');
    expect(artifact.battleRuntimeMeta?.anchorRealm).toBe(draft.cultivator.realm);
  }

  for (const slot of ['weapon', 'armor', 'accessory'] as const) {
    const equippedId = draft.cultivator.equipped[slot];
    if (!equippedId) continue;
    expect(artifactIds.has(equippedId)).toBe(true);
    expect(
      draft.cultivator.inventory.artifacts.find(
        (artifact) => artifact.id === equippedId,
      )?.slot,
    ).toBe(slot);
  }
}

function expectProductModelAffixes(
  productModel: unknown,
  productType: 'gongfa' | 'skill' | 'artifact',
) {
  expect(productModel).toBeDefined();
  expect(productModel).toMatchObject({ productType });
  expect(
    (productModel as { affixes?: unknown[] }).affixes?.length ?? 0,
  ).toBeGreaterThan(0);
}

function stripEnemyLoadout(cultivator: Cultivator): Cultivator {
  return {
    ...cultivator,
    cultivations: [],
    skills: [],
    inventory: {
      ...cultivator.inventory,
      artifacts: [],
    },
    equipped: {
      weapon: null,
      armor: null,
      accessory: null,
    },
  };
}

function skillFunctionTags(skill: Cultivator['skills'][number]): string[] {
  return skill.abilityConfig?.tags?.filter((tag) =>
    tag.startsWith(GameplayTags.ABILITY.FUNCTION.ROOT),
  ) ?? [];
}

function isPressureSkill(skill: Cultivator['skills'][number]): boolean {
  const abilityConfig = skill.abilityConfig;
  const tags = skillFunctionTags(skill);
  return Boolean(
    abilityConfig?.targetPolicy?.team === 'enemy' &&
      (tags.includes(GameplayTags.ABILITY.FUNCTION.DAMAGE) ||
        tags.includes(GameplayTags.ABILITY.FUNCTION.CONTROL)),
  );
}

function assertThreateningLoadout(
  draft: ReturnType<typeof enemyGenerator.buildDraft>,
) {
  const skills = draft.cultivator.skills;
  expect(skills.length).toBeGreaterThan(0);

  const skillCount = skills.length as 1 | 2 | 3 | 4;
  const policy = getEnemyCombatPolicy(draft.input.clan);
  const pressureCount = skills.filter(isPressureSkill).length;
  const selfTargetCount = skills.filter(
    (skill) => skill.abilityConfig?.targetPolicy?.team === 'self',
  ).length;
  const allFunctionTags = skills.flatMap(skillFunctionTags);

  expect(pressureCount).toBeGreaterThanOrEqual(
    policy.minPressureBySkillCount[skillCount],
  );
  expect(selfTargetCount).toBeLessThanOrEqual(
    policy.maxSelfTargetBySkillCount[skillCount],
  );
  expect(selfTargetCount).toBeLessThan(skills.length);
  expect(
    allFunctionTags.every((tag) => tag === GameplayTags.ABILITY.FUNCTION.HEAL),
  ).toBe(false);
  expect(
    allFunctionTags.every((tag) => tag === GameplayTags.ABILITY.FUNCTION.BUFF),
  ).toBe(false);

  if (skills.length === 1) {
    expect(isPressureSkill(skills[0]!)).toBe(true);
  }
  if (skills.length >= 3) {
    expect(pressureCount).toBeGreaterThanOrEqual(2);
  }
}

function expectLoadoutQualityAtLeast(
  draft: ReturnType<typeof enemyGenerator.buildDraft>,
  qualityFloor: Quality,
) {
  const qualities = [
    ...draft.cultivator.cultivations.map((technique) => technique.quality),
    ...draft.cultivator.skills.map((skill) => skill.quality),
    ...draft.cultivator.inventory.artifacts.map((artifact) => artifact.quality),
  ];

  expect(qualities.length).toBeGreaterThan(0);
  for (const quality of qualities) {
    expect(QUALITY_ORDER[quality]).toBeGreaterThanOrEqual(
      QUALITY_ORDER[qualityFloor],
    );
  }

  for (const product of draft.copyFacts.products) {
    expect(QUALITY_ORDER[product.quality]).toBeGreaterThanOrEqual(
      QUALITY_ORDER[qualityFloor],
    );
  }
}

describe('EnemyGenerator', () => {
  it.each([
    { difficulty: 0, factor: 0.6 },
    { difficulty: 25, factor: 0.8 },
    { difficulty: 50, factor: 1 },
    { difficulty: 70, factor: 1.2 },
    { difficulty: 85, factor: 1.5 },
    { difficulty: 100, factor: 2.0 },
  ])('maps difficulty $difficulty to factor $factor', ({ difficulty, factor }) => {
    const draft = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '中期',
      clan: '腌物',
      difficulty,
    });

    expect(draft.balance.difficultyFactor).toBeCloseTo(factor, 6);
    expect(draft.balance.totalAttributeBudget).toBe(
      Math.max(
        getRealmStageNaturalAttributeValue('守灯', '中期') * 6,
        Math.round(getRealmStageAttributeBudget('守灯', '中期') * factor),
      ),
    );
    expect(sumAttributes(draft.cultivator.attributes)).toBe(
      draft.balance.totalAttributeBudget,
    );
  });

  it.each([
    { difficulty: 60, expectedQuality: '地品' },
    { difficulty: 75, expectedQuality: '天品' },
    { difficulty: 85, expectedQuality: '仙品' },
    { difficulty: 95, expectedQuality: '神品' },
  ] as const)(
    'maps enemy difficulty $difficulty to product quality floor $expectedQuality',
    ({ difficulty, expectedQuality }) => {
      expect(
        resolveEnemyProductQualityFloor({
          difficulty,
          clan: '腌物',
          isBoss: false,
        }),
      ).toBe(expectedQuality);
    },
  );

  it('raises boss or relic clan product quality floor by one tier without stacking', () => {
    expect(
      resolveEnemyProductQualityFloor({
        difficulty: 75,
        clan: '腌物',
        isBoss: true,
      }),
    ).toBe('仙品');
    expect(
      resolveEnemyProductQualityFloor({
        difficulty: 75,
        clan: '遗种',
        isBoss: false,
      }),
    ).toBe('仙品');
    expect(
      resolveEnemyProductQualityFloor({
        difficulty: 75,
        clan: '遗种',
        isBoss: true,
      }),
    ).toBe('仙品');
    expect(
      resolveEnemyProductQualityFloor({
        difficulty: 95,
        clan: '遗种',
        isBoss: true,
      }),
    ).toBe('神品');
  });

  it('keeps high difficulty enemy product budgets above low quality ranges', () => {
    for (const productType of ['skill', 'gongfa', 'artifact'] as const) {
      expect(
        resolveEnemyProductEnergyBudget({
          difficulty: 80,
          clan: '腌物',
          isBoss: false,
          productType,
        }),
      ).toBeGreaterThanOrEqual(95);
      expect(
        resolveEnemyProductEnergyBudget({
          difficulty: 90,
          clan: '腌物',
          isBoss: false,
          productType,
        }),
      ).toBeGreaterThanOrEqual(130);
    }
  });

  it('generates deterministic body cultivation condition without timestamp churn', () => {
    const input = {
      realm: '窥渊' as const,
      realmStage: '后期' as const,
      clan: '遗种' as const,
      difficulty: 88,
      isBoss: true,
      variantSeed: 'body-deterministic',
    };

    const left = enemyGenerator.buildDraft(input);
    const right = enemyGenerator.buildDraft(input);

    expect(left.cultivator.condition).toEqual(right.cultivator.condition);
    expect(left.cultivator.condition?.timestamps).toEqual({});
    expect(left.cultivator.condition?.tracks.bodyCultivation).toMatchObject({
      realm: left.balance.bodyCultivation.realm,
      tracks: {
        skin: { level: left.balance.bodyCultivation.trackLevels.skin },
        sinew_bone: {
          level: left.balance.bodyCultivation.trackLevels.sinew_bone,
        },
        organs: { level: left.balance.bodyCultivation.trackLevels.organs },
        qi_blood: { level: left.balance.bodyCultivation.trackLevels.qi_blood },
        primordial_spirit: {
          level: left.balance.bodyCultivation.trackLevels.primordial_spirit,
        },
      },
    });
    expect(left.copyFacts.bodyCultivation).toEqual(left.balance.bodyCultivation);
  });

  it('scales enemy body cultivation total level by difficulty and boss status', () => {
    const totals = [
      { difficulty: 10, isBoss: false },
      { difficulty: 50, isBoss: false },
      { difficulty: 90, isBoss: false },
      { difficulty: 90, isBoss: true },
    ].map(
      (input) =>
        enemyGenerator.buildDraft({
          realm: '守灯',
          realmStage: '中期',
          clan: '腌物',
          ...input,
          variantSeed: `body-scale:${input.difficulty}:${input.isBoss}`,
        }).balance.bodyCultivation.totalLevel,
    );

    expect(totals[1]).toBeGreaterThan(totals[0]);
    expect(totals[2]).toBeGreaterThan(totals[1]);
    expect(totals[3]).toBeGreaterThan(totals[2]);
  });

  it('uses clan preferences for enemy body cultivation focus tracks', () => {
    const expectedTopTracks: Record<EnemyClan, string[]> = {
      腌物: ['sinew_bone', 'skin'],
      遗种: ['primordial_spirit', 'organs'],
      投影: ['primordial_spirit', 'organs'],
    };

    for (const clan of ENEMY_CLAN_VALUES) {
      const draft = enemyGenerator.buildDraft({
        realm: '蚀体',
        realmStage: '后期',
        clan,
        difficulty: 100,
        isBoss: true,
        variantSeed: `body-clan:${clan}`,
      });
      const trackLevels = draft.balance.bodyCultivation.trackLevels;
      const highestLevel = Math.max(...Object.values(trackLevels));
      const highestTracks = Object.entries(trackLevels)
        .filter(([, level]) => level === highestLevel)
        .map(([track]) => track);

      expect(
        highestTracks.some((track) => expectedTopTracks[clan].includes(track)),
      ).toBe(true);
    }
  });

  it('starts generated enemy condition resources at display max resources', () => {
    const draft = enemyGenerator.buildDraft({
      realm: '蚀体',
      realmStage: '后期',
      clan: '遗种',
      difficulty: 95,
      isBoss: true,
      variantSeed: 'body-resources',
    });
    const display = getCultivatorDisplayAttributes(draft.cultivator);

    expect(draft.cultivator.condition?.resources.hp.current).toBe(display.maxHp);
    expect(draft.cultivator.condition?.resources.mp.current).toBe(display.maxMp);
    expect(sumAttributes(draft.cultivator.attributes)).toBe(
      draft.balance.totalAttributeBudget,
    );
  });

  it('generates enemies across the three clans and mounts the sanity-burn passive', () => {
    for (const clan of ['腌物', '遗种', '投影'] as const) {
      const draft = enemyGenerator.buildDraft({
        realm: '窥渊',
        realmStage: '中期',
        clan,
        difficulty: 70,
        isBoss: false,
        variantSeed: `guixi-${clan}`,
      });
      expect(draft.cultivator.clan).toBe(clan);
      // 三族通过 copyFacts.clan 透传给 AI 叙事层（enemy-narrative 据以区分腌物/遗种/投影气质）。
      expect(draft.copyFacts.clan).toBe(clan);
      // 三族共享诡异原型：功法/技能/封灵器均以「浸染/低语/梦涎」等诡异气质命名。
      expect(draft.cultivator.cultivations.length).toBeGreaterThan(0);
      expect(draft.cultivator.skills.length).toBeGreaterThan(0);
      assertV5Compatible(draft);

      // 战斗单位生成后，诡异敌人额外挂载「梦涎蚀神」被动（烧神智）。
      const unit = createCombatUnitFromCultivator(draft.cultivator);
      expect(
        unit.abilities.getAbility('core.guixi.sanity-burn'),
      ).toBeDefined();
    }
  });

  it('does not mount the sanity-burn passive on a player without a clan', () => {
    // 玩家角色无 clan 字段，不应挂载「梦涎蚀神」被动；该被动仅由诡异三族敌人独占。
    const player = createPlayerFixture();
    const unit = createCombatUnitFromCultivator(player);
    expect(unit.abilities.getAbility('core.guixi.sanity-burn')).toBeUndefined();
  });

  it.each([
    {
      difficulty: 10,
      isBoss: false,
      expectedBand: 'core',
      expectedSkills: 1,
      expectedArtifacts: 0,
    },
    {
      difficulty: 50,
      isBoss: false,
      expectedBand: 'variant',
      expectedSkills: 2,
      expectedArtifacts: 1,
    },
    {
      difficulty: 70,
      isBoss: false,
      expectedBand: 'advanced',
      expectedSkills: 3,
      expectedArtifacts: 2,
    },
    {
      difficulty: 95,
      isBoss: false,
      expectedBand: 'legendary',
      expectedSkills: 4,
      expectedArtifacts: 3,
    },
    {
      difficulty: 8,
      isBoss: true,
      expectedBand: 'core',
      expectedSkills: 1,
      expectedArtifacts: 0,
    },
  ] as const)(
    'scales loadout for difficulty $difficulty boss=$isBoss',
    ({ difficulty, isBoss, expectedBand, expectedSkills, expectedArtifacts }) => {
      const draft = enemyGenerator.buildDraft({
        realm: '守灯',
        realmStage: '中期',
        clan: '腌物',
        difficulty,
        isBoss,
      });

      expect(draft.balance.band).toBe(expectedBand);
      expect(draft.cultivator.skills).toHaveLength(expectedSkills);
      expect(draft.cultivator.inventory.artifacts).toHaveLength(expectedArtifacts);
    },
  );

  it.each([
    { difficulty: 80, isBoss: false, clan: '腌物', expectedQuality: '天品' },
    { difficulty: 90, isBoss: false, clan: '腌物', expectedQuality: '仙品' },
    { difficulty: 95, isBoss: false, clan: '腌物', expectedQuality: '神品' },
    { difficulty: 85, isBoss: true, clan: '腌物', expectedQuality: '神品' },
    { difficulty: 85, isBoss: false, clan: '遗种', expectedQuality: '神品' },
  ] as const)(
    'generates $expectedQuality or better products for difficulty $difficulty clan=$clan boss=$isBoss',
    ({ difficulty, isBoss, clan, expectedQuality }) => {
      const draft = enemyGenerator.buildDraft({
        realm: '蚀体',
        realmStage: '中期',
        clan,
        difficulty,
        isBoss,
        variantSeed: 'quality-floor',
      });

      expectLoadoutQualityAtLeast(draft, expectedQuality);
      for (const product of draft.copyFacts.products) {
        expect(product.quality).toBe(expectedQuality);
      }
    },
  );

  it('redistributes attributes by clan profile while preserving total budget', () => {
    const expectations: Record<
      EnemyClan,
      {
        top: string | string[];
        second?: string | string[];
      }
    > = {
      腌物: { top: ['vitality', 'strength', 'endurance'], second: ['vitality', 'strength', 'endurance'] },
      遗种: { top: 'spirit', second: ['strength', 'willpower'] },
      投影: { top: ['spirit', 'willpower'], second: ['spirit', 'willpower'] },
    };

    for (const [clan, expected] of Object.entries(expectations) as Array<
      [EnemyClan, (typeof expectations)[EnemyClan]]
    >) {
      const draft = enemyGenerator.buildDraft({
        realm: '窥渊',
        realmStage: '中期',
        clan,
        difficulty: 50,
      });
      const ordered = Object.entries(draft.cultivator.attributes)
        .sort((left, right) => right[1] - left[1])
        .map(([key]) => key);

      expect(sumAttributes(draft.cultivator.attributes)).toBe(
        draft.balance.totalAttributeBudget,
      );
      const naturalAttributeValue = getRealmStageNaturalAttributeValue(
        draft.cultivator.realm,
        draft.cultivator.realm_stage,
      );
      expect(
        Object.values(draft.cultivator.attributes).every(
          (value) => value >= naturalAttributeValue,
        ),
      ).toBe(true);
      if (Array.isArray(expected.top)) {
        expect(expected.top).toContain(ordered[0]);
      } else {
        expect(ordered[0]).toBe(expected.top);
      }
      if (expected.second) {
        if (Array.isArray(expected.second)) {
          expect(expected.second).toContain(ordered[1]);
        } else {
          expect(ordered[1]).toBe(expected.second);
        }
      }
    }
  });

  it('builds deterministic stable snapshots for the same battle parameters', () => {
    const input = {
      realm: '窥渊' as const,
      realmStage: '中期' as const,
      clan: '投影' as const,
      difficulty: 73,
      isBoss: true,
    };

    const left = enemyGenerator.buildDraft(input);
    const right = enemyGenerator.buildDraft(input);

    expect(snapshotEnemy(left)).toBe(snapshotEnemy(right));
  });

  it('keeps same-clan variants from collapsing into one loadout signature', () => {
    const signatures = [18, 42, 68, 92].map((difficulty) => {
      const draft = enemyGenerator.buildDraft({
        realm: '蚀体',
        realmStage: '中期',
        clan: '腌物',
        difficulty,
      });
      return [
        draft.balance.primaryPersonaId,
        draft.balance.accentPersonaId ?? 'none',
        ...draft.cultivator.skills.map((skill) => skill.abilityConfig?.slug ?? skill.name),
        ...draft.cultivator.inventory.artifacts.map(
          (artifact) => artifact.abilityConfig?.slug ?? artifact.name,
        ),
      ].join('|');
    });

    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it('keeps all clan x band x boss combinations battle-ready', () => {
    const combinations = (
      [
        { difficulty: 10, isBoss: false },
        { difficulty: 40, isBoss: false },
        { difficulty: 70, isBoss: false },
        { difficulty: 95, isBoss: false },
        { difficulty: 95, isBoss: true },
      ] as const
    ).flatMap((config) =>
      ENEMY_CLAN_VALUES.map((clan) => ({
        ...config,
        clan,
      })),
    );

    for (const combo of combinations) {
      const draft = enemyGenerator.buildDraft({
        realm: combo.isBoss ? '蚀体' : '窥渊',
        realmStage: combo.isBoss ? '后期' : '中期',
        clan: combo.clan,
        difficulty: combo.difficulty,
        isBoss: combo.isBoss,
      });
      assertV5Compatible(draft);
    }
  });

  it('plans clan-specific skill roles before crafting products', () => {
    for (const clan of ENEMY_CLAN_VALUES) {
      for (const difficulty of [10, 40, 70, 95] as const) {
        const draft = enemyGenerator.buildDraft({
          realm: '窥渊',
          realmStage: '中期',
          clan,
          difficulty,
        });
        const skillRoles = draft.copyFacts.products
          .filter((product) => product.productType === 'skill')
          .map((product) => product.role);
        const expectedRoles = getEnemyCombatPolicy(clan).roleOrderBySkillCount[
          skillRoles.length as 1 | 2 | 3 | 4
        ];

        expect(skillRoles[0]).toBe(expectedRoles[0]);
        expect(validateEnemySkillRoles(getEnemyCombatPolicy(clan), skillRoles)).toBe(
          true,
        );
      }
    }
  });

  it('keeps all clan x band x boss skill loadouts threatening', () => {
    const combinations = (
      [
        { difficulty: 10, isBoss: false },
        { difficulty: 40, isBoss: false },
        { difficulty: 70, isBoss: false },
        { difficulty: 95, isBoss: false },
        { difficulty: 95, isBoss: true },
      ] as const
    ).flatMap((config) =>
      ENEMY_CLAN_VALUES.map((clan) => ({
        ...config,
        clan,
      })),
    );

    for (const combo of combinations) {
      const draft = enemyGenerator.buildDraft({
        realm: combo.isBoss ? '蚀体' : '窥渊',
        realmStage: combo.isBoss ? '后期' : '中期',
        clan: combo.clan,
        difficulty: combo.difficulty,
        isBoss: combo.isBoss,
      });

      assertThreateningLoadout(draft);
    }
  });

  it('keeps enemy skill mp cost generated from pacing rules across difficulty bands', () => {
    for (const difficulty of [0, 25, 50, 70, 85, 95, 100] as const) {
      for (const isBoss of [false, true]) {
        for (const clan of ENEMY_CLAN_VALUES) {
          const draft = enemyGenerator.buildDraft({
            realm: '守灯',
            realmStage: '中期',
            clan,
            difficulty,
            isBoss,
            variantSeed: 'quality-pacing',
          });
          const pressureSkills = draft.cultivator.skills.filter(isPressureSkill);

          expect(pressureSkills.length).toBeGreaterThanOrEqual(1);

          for (const skill of draft.cultivator.skills) {
            const mpCost = skill.abilityConfig?.mpCost ?? skill.cost ?? 0;
            expect(mpCost).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('can be materialized into combat units and run V5 battle smoke tests', () => {
    const player = createPlayerFixture();
    const normalEnemy = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '后期',
      clan: '腌物',
      difficulty: 65,
    }).cultivator;
    const bossEnemy = enemyGenerator.buildDraft({
      realm: '窥渊',
      realmStage: '后期',
      clan: '遗种',
      difficulty: 95,
      isBoss: true,
    }).cultivator;

    expect(() => createCombatUnitFromCultivator(normalEnemy)).not.toThrow();
    expect(() => createCombatUnitFromCultivator(bossEnemy)).not.toThrow();

    const normalResult = simulateBattleV5(
      prepareStandardFullBattle({ player, opponent: normalEnemy }),
    );
    const bossResult = simulateBattleV5(
      prepareStandardFullBattle({ player, opponent: bossEnemy }),
    );
    expect(normalResult.outcome.winner).toBeDefined();
    expect(normalResult.sequences.length).toBeGreaterThan(0);
    expect(bossResult.outcome.winner).toBeDefined();
    expect(bossResult.sequences.length).toBeGreaterThan(0);
  });

  it('keeps early and mid difficulty enemies within baseline combat pressure', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const player = createPlayerFixture();

    const lowEnemy = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '中期',
      clan: '腌物',
      difficulty: 25,
    }).cultivator;
    const midEnemy = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '中期',
      clan: '腌物',
      difficulty: 50,
    }).cultivator;
    const eliteEnemy = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '中期',
      clan: '腌物',
      difficulty: 70,
    }).cultivator;
    const nakedLowEnemy = stripEnemyLoadout(lowEnemy);

    const playerPanel = getCultivatorDisplayAttributes(player).attrs;
    const nakedLowPanel = getCultivatorDisplayAttributes(nakedLowEnemy).attrs;
    const playerPrimaryOutput = Math.max(playerPanel.atk, playerPanel.magicAtk);
    const nakedLowPrimaryDefense = Math.max(
      nakedLowPanel.def,
      nakedLowPanel.magicDef,
    );

    expect(nakedLowPrimaryDefense).toBeLessThan(playerPrimaryOutput);
    expect(
      simulateBattleV5(
        prepareStandardFullBattle({ player, opponent: lowEnemy }),
      ).outcome.winner.id,
    ).toBe(player.id);
    expect(
      simulateBattleV5(
        prepareStandardFullBattle({ player, opponent: midEnemy }),
      ).outcome.turns,
    ).toBeGreaterThan(3);
    expect(
      simulateBattleV5(
        prepareStandardFullBattle({ player, opponent: eliteEnemy }),
      ).outcome.turns,
    ).toBeGreaterThan(1);
  });

  it('returns the same draft when shared uses the noop copy provider', async () => {
    const generator = new EnemyGenerator({
      copyProvider: new NoopEnemyCopyProvider(),
    });
    const draft = generator.buildDraft({
      realm: '守灯',
      realmStage: '中期',
      clan: '投影',
      difficulty: 55,
    });

    const enriched = await generator.enrichNarrative(draft);

    expect(enriched).toBe(draft);
  });

  it('builds a deterministic fallback title when no narrative override exists', () => {
    const draft = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '后期',
      clan: '投影',
      difficulty: 62,
    });

    expect(draft.cultivator.title).toBeTruthy();
    expect(draft.copyFacts.character.fallbackTitle).toBe(draft.cultivator.title);
  });

  it('only fills missing character narrative fields and rewrites product copy in one shot', async () => {
    const draft = enemyGenerator.buildDraft({
      realm: '窥渊',
      realmStage: '中期',
      clan: '投影',
      name: '手填名字',
      title: '手填名号',
      background: '手填背景',
    });
    const enrich = vi.fn().mockResolvedValue({
      character: {
        name: '不应覆盖',
        title: '不应覆盖',
        background: '不应覆盖',
        description: '梦潮翻卷间，敌影似真似幻。',
      },
      products: draft.copyFacts.products.map((product, index) => ({
        id: product.id,
        name: `润色产物${index + 1}`,
        description: `润色描述${index + 1}`,
      })),
    });
    const generator = new EnemyGenerator({
      copyProvider: { enrich },
    });

    const enriched = await generator.enrichNarrative(draft);

    expect(enrich).toHaveBeenCalledTimes(1);
    expect(enriched.cultivator.name).toBe('手填名字');
    expect(enriched.cultivator.title).toBe('手填名号');
    expect(enriched.cultivator.background).toBe('手填背景');
    expect(enriched.cultivator.description).toBe('梦潮翻卷间，敌影似真似幻。');
    expect(enriched.cultivator.cultivations[0]?.name).toBe('润色产物1');
    expect(enriched.cultivator.cultivations[0]?.abilityConfig?.name).toBe('润色产物1');
    expect(enriched.cultivator.skills[0]?.name).toBe('润色产物2');
    expect(enriched.cultivator.skills[0]?.abilityConfig?.name).toBe('润色产物2');
    expect(enriched.cultivator.inventory.artifacts[0]?.name).toContain('润色产物');
  });

  it('rolls back the whole enrichment when product id sets do not match', async () => {
    const draft = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '后期',
      clan: '投影',
      difficulty: 62,
    });
    const enrich = vi.fn().mockResolvedValue({
      character: {
        name: '夜潮灵使',
        title: '镇潮灵卫',
        background: '其本体为潮汐灵物，久困古阵而化形。',
        description: '梦潮翻卷间，敌影似真似幻。',
      },
      products: [
        {
          id: 'wrong-id',
          name: '错误产物',
          description: '错误描述',
        },
      ],
    });
    const generator = new EnemyGenerator({
      copyProvider: { enrich },
    });

    const enriched = await generator.enrichNarrative(draft);

    expect(enriched).toBe(draft);
  });

  it('falls back to tier 3 safe recipes when intent crafting keeps failing', () => {
    const loadoutPlanner = new EnemyLoadoutPlanner();
    const executor = new EnemyCraftExecutor({
      craftFromIntent(input) {
        const session = new CreationSession({
          productType: input.productType,
          materials: [],
          slugSeed: input.slugSeed,
        });
        session.state.failureReason = 'forced failure';
        session.setPhase(CreationPhase.FAILED);
        return session;
      },
    });
    const input = {
      realm: '窥渊' as const,
      realmStage: '后期' as const,
      clan: '遗种' as const,
      difficulty: 95,
      isBoss: true,
    };
    const loadout = executor.execute({
      input: {
        ...input,
        name: undefined,
        background: undefined,
        description: undefined,
      },
      plan: loadoutPlanner.plan({
        ...input,
        name: undefined,
        background: undefined,
        description: undefined,
      }),
    });

    expect(loadout.recoveryTierUsed).toBe(3);
    expect(loadout.technique.item.quality).toBe('神品');
    expect(() => AbilityFactory.create(loadout.technique.item.abilityConfig!)).not.toThrow();
    for (const skill of loadout.skills) {
      expect(skill.item.quality).toBe('神品');
      expect(() => AbilityFactory.create(skill.item.abilityConfig!)).not.toThrow();
    }
    for (const artifact of loadout.artifacts) {
      expect(artifact.item.quality).toBe('神品');
      expect(() => AbilityFactory.create(artifact.item.abilityConfig!)).not.toThrow();
    }

    const fallbackSkills = loadout.skills.map(
      (skill) => skill.item as Cultivator['skills'][number],
    );
    const policy = getEnemyCombatPolicy(input.clan);
    const skillCount = fallbackSkills.length as 1 | 2 | 3 | 4;
    const pressureCount = fallbackSkills.filter(isPressureSkill).length;
    const selfTargetCount = fallbackSkills.filter(
      (skill) => skill.abilityConfig?.targetPolicy?.team === 'self',
    ).length;

    expect(pressureCount).toBeGreaterThanOrEqual(
      policy.minPressureBySkillCount[skillCount],
    );
    expect(selfTargetCount).toBeLessThanOrEqual(
      policy.maxSelfTargetBySkillCount[skillCount],
    );
    expect(
      fallbackSkills
        .filter(isPressureSkill)
        .every((skill) => (skill.abilityConfig?.mpCost ?? skill.cost ?? 0) === 80),
    ).toBe(false);

    for (const skill of fallbackSkills) {
      const model = skill.productModel as SkillProductModel | undefined;
      expect(model?.productType).toBe('skill');
      const rehydrated = deserializeAndRehydrate(
        serializeProductModel(model!),
      ) as SkillProductModel;
      expect(rehydrated.battleProjection.mpCost).toBe(
        model!.battleProjection.mpCost,
      );
      expect(rehydrated.battleProjection.cooldown).toBe(
        model!.battleProjection.cooldown,
      );
    }
  });

  it('keeps low-floor ghost drafts threatening even when safety fallback is needed', () => {
    const draft = enemyGenerator.buildDraft({
      realm: '守灯',
      realmStage: '初期',
      clan: '投影',
      difficulty: 1,
    });

    expect(draft.balance.recoveryTierUsed).toBe(3);
    assertThreateningLoadout(draft);
  });
});

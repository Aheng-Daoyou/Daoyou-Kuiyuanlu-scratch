import { QUALITY_ORDER, type ElementType, type Quality } from '@shared/types/constants';
import type {
  AlchemyOutputLot,
  FormulaFitBand,
  PillSpec,
} from '@shared/types/consumable';

/**
 * 香变（坏香）失败机制。
 *
 * 世界观（《窥渊录》）核心设定：制香失败不炸炉——出一炉「坏香」：
 * 不可名状的异物，可能自己走掉、可能混入库存伪装成好香。
 *
 * 引擎层面，坏香是一枚不可用的 PillSpec（operations 为空，isBadIncense 标记），
 * 由 AI 现场生成名字与描述（诡异异物气质）。它不会提供任何有效香效，
 * 落入库存后只能被识别、处置或作为素材。
 */

/** 香变触发的冲突分阈值：药路冲突过高即视为「香变」而非「勉强成香」。 */
export const BAD_INCENSE_CONFLICT_THRESHOLD = 0.65;

/** 香变触发的香力散逸阈值：essenceLossRatio 高于此值视为香变。 */
export const BAD_INCENSE_LOSS_RATIO_THRESHOLD = 0.9;

/**
 * 判断一炉制香是否发生「香变」。
 *
 * 触发条件（满足任一）：
 * 1. 产出为空（rollAlchemyYieldProfile 返回 lots 为空，香力不足以凝香）。
 * 2. 香力散逸比过高（essenceLossRatio >= 0.9，香力几乎全散，香灰异动）。
 * 3. fitBand 为 poor（药路冲突显著，香变概率陡增）。
 * 4. 药路冲突分过高（conflictScore >= 0.65）。
 */
export function shouldTriggerBadIncense(args: {
  /** 产出 lot 是否为空（commit 阶段由真实 roll 结果传入）。 */
  lotsEmpty?: boolean;
  /** 香力散逸比（commit 阶段由真实 roll 结果传入）。 */
  essenceLossRatio?: number;
  fitBand?: FormulaFitBand;
  conflictScore?: number;
}): boolean {
  const { lotsEmpty, essenceLossRatio, fitBand, conflictScore } = args;

  if (lotsEmpty === true) {
    return true;
  }

  if (
    typeof essenceLossRatio === 'number' &&
    essenceLossRatio >= BAD_INCENSE_LOSS_RATIO_THRESHOLD
  ) {
    return true;
  }

  if (fitBand === 'poor') {
    return true;
  }

  if (
    typeof conflictScore === 'number' &&
    conflictScore >= BAD_INCENSE_CONFLICT_THRESHOLD
  ) {
    return true;
  }

  return false;
}

/** 坏香失败品的品阶：取材料最高品阶，但至少为「凡品」。 */
export function resolveBadIncenseQuality(
  materialRanks: Quality[],
): Quality {
  if (materialRanks.length === 0) {
    return '凡品';
  }
  return materialRanks.reduce((highest, rank) =>
    QUALITY_ORDER[rank] > QUALITY_ORDER[highest] ? rank : highest,
  );
}

/** 构造一枚坏香失败品的 spec（无有效香效，仅作诡异异物落库）。 */
export function buildBadIncenseSpec(args: {
  family: PillSpec['family'];
  sourceMaterials: string[];
  dominantElement?: ElementType;
  stability: number;
  toxicityRating: number;
  source: 'improvised' | 'formula';
  formulaId?: string;
  fitBand?: FormulaFitBand;
  fitScore?: number;
  fitMultiplier?: number;
  tags: string[];
}): Omit<PillSpec, 'operations'> {
  const base = {
    kind: 'pill' as const,
    family: args.family,
    consumeRules: {
      scene: 'out_of_battle_only' as const,
      quotaCategory: 'none' as const,
    },
  };

  if (args.source === 'formula' && args.formulaId) {
    return {
      ...base,
      alchemyMeta: {
        source: 'formula' as const,
        formulaId: args.formulaId,
        sourceMaterials: args.sourceMaterials,
        analysisVersion: 2,
        fitScore: args.fitScore ?? 0,
        fitBand: args.fitBand ?? 'poor',
        fitMultiplier: args.fitMultiplier ?? 0.5,
        dominantElement: args.dominantElement,
        stability: args.stability,
        toxicityRating: args.toxicityRating,
        appearance: 'low' as const,
        tags: args.tags,
        version: 4,
        isBadIncense: true,
      },
    };
  }

  return {
    ...base,
    alchemyMeta: {
      source: 'improvised' as const,
      sourceMaterials: args.sourceMaterials,
      analysisVersion: 2,
      dominantElement: args.dominantElement,
      stability: args.stability,
      toxicityRating: args.toxicityRating,
      appearance: 'low' as const,
      tags: args.tags,
      version: 4,
      isBadIncense: true,
    },
  };
}

/**
 * 构造一枚坏香的 Consumable 输出（单枚，数量 1，无有效效果）。
 * 名字与描述由调用方（AI 叙事层）在落库前覆盖为诡异异物气质。
 */
export function buildBadIncenseLot(
  quality: Quality,
): AlchemyOutputLot {
  return {
    quality,
    appearance: 'low',
    quantity: 1,
    essenceSpent: 0,
    effectMultiplier: 0,
  };
}

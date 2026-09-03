import { QUALITY_ORDER, type Quality, type RealmType } from '@shared/types/constants';

export const REALM_PILL_USAGE_LIMITS: Record<RealmType, number> = {
  闻腥: 6,
  守灯: 8,
  窥渊: 10,
  蚀体: 12,
  忘川: 14,
  执灯: 16,
  掌灯: 18,
  近神: 20,
  渡渊: 24,
};

export const CULTIVATION_PILL_USAGE_LIMITS: Record<RealmType, number> = {
  闻腥: 10,
  守灯: 20,
  窥渊: 30,
  蚀体: 40,
  忘川: 50,
  执灯: 60,
  掌灯: 70,
  近神: 80,
  渡渊: 90,
};

export const CULTIVATION_PILL_MAX_QUALITY_BY_REALM: Record<RealmType, Quality> = {
  闻腥: '玄品',
  守灯: '真品',
  窥渊: '地品',
  蚀体: '天品',
  忘川: '神品',
  执灯: '神品',
  掌灯: '神品',
  近神: '神品',
  渡渊: '神品',
};

export const CULTIVATION_PILL_MIN_QUALITY_BY_REALM: Record<RealmType, Quality> = {
  闻腥: '凡品',
  守灯: '凡品',
  窥渊: '灵品',
  蚀体: '玄品',
  忘川: '玄品',
  执灯: '玄品',
  掌灯: '玄品',
  近神: '玄品',
  渡渊: '玄品',
};

export function getMinimumPillQualityByRealm(realm: RealmType): Quality {
  return CULTIVATION_PILL_MIN_QUALITY_BY_REALM[realm] ?? '凡品';
}

export function getConsumableQualityScalar(quality: Quality | undefined): number {
  return 1 + (QUALITY_ORDER[quality ?? '凡品'] ?? 0) * 0.22;
}

export const PILL_TOXICITY_CAP = 1000;

export const CONSUMABLE_TOXICITY_DEFAULTS = {
  healing: 4,
  mana: 3,
  cultivation: 9,
  insight: 5,
  breakthrough: 12,
  permanent_attribute: 10,
  marrow_wash: 14,
  detox: -8,
  poison_control: -5,
} as const;

export const LIFESPAN_PILL_GAIN_RANGE_BY_QUALITY: Record<
  Quality,
  { min: number; max: number }
> = {
  凡品: { min: 6, max: 10 },
  灵品: { min: 12, max: 20 },
  玄品: { min: 24, max: 36 },
  真品: { min: 40, max: 60 },
  地品: { min: 70, max: 95 },
  天品: { min: 105, max: 135 },
  仙品: { min: 145, max: 175 },
  神品: { min: 180, max: 200 },
};

export function rollLifespanPillGain(
  quality: Quality,
  rng: () => number = Math.random,
): number {
  const range = LIFESPAN_PILL_GAIN_RANGE_BY_QUALITY[quality];
  const roll = Math.max(0, Math.min(0.999999, rng()));
  return range.min + Math.floor(roll * (range.max - range.min + 1));
}

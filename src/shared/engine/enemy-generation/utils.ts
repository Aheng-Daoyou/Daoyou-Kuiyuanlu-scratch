import { ELEMENT_NAME_PREFIX } from '@shared/engine/creation-v2/config/CreationMappings';
import { CREATION_RESERVED_ENERGY } from '@shared/engine/creation-v2/config/CreationBalance';
import { getMinimumEffectiveEnergyForProjectionQuality } from '@shared/engine/creation-v2/analysis/ProjectionQualityProfile';
import {
  QUALITY_ORDER,
  QUALITY_VALUES,
  type ElementType,
  type EnemyClan,
  type Quality,
  type RealmStage,
  type RealmType,
} from '@shared/types/constants';
import {
  ATTRIBUTE_KEYS,
  type DifficultyBand,
  type EnemyProductRole,
} from './types';

export function hashText(input: string): number {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function pickBySeed<T>(pool: readonly T[], seed: string): T {
  return pool[hashText(seed) % pool.length];
}

export function rotateBySeed<T>(
  pool: readonly T[],
  seed: string,
  count: number,
): T[] {
  if (pool.length === 0 || count <= 0) return [];
  const offset = hashText(seed) % pool.length;
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  return rotated.slice(0, Math.min(count, rotated.length));
}

export function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const DIFFICULTY_FACTOR_CURVE = [
  { difficulty: 0, factor: 0.6 },
  { difficulty: 25, factor: 0.8 },
  { difficulty: 50, factor: 1 },
  { difficulty: 70, factor: 1.2 },
  { difficulty: 85, factor: 1.5 },
  { difficulty: 100, factor: 2.0 },
] as const;

export function buildDifficultyFactor(difficulty: number): number {
  const normalized = Math.max(0, Math.min(100, difficulty));
  for (let index = 1; index < DIFFICULTY_FACTOR_CURVE.length; index += 1) {
    const previous = DIFFICULTY_FACTOR_CURVE[index - 1];
    const current = DIFFICULTY_FACTOR_CURVE[index];
    if (normalized <= current.difficulty) {
      const range = current.difficulty - previous.difficulty;
      const progress = range > 0 ? (normalized - previous.difficulty) / range : 0;
      return previous.factor + (current.factor - previous.factor) * progress;
    }
  }

  return DIFFICULTY_FACTOR_CURVE[DIFFICULTY_FACTOR_CURVE.length - 1].factor;
}

export function difficultyToBand(difficulty: number): DifficultyBand {
  if (difficulty >= 85) return 'legendary';
  if (difficulty >= 60) return 'advanced';
  if (difficulty >= 25) return 'variant';
  return 'core';
}

export function sumAttributeWeights(
  weights: Record<(typeof ATTRIBUTE_KEYS)[number], number>,
): number {
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

export function buildClanFallbackName(
  clan: EnemyClan,
  realm: RealmType,
  realmStage: RealmStage,
  element: ElementType,
): string {
  const suffixByClan: Record<EnemyClan, string> = {
    腌物: '腌物',
    遗种: '遗种',
    投影: '投影',
  };

  return `${ELEMENT_NAME_PREFIX[element]}${realm}${realmStage}${suffixByClan[clan]}`;
}

export function buildTitleFallback(
  clan: EnemyClan,
  realm: RealmType,
  realmStage: RealmStage,
  primaryElement: ElementType,
): string {
  const suffixByClan: Record<EnemyClan, string> = {
    腌物: '执念者',
    遗种: '守则者',
    投影: '倒影',
  };

  return `${ELEMENT_NAME_PREFIX[primaryElement]}${realm}${realmStage}${suffixByClan[clan]}`;
}

export function buildBackgroundFallback(
  clan: EnemyClan,
  realm: RealmType,
  realmStage: RealmStage,
  primaryElement: ElementType,
  profileTags: string[],
): string {
  return `一名${clan}出身的${realm}${realmStage}诡异，以${primaryElement}行灯息为核心，战斗风格偏向${profileTags.join('、')}。`;
}

export function buildDescriptionFallback(
  clan: EnemyClan,
  realm: RealmType,
  realmStage: RealmStage,
  primaryElement: ElementType,
): string {
  return `一名${realm}${realmStage}的${clan}，周身缠绕着${primaryElement}行气息。`;
}

export function buildVariantKey(input: {
  clan: EnemyClan;
  realm: RealmType;
  realmStage: RealmStage;
  difficulty: number;
  isBoss: boolean;
  variantSeed?: string;
}): string {
  return [
    input.clan,
    input.realm,
    input.realmStage,
    String(input.difficulty),
    input.isBoss ? 'boss' : 'normal',
    input.variantSeed,
  ].filter(Boolean).join(':');
}

export function buildStableProductId(
  variantKey: string,
  productType: 'gongfa' | 'skill' | 'artifact',
  role: EnemyProductRole,
  index: number,
  slot?: 'weapon' | 'armor' | 'accessory',
): string {
  if (productType === 'artifact') {
    return `enemy:${variantKey}:artifact:${slot ?? role}:${index}`;
  }
  return `enemy:${variantKey}:${productType}:${role}:${index}`;
}

export function buildStableSlugSeed(
  variantKey: string,
  productType: 'gongfa' | 'skill' | 'artifact',
  role: EnemyProductRole,
  index: number,
): string {
  return `${variantKey}:${productType}:${role}:${index}`;
}

export function resolveEnergyBudget(
  difficulty: number,
  productType: 'skill' | 'gongfa' | 'artifact',
  bias: number = 0,
  isBoss: boolean = false,
): number {
  const isSkill = productType === 'skill';
  const base = isSkill ? 16 : 12;
  const scale = isSkill ? 0.32 : 0.26;
  const bossBonus = isBoss ? (isSkill ? 6 : 5) : 0;

  const minByType = CREATION_RESERVED_ENERGY[productType] + 10;

  return Math.max(
    minByType,
    Math.round(base + difficulty * scale + bias + bossBonus),
  );
}

export function resolveEnemyProductQualityFloor(input: {
  difficulty: number;
  clan: EnemyClan;
  isBoss: boolean;
}): Quality {
  const difficulty = Math.max(0, Math.min(100, Math.round(input.difficulty)));
  const baseQuality =
    difficulty >= 95
      ? '神品'
      : difficulty >= 85
        ? '仙品'
        : difficulty >= 75
          ? '天品'
          : difficulty >= 60
            ? '地品'
            : difficulty >= 40
              ? '真品'
              : difficulty >= 20
                ? '玄品'
                : '灵品';

  if (!input.isBoss && input.clan !== '遗种') {
    return baseQuality;
  }

  const nextOrder = Math.min(
    QUALITY_VALUES.length - 1,
    QUALITY_ORDER[baseQuality] + 1,
  );
  return QUALITY_VALUES[nextOrder] ?? '神品';
}

export function resolveEnemyProductEnergyBudget(input: {
  difficulty: number;
  clan: EnemyClan;
  isBoss: boolean;
  productType: 'skill' | 'gongfa' | 'artifact';
  bias?: number;
}): number {
  const qualityFloor = resolveEnemyProductQualityFloor(input);
  const linearBudget = resolveEnergyBudget(
    input.difficulty,
    input.productType,
    input.bias ?? 0,
    input.isBoss,
  );
  return Math.max(
    linearBudget,
    getMinimumEffectiveEnergyForProjectionQuality(qualityFloor) + 5,
  );
}

export function resolveUnlockScore(
  difficulty: number,
  bias: number = 0,
  isBoss: boolean = false,
): number {
  return Math.max(
    0,
    Math.round(8 + difficulty * 0.55 + bias + (isBoss ? 10 : 0)),
  );
}

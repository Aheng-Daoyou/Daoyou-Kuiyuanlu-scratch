/**
 * 副本奖励系统配置
 * 定义奖励评级、物品池、品质加成等常量
 */

import type { MaterialType, Quality } from '@shared/types/constants';

/**
 * 奖励评级配置
 * 根据副本表现评级（S/A/B/C/D）决定奖励数量和品质
 */
export const REWARD_TIER_CONFIG = {
  S: {
    consumableCount: { min: 3, max: 5 },
    artifactCount: { min: 2, max: 3 },
    qualityBonus: 2, // 品质加成等级
    spiritStoneMultiplier: 2.0, // 灯油券倍率
  },
  A: {
    consumableCount: { min: 2, max: 4 },
    artifactCount: { min: 1, max: 2 },
    qualityBonus: 1,
    spiritStoneMultiplier: 1.5,
  },
  B: {
    consumableCount: { min: 1, max: 3 },
    artifactCount: { min: 0, max: 1 },
    qualityBonus: 0,
    spiritStoneMultiplier: 1.0,
  },
  C: {
    consumableCount: { min: 1, max: 2 },
    artifactCount: { min: 0, max: 1 },
    qualityBonus: -1,
    spiritStoneMultiplier: 0.7,
  },
  D: {
    consumableCount: { min: 0, max: 1 },
    artifactCount: { min: 0, max: 0 },
    qualityBonus: -2,
    spiritStoneMultiplier: 0.5,
  },
} as const;

/**
 * 消耗品池配置
 * 按境界分类的消耗品模板，用于生成随机奖励
 * 注意：type字段统一为'香品'以符合schema定义，baseEffect存储效果类型
 */
export const CONSUMABLE_POOLS = {
  闻腥期: [
    {
      name: '回春香',
      type: '香品' as const,
      description: '恢复50点生命值的基础香品',
      baseEffect: { type: 'healing', hp: 50 },
      basePrice: 10,
    },
    {
      name: '聚蕴香',
      type: '香品' as const,
      description: '恢复30点灯焰的基础香品',
      baseEffect: { type: 'mana', mp: 30 },
      basePrice: 8,
    },
    {
      name: '辟谷香',
      type: '香品' as const,
      description: '可替代三日食物的香品',
      baseEffect: { type: 'sustenance', satiety: 72 },
      basePrice: 5,
    },
    {
      name: '解毒香',
      type: '香品' as const,
      description: '解除轻度毒素',
      baseEffect: { type: 'detox', removeToxin: 'minor' },
      basePrice: 12,
    },
  ],
  守灯期: [
    {
      name: '大回春香',
      type: '香品' as const,
      description: '恢复150点生命值的中级香品',
      baseEffect: { type: 'healing', hp: 150 },
      basePrice: 30,
    },
    {
      name: '大聚蕴香',
      type: '香品' as const,
      description: '恢复100点灯焰的中级香品',
      baseEffect: { type: 'mana', mp: 100 },
      basePrice: 25,
    },
    {
      name: '凝神香',
      type: '香品' as const,
      description: '提升10%灯律威力，持续1小时',
      baseEffect: { type: 'focus', spellPowerBonus: 0.1, duration: 3600 },
      basePrice: 40,
    },
    {
      name: '金刚香',
      type: '香品' as const,
      description: '提升20点防御，持续1小时',
      baseEffect: { type: 'defense', defenseBonus: 20, duration: 3600 },
      basePrice: 35,
    },
  ],
  窥渊期: [
    {
      name: '极品回春香',
      type: '香品' as const,
      description: '恢复500点生命值的高级香品',
      baseEffect: { type: 'healing', hp: 500 },
      basePrice: 100,
    },
    {
      name: '极品聚蕴香',
      type: '香品' as const,
      description: '恢复300点灯焰的高级香品',
      baseEffect: { type: 'mana', mp: 300 },
      basePrice: 80,
    },
    {
      name: '破境香',
      type: '香品' as const,
      description: '增加5%突破几率的珍贵香品',
      baseEffect: { type: 'breakthrough', breakthroughChance: 0.05 },
      basePrice: 500,
    },
    {
      name: '天罡护体香',
      type: '香品' as const,
      description: '免疫一次致命伤害',
      baseEffect: { type: 'protection', deathProtection: 1 },
      basePrice: 300,
    },
  ],
  蚀体期: [
    {
      name: '仙品回春香',
      type: '香品' as const,
      description: '恢复2000点生命值的顶级香品',
      baseEffect: { type: 'healing', hp: 2000 },
      basePrice: 500,
    },
    {
      name: '仙品聚蕴香',
      type: '香品' as const,
      description: '恢复1000点灯焰的顶级香品',
      baseEffect: { type: 'mana', mp: 1000 },
      basePrice: 400,
    },
    {
      name: '涅槃重生香',
      type: '香品' as const,
      description: '死亡时自动复活并恢复50%生命',
      baseEffect: { type: 'rebirth', autoRevive: true, reviveHpPercent: 0.5 },
      basePrice: 2000,
    },
  ],
  忘川期: [
    {
      name: '九转还魂香',
      type: '香品' as const,
      description: '瞬间恢复全部生命值',
      baseEffect: { type: 'healing', hpPercent: 1.0 },
      basePrice: 5000,
    },
    {
      name: '天地灵香',
      type: '香品' as const,
      description: '瞬间恢复全部灯焰',
      baseEffect: { type: 'mana', mpPercent: 1.0 },
      basePrice: 4000,
    },
    {
      name: '忘川至宝香',
      type: '香品' as const,
      description: '全属性提升20%，持续24小时',
      baseEffect: {
        type: 'transcendence',
        allStatsBonus: 0.2,
        duration: 86400,
      },
      basePrice: 10000,
    },
  ],
} as const;

/**
 * 品质属性加成配置
 * 使用constants.ts中定义的Quality类型（凡品/灵品/玄品/真品/地品/天品/仙品/神品）
 */
export const QUALITY_ATTRIBUTE_BONUS: Record<
  Quality,
  { multiplier: number; priceMultiplier: number; color: string }
> = {
  凡品: {
    multiplier: 1.0,
    priceMultiplier: 1.0,
    color: 'white',
  },
  灵品: {
    multiplier: 1.3,
    priceMultiplier: 1.5,
    color: 'green',
  },
  玄品: {
    multiplier: 1.6,
    priceMultiplier: 2.5,
    color: 'blue',
  },
  真品: {
    multiplier: 2.0,
    priceMultiplier: 4.0,
    color: 'purple',
  },
  地品: {
    multiplier: 2.5,
    priceMultiplier: 6.0,
    color: 'orange',
  },
  天品: {
    multiplier: 3.2,
    priceMultiplier: 10.0,
    color: 'red',
  },
  仙品: {
    multiplier: 4.0,
    priceMultiplier: 20.0,
    color: 'gold',
  },
  神品: {
    multiplier: 5.0,
    priceMultiplier: 50.0,
    color: 'rainbow',
  },
} as const;

/**
 * 境界对应的灯油券基础奖励
 */
export const REALM_SPIRIT_STONE_BASE = {
  闻腥期: { min: 10, max: 30 },
  守灯期: { min: 50, max: 100 },
  窥渊期: { min: 200, max: 400 },
  蚀体期: { min: 1000, max: 2000 },
  忘川期: { min: 5000, max: 10000 },
} as const;

/**
 * 封灵器类型定义（对齐schema.ts中artifacts表的slot字段）
 */
export const ARTIFACT_TYPES = [
  'weapon', // 武器
  'armor', // 防具
  'accessory', // 饰品
] as const;

/**
 * 材料池配置（对齐schema.ts中materials表）
 * 按境界分类的材料模板
 */
export const MATERIAL_POOLS = {
  闻腥期: [
    {
      name: '青灯草',
      type: 'herb' as MaterialType,
      rank: '凡品' as Quality,
      element: '尸',
      description: '最基础的灯草，用于炼制低阶香品',
      basePrice: 5,
    },
    {
      name: '赤铜矿',
      type: 'ore' as MaterialType,
      rank: '凡品' as Quality,
      element: '烛',
      description: '封灵的基础矿石',
      basePrice: 8,
    },
    {
      name: '诡异皮',
      type: 'monster' as MaterialType,
      rank: '凡品' as Quality,
      element: null,
      description: '低阶诡异的皮毛，用于制作护甲',
      basePrice: 10,
    },
  ],
  守灯期: [
    {
      name: '紫雾芝',
      type: 'herb' as MaterialType,
      rank: '灵品' as Quality,
      element: '尸',
      description: '中阶灯药，香力醇厚',
      basePrice: 30,
    },
    {
      name: '寒铁精',
      type: 'ore' as MaterialType,
      rank: '灵品' as Quality,
      element: '星',
      description: '含有寒气的灵铁，封灵佳材',
      basePrice: 50,
    },
    {
      name: '诡核碎片',
      type: 'monster' as MaterialType,
      rank: '灵品' as Quality,
      element: null,
      description: '守灯期诡异的诡核碎片',
      basePrice: 80,
    },
  ],
  窥渊期: [
    {
      name: '千年雪莲',
      type: 'herb' as MaterialType,
      rank: '玄品' as Quality,
      element: '星',
      description: '千年灯药，香力强劲',
      basePrice: 200,
    },
    {
      name: '玄铁精华',
      type: 'ore' as MaterialType,
      rank: '玄品' as Quality,
      element: '烛',
      description: '稀有的封灵材料',
      basePrice: 300,
    },
    {
      name: '完整诡核',
      type: 'monster' as MaterialType,
      rank: '玄品' as Quality,
      element: null,
      description: '窥渊期诡异的完整诡核',
      basePrice: 500,
    },
  ],
  蚀体期: [
    {
      name: '七彩灵芝',
      type: 'herb' as MaterialType,
      rank: '真品' as Quality,
      element: null,
      description: '天地灯药，万年难遇',
      basePrice: 1000,
    },
    {
      name: '星辰精铁',
      type: 'ore' as MaterialType,
      rank: '真品' as Quality,
      element: '烛',
      description: '天外陨铁，炼制封灵器的顶级材料',
      basePrice: 1500,
    },
    {
      name: '蚀体本源',
      type: 'monster' as MaterialType,
      rank: '真品' as Quality,
      element: null,
      description: '蚀体期诡异的蚀体本源',
      basePrice: 2000,
    },
  ],
  忘川期: [
    {
      name: '混沌窍',
      type: 'herb' as MaterialType,
      rank: '地品' as Quality,
      element: null,
      description: '天地初开时诞生的窍',
      basePrice: 5000,
    },
    {
      name: '道纹神金',
      type: 'ore' as MaterialType,
      rank: '地品' as Quality,
      element: null,
      description: '蕴含灯道法则的神金',
      basePrice: 8000,
    },
    {
      name: '忘川真髓',
      type: 'monster' as MaterialType,
      rank: '地品' as Quality,
      element: null,
      description: '忘川期诡异的真髓精华',
      basePrice: 10000,
    },
  ],
} as const;

/**
 * 类型导出
 */
export type RewardTier = keyof typeof REWARD_TIER_CONFIG;
export type RealmType = keyof typeof CONSUMABLE_POOLS;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

/**
 * 辅助函数：根据评级和境界获取奖励配置
 */
export function getRewardConfig(tier: RewardTier, realm: RealmType) {
  return {
    tierConfig: REWARD_TIER_CONFIG[tier],
    consumablePool: CONSUMABLE_POOLS[realm],
    spiritStoneBase: REALM_SPIRIT_STONE_BASE[realm],
  };
}

/**
 * 辅助函数：计算品质加成后的属性值
 */
export function applyQualityBonus(
  baseEffect: Record<string, number>,
  quality: Quality,
): Record<string, number> {
  const multiplier = QUALITY_ATTRIBUTE_BONUS[quality].multiplier;
  const result: Record<string, number> = {};

  for (const key in baseEffect) {
    if (typeof baseEffect[key] === 'number') {
      result[key] = Math.floor(baseEffect[key] * multiplier);
    }
  }

  return result;
}

/**
 * 辅助函数：随机选择材料
 */
export function randomMaterial(realm: RealmType, count: number) {
  const pool = MATERIAL_POOLS[realm];
  const result = [];

  for (let i = 0; i < count; i++) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    result.push(item);
  }

  return result;
}

/**
 * 辅助函数：随机选择消耗品
 */
export function randomConsumable(realm: RealmType, count: number) {
  const pool = CONSUMABLE_POOLS[realm];
  const result = [];

  for (let i = 0; i < count; i++) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    result.push(item);
  }

  return result;
}

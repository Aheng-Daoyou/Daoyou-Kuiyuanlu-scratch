// 统一的常量与派生类型定义

// 元素（窥渊录八窍：原版金木水火土风雷冰八元素等基数替换，保留窍共鸣增伤机制）
export const ELEMENT_VALUES = [
  '烛',
  '尸',
  '星',
  '渊',
  '梦',
  '噬',
  '帘',
  '疫',
] as const;
export type ElementType = (typeof ELEMENT_VALUES)[number];

// 技能类型
export const SKILL_TYPE_VALUES = [
  'attack',
  'heal',
  'control',
  'debuff',
  'buff',
] as const;
export type SkillType = (typeof SKILL_TYPE_VALUES)[number];

// 状态效果
export const STATUS_EFFECT_VALUES = [
  // 战斗状态 - Buff
  'armor_up',
  'speed_up',
  'crit_rate_up',
  // 战斗状态 - Debuff
  'armor_down',
  'crit_rate_down',
  // 战斗状态 - Control
  'stun',
  'silence',
  'root',
  // 战斗状态 - DOT
  'burn',
  'bleed',
  'poison',
  // 持久状态
  'weakness',
  'minor_wound',
  'major_wound',
  'near_death',
  'breakthrough_focus',
  'protect_meridians',
  'clear_mind',
  'cultivation_boost',
  'artifact_damaged',
  'mana_depleted',
  'hp_deficit',
  // 环境状态
  'scorching',
  'freezing',
  'toxic_air',
  'formation_suppressed',
  'abundant_qi',
] as const;
export type StatusEffect = (typeof STATUS_EFFECT_VALUES)[number];

// 装备槽位
export const EQUIPMENT_SLOT_VALUES = ['weapon', 'armor', 'accessory'] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOT_VALUES)[number];

// 消耗品类型
export const CONSUMABLE_TYPE_VALUES = ['香品', '符箓', '灵果'] as const;
export type ConsumableType = (typeof CONSUMABLE_TYPE_VALUES)[number];

// 性别
export const GENDER_VALUES = ['男', '女'] as const;
export type GenderType = (typeof GENDER_VALUES)[number];

// 敌人三族（窥渊录唯一敌人分类：按来源划分的诡异，决定叙事特质与属性倾向）
//  - 腌物：被梦涎腌坏的凡人与尸体，保留生前执念；最常见野怪，执念即弱点。
//  - 遗种：泡影之夜幸存的旧纪元残留物；自带规则特性，中型 BOSS。
//  - 投影：天翁梦中渗出的「影子」，外边之物在天内的倒影；不可杀，只能封印/驱逐/交易。
export const ENEMY_CLAN_VALUES = ['腌物', '遗种', '投影'] as const;
export type EnemyClan = (typeof ENEMY_CLAN_VALUES)[number];

// 诡异档案四档（掌灯司分级，对应诡异等级，纯叙事映射到境界区间）
//  - 丁（野腌）：闻腥~守灯
//  - 丙（成形腌物）：窥渊~蚀体
//  - 乙（遗种）：忘川~执灯
//  - 甲（注视投影）：近神~渡渊
export const ENEMY_ARCHIVE_TIER_VALUES = ['丁', '丙', '乙', '甲'] as const;
export type EnemyArchiveTier = (typeof ENEMY_ARCHIVE_TIER_VALUES)[number];

// 境界（窥渊录九境：原版闻腥~渡渊一一对应改名，不改数值）
export const REALM_VALUES = [
  '闻腥',
  '守灯',
  '窥渊',
  '蚀体',
  '忘川',
  '执灯',
  '掌灯',
  '近神',
  '渡渊',
] as const;
export type RealmType = (typeof REALM_VALUES)[number];

// 境界阶段
export const REALM_STAGE_VALUES = ['初期', '中期', '后期', '圆满'] as const;
export type RealmStage = (typeof REALM_STAGE_VALUES)[number];

// 命格吉凶
export const FATE_TYPE_VALUES = ['吉', '凶'] as const;
export type FateType = (typeof FATE_TYPE_VALUES)[number];

// 窍品阶
export const SPIRITUAL_ROOT_GRADE_VALUES = [
  '天窍',
  '真窍',
  '伪窍',
  '变异窍',
] as const;
export type SpiritualRootGrade = (typeof SPIRITUAL_ROOT_GRADE_VALUES)[number];

// 技能/功法品阶
export const SKILL_GRADE_VALUES = [
  '天阶上品',
  '天阶中品',
  '天阶下品',
  '地阶上品',
  '地阶中品',
  '地阶下品',
  '玄阶上品',
  '玄阶中品',
  '玄阶下品',
  '黄阶上品',
  '黄阶中品',
  '黄阶下品',
] as const;
export type SkillGrade = (typeof SKILL_GRADE_VALUES)[number];

// 先天气运品质
export const QUALITY_VALUES = [
  '凡品',
  '灵品',
  '玄品',
  '真品',
  '地品',
  '天品',
  '仙品',
  '神品',
] as const;
export type Quality = (typeof QUALITY_VALUES)[number];

// 品质等级映射（用于缩放计算）
export const QUALITY_ORDER: Record<Quality, number> = {
  凡品: 0,
  灵品: 1,
  玄品: 2,
  真品: 3,
  地品: 4,
  天品: 5,
  仙品: 6,
  神品: 7,
};

// 境界等级映射（用于缩放计算）
export const REALM_ORDER: Record<RealmType, number> = {
  闻腥: 0,
  守灯: 1,
  窥渊: 2,
  蚀体: 3,
  忘川: 4,
  执灯: 5,
  掌灯: 6,
  近神: 7,
  渡渊: 8,
};

// ===== 神智轴（窥渊录核心张力：力量↑则理智↓）=====

// 神智永久上限随境界递减——修为每上一个台阶，神智上限就低一分。
// 闻腥（初入门，未遭污染）神智最足；越接近渡渊，越接近「非人」。
export const REALM_SANITY_MAX: Record<RealmType, number> = {
  闻腥: 100,
  守灯: 95,
  窥渊: 90,
  蚀体: 85,
  忘川: 80,
  执灯: 75,
  掌灯: 70,
  近神: 65,
  渡渊: 60,
};

// 材料类型
export const MATERIAL_TYPE_VALUES = [
  'seed',
  'herb',
  'ore',
  'monster',
  'tcdb',
  'aux',
  'gongfa_manual',
  'skill_manual',
] as const;
export type MaterialType = (typeof MATERIAL_TYPE_VALUES)[number];

// ===== 灯油券产出相关 =====

// 境界历练收益基数（每小时）
export const REALM_YIELD_RATES: Record<RealmType, number> = {
  闻腥: 100,
  守灯: 200,
  窥渊: 400,
  蚀体: 800,
  忘川: 1600,
  执灯: 3200,
  掌灯: 4800,
  近神: 6400,
  渡渊: 12800,
};

// 排行榜每周结算奖励（声望）
export const RANKING_REWARDS = {
  1: 100,
  '2-10': 50,
  '11-50': 25,
  '51-100': 15,
};

import type { RealmType } from '@shared/types/constants';
import { REALM_SANITY_MAX } from '@shared/types/constants';
import { StackRule } from '../buffs/Buff';
import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { AttributeType, BuffType, ModifierType, AbilityType } from './types';
import type {
  AbilityConfig,
  BuffConfig,
  CombatResourceDefinition,
  ListenerConfig,
} from './configs';

/**
 * 神智轴（窥渊录核心张力：力量永远比理智涨得快）。
 *
 * 神智 = 心灯油量，是「做人」的底线。诡异类敌人主要燃烧它；修为突破会永久
 * 压低它的上限。
 *
 * 两条状态线（数据驱动，均监听 CombatResourceChangeEvent）：
 *  - 灯晃（神智 < 30%）：命中率、闪避率各 -15%。
 *  - 入魔（神智 = 0）：攻击暴涨 +30%，但防御 -20%（战力暴涨、不复做人）。
 *
 * 设计铁律：「引擎管对错，AI 管味道」。神智的增减一律走 CombatResource
 * 的确定性结算，AI 只负责写「说漏嘴」的恐怖文案，不做判定。
 */

/** 神智战斗资源 id（全局唯一，玩家与敌人通用）。 */
export const SANITY_RESOURCE_ID = 'core.sanity';

/** 神智资源显示名。 */
export const SANITY_RESOURCE_NAME = '神智';

/** 神智资源点阵图标（心灯）。 */
export const SANITY_RESOURCE_ICON = '🕯️';

/** 灯晃阈值（神智跌破上限的 30% 时触发）。 */
export const SANITY_WAVER_THRESHOLD = 0.3;

/**
 * 根据境界取得神智永久上限。
 * 未命中映射（理论上不会发生）时回退到 100。
 */
export function getSanityMaxByRealm(realm: RealmType): number {
  return REALM_SANITY_MAX[realm] ?? 100;
}

/**
 * 组装某境界的神智战斗资源定义。
 * initial 与 max 一致（开战满神智），衰减/护盾暂停等高级机制暂不启用。
 */
export function buildSanityResource(realm: RealmType): CombatResourceDefinition {
  const max = getSanityMaxByRealm(realm);
  return {
    id: SANITY_RESOURCE_ID,
    name: SANITY_RESOURCE_NAME,
    icon: SANITY_RESOURCE_ICON,
    initial: max,
    max,
  };
}

// ===== 灯晃 / 入魔 状态（数据驱动，监听神智资源变化）=====

/** 灯晃 debuff id。 */
export const SANITY_WAVER_BUFF_ID = 'core.sanity.waver';

/** 入魔状态 id。 */
export const SANITY_MADDENED_BUFF_ID = 'core.sanity.maddened';

/**
 * 判断某战斗单位是否处于「入魔」状态（神智归零、敌我不分）。
 * 入魔为终态 debuff，AI 选敌系统据此改写敌我边界。
 */
export function isMaddened(unit: { buffs: { getAllBuffIds(): string[] } }): boolean {
  return unit.buffs.getAllBuffIds().includes(SANITY_MADDENED_BUFF_ID);
}

/** 通用神智被动能力 slug（玩家与敌人通用挂载）。 */
export const SANITY_STATE_ABILITY_SLUG = 'core.sanity.state';

/**
 * 诡异烧神智被动能力 slug（仅诡异类敌人挂载）。
 *
 * 诡异每次造成伤害（DamageSegmentAppliedEvent）后，附带烧掉目标「当前神智」
 * 的固定比例——诡异主烧神智、人形主烧气血，是「诡斗」与「人斗」的数值分野。
 * 比例扣减天然防暴走：越接近灯灭，每次扣得越少。
 */
export const GUIXI_SANITY_BURN_ABILITY_SLUG = 'core.guixi.sanity-burn';

/** 诡异每次伤害烧掉目标当前神智的比例。 */
export const GUIXI_SANITY_BURN_RATIO = 0.06;

// ===== 呼真名（克苏鲁核心处置动作）=====

/** 真名受缚 debuff id（呼真名命中后施加）。 */
export const TRUENAME_SUPPRESS_BUFF_ID = 'core.sanity.truename-bound';

/** 呼真名主动能力 slug（所有战斗单位通用挂载）。 */
export const INVOKE_TRUENAME_ABILITY_SLUG = 'core.action.invoke-truename';

/** 呼真名灼烧目标当前神智的比例。 */
export const TRUENAME_SANITY_BURN_RATIO = 0.15;

/**
 * 真名受缚：被呼真名命中后，攻防被真名压制（攻击 -25%、防御 -15%）。
 * 克苏鲁世界观——「名字是力量的锚点」，被念出真名的存在会短暂失去部分力量。
 */
export function buildTruenameSuppressBuff(): BuffConfig {
  return {
    id: TRUENAME_SUPPRESS_BUFF_ID,
    name: '真名受缚',
    description: '被念出真名：攻击 -25%，防御 -15%。',
    type: BuffType.DEBUFF,
    duration: 2,
    stackRule: StackRule.REFRESH_DURATION,
    dispelPolicy: 'normal',
    tags: [TRUENAME_SUPPRESS_BUFF_ID],
    modifiers: [
      { attrType: AttributeType.ATK, type: ModifierType.ADD, value: -0.25 },
      { attrType: AttributeType.MAGIC_ATK, type: ModifierType.ADD, value: -0.25 },
      { attrType: AttributeType.DEF, type: ModifierType.ADD, value: -0.15 },
    ],
    removeOnDeath: true,
  };
}

/**
 * 呼真名处置动作：念出敌方的真名，灼烧其当前神智并使其真名受缚。
 *  - 命中判定走标准命中（hitPolicy 默认 normal）。
 *  - 效果：灼烧目标当前神智 15%（比例扣减，防暴走）+ 施加「真名受缚」2 回合。
 *  - 消耗 120 法力，冷却 3 回合。
 */
export function buildInvokeTruenameAbility(): AbilityConfig {
  return {
    slug: INVOKE_TRUENAME_ABILITY_SLUG,
    name: '呼真名',
    description: '念出敌方真名：灼烧其当前神智 15%，并使其真名受缚（攻击 -25%、防御 -15%）。',
    type: AbilityType.ACTIVE_SKILL,
    tags: [
      GameplayTags.ABILITY.FUNCTION.DEBUFF,
      GameplayTags.ABILITY.KIND.SKILL,
    ],
    mpCost: 120,
    cooldown: 3,
    targetPolicy: { team: 'enemy', scope: 'single' },
    effects: [
      {
        type: 'combat_resource_modify',
        params: {
          resourceId: SANITY_RESOURCE_ID,
          operation: 'subtract',
          ratioOfCurrent: TRUENAME_SANITY_BURN_RATIO,
          target: 'target',
          reason: 'spend',
        },
      },
      {
        type: 'apply_buff',
        params: { buffConfig: buildTruenameSuppressBuff(), target: 'target' },
      },
    ],
  };
}

/**
 * 灯晃：神智跌破 30% 后，命中率、闪避率各 -15%（心灯摇曳、手抖目眩）。
 * 永久 debuff，随神智恢复到阈值以上时移除（由被动监听反向判定）。
 */
export function buildWaverBuff(): BuffConfig {
  return {
    id: SANITY_WAVER_BUFF_ID,
    name: '灯晃',
    description: '心灯摇曳：命中率、闪避率各降低 15%。',
    type: BuffType.DEBUFF,
    duration: -1,
    stackRule: StackRule.REFRESH_DURATION,
    dispelPolicy: 'normal',
    tags: [SANITY_WAVER_BUFF_ID],
    modifiers: [
      { attrType: AttributeType.ACCURACY, type: ModifierType.ADD, value: -0.15 },
      { attrType: AttributeType.EVASION_RATE, type: ModifierType.ADD, value: -0.15 },
    ],
    removeOnDeath: true,
  };
}

/**
 * 入魔：神智归零后，攻击暴涨 +30%，但防御 -20%（不复做人、敌我不分）。
 * 终态不可驱散（心灯熄灭、不可重燃），仅随战斗结束/死亡而消解。
 * 「不分敌我」由 AI 选敌系统读取本 buff 改写敌我边界（见 isMaddened）。
 */
export function buildMaddenedBuff(): BuffConfig {
  return {
    id: SANITY_MADDENED_BUFF_ID,
    name: '入魔',
    description: '心灯熄灭：攻击 +30%，防御 -20%，敌我不分。',
    type: BuffType.DEBUFF,
    duration: -1,
    stackRule: StackRule.REFRESH_DURATION,
    dispelPolicy: 'protected',
    tags: [SANITY_MADDENED_BUFF_ID],
    modifiers: [
      { attrType: AttributeType.ATK, type: ModifierType.ADD, value: 0.3 },
      { attrType: AttributeType.MAGIC_ATK, type: ModifierType.ADD, value: 0.3 },
      { attrType: AttributeType.DEF, type: ModifierType.ADD, value: -0.2 },
    ],
    removeOnDeath: true,
  };
}

/**
 * 神智状态机被动能力配置：订阅 CombatResourceChangeEvent，
 * 依据神智当前值在「常态 / 灯晃 / 入魔」三态间切换。
 *
 * 三条监听：
 *  1. 入魔监听——神智归零（combat_resource_below < 1）时施加「入魔」。
 *  2. 灯晃监听——神智跌破 30% 且未归零时施加「灯晃」。
 *  3. 恢复监听——神智回到阈值以上时移除「灯晃」/「入魔」。
 */
export function buildSanityStateAbility(): AbilityConfig {
  return {
    slug: SANITY_STATE_ABILITY_SLUG,
    name: '神智状态',
    description: '心灯油量决定神智三态：常态、灯晃（<30%）、入魔（=0）。',
    type: AbilityType.PASSIVE_SKILL,
    tags: [
      GameplayTags.ABILITY.FUNCTION.DEBUFF,
      GameplayTags.ABILITY.KIND.PASSIVE,
    ],
    listeners: [
      maddenedListener(),
      waverListener(),
      sanityRestoreListener(),
    ],
  };
}

/** 入魔监听：神智归零时施加「入魔」（终态）。 */
function maddenedListener(): ListenerConfig {
  return {
    id: 'core.sanity.maddened',
    eventType: 'CombatResourceChangeEvent',
    scope: 'owner_as_target',
    priority: 50,
    mapping: { caster: 'owner', target: 'owner' },
    conditions: [
      {
        type: 'combat_resource_below',
        params: { resourceId: SANITY_RESOURCE_ID, value: 1, scope: 'target' },
      },
    ],
    effects: [
      {
        type: 'apply_buff',
        params: { buffConfig: buildMaddenedBuff(), target: 'target' },
      },
    ],
  };
}

/** 灯晃监听：神智跌破 30% 但未归零时施加「灯晃」。 */
function waverListener(): ListenerConfig {
  return {
    id: 'core.sanity.waver',
    eventType: 'CombatResourceChangeEvent',
    scope: 'owner_as_target',
    priority: 50,
    mapping: { caster: 'owner', target: 'owner' },
    conditions: [
      {
        type: 'combat_resource_ratio_below',
        params: {
          resourceId: SANITY_RESOURCE_ID,
          value: SANITY_WAVER_THRESHOLD,
          scope: 'target',
        },
      },
      {
        type: 'combat_resource_at_least',
        params: { resourceId: SANITY_RESOURCE_ID, value: 1, scope: 'target' },
      },
    ],
    effects: [
      {
        type: 'apply_buff',
        params: { buffConfig: buildWaverBuff(), target: 'target' },
      },
    ],
  };
}

/** 恢复监听：神智回到 30% 以上时移除「灯晃」（入魔为终态，不可驱散）。 */
function sanityRestoreListener(): ListenerConfig {
  return {
    id: 'core.sanity.restore',
    eventType: 'CombatResourceChangeEvent',
    scope: 'owner_as_target',
    priority: 50,
    mapping: { caster: 'owner', target: 'owner' },
    conditions: [
      {
        type: 'combat_resource_ratio_at_least',
        params: {
          resourceId: SANITY_RESOURCE_ID,
          value: SANITY_WAVER_THRESHOLD,
          scope: 'target',
        },
      },
    ],
    effects: [
      {
        type: 'dispel',
        params: { targetTag: SANITY_WAVER_BUFF_ID, recipient: 'target' },
      },
    ],
  };
}

// ===== 诡异烧神智（数据驱动被动：诡异伤害附带烧目标神智）=====

/**
 * 诡异烧神智被动能力。
 *
 * 监听 DamageSegmentAppliedEvent（诡异作为 caster 造成伤害后），对目标的神智
 * 资源做「比例扣减」。扣减走 CombatResourceModifyEffect 的 ratioOfCurrent 语义，
 * 触发 CombatResourceChangeEvent → 联动灯晃/入魔状态机。
 *
 * 设计要点：
 *  - scope 用 owner_as_caster：只有「诡异自己」造成伤害时才烧，不吃队友/反射的伤害。
 *  - 比例扣减（默认 6% 当前值）：修为越高上限越低，但每次烧的是当前值比例，
 *    越接近灯灭扣得越慢，天然防「一次伤害直接入魔」的暴走。
 *  - 目标必须有神智资源才会被扣；对无神智单位（理论上不存在）静默跳过。
 */
export function buildGuixiSanityBurnAbility(): AbilityConfig {
  return {
    slug: GUIXI_SANITY_BURN_ABILITY_SLUG,
    name: '梦涎蚀神',
    description: '诡异每次造成伤害，附带灼烧目标当前神智的 6%。',
    type: AbilityType.PASSIVE_SKILL,
    tags: [
      GameplayTags.ABILITY.FUNCTION.DEBUFF,
      GameplayTags.ABILITY.KIND.PASSIVE,
    ],
    listeners: [guixiSanityBurnListener()],
  };
}

/** 诡异烧神智监听：诡异（owner）造成伤害后，按比例烧目标神智。 */
function guixiSanityBurnListener(): ListenerConfig {
  return {
    id: 'core.guixi.sanity-burn',
    eventType: 'DamageSegmentAppliedEvent',
    scope: 'owner_as_caster',
    priority: 40,
    mapping: { caster: 'owner', target: 'event.target' },
    conditions: [
      // 仅当目标持有神智资源时才触发（避免对无神智单位空扣）。
      {
        type: 'has_tag_on',
        params: { tag: GameplayTags.UNIT.TYPE.COMBATANT, scope: 'target' },
      },
    ],
    effects: [
      {
        type: 'combat_resource_modify',
        params: {
          resourceId: SANITY_RESOURCE_ID,
          operation: 'subtract',
          ratioOfCurrent: GUIXI_SANITY_BURN_RATIO,
          target: 'target',
          reason: 'spend',
        },
      },
    ],
  };
}

// ===== 心灯将熄（克苏鲁恐怖感增强：灯油见底时心灯摇曳，框架 28.6）=====

/** 心灯将熄 debuff id。 */
export const LAMPFLICKER_BUFF_ID = 'core.sanity.lampflicker';

/** 心灯将熄状态机被动 slug（玩家与敌人通用挂载）。 */
export const LAMPFLICKER_STATE_ABILITY_SLUG = 'core.sanity.lampflicker-state';

/** 心灯将熄触发阈值：灯油（MP）低于上限的此比例时进入「灯将熄」。 */
export const LAMPFLICKER_MP_THRESHOLD = 0.1;

/** 心灯将熄每回合烧掉当前神智的比例（与诡异烧神智同语义：比例扣减防暴走）。 */
export const LAMPFLICKER_SANITY_DRAIN_RATIO = 0.03;

/** 心灯将熄对防御的衰减比例。 */
export const LAMPFLICKER_DEF_PENALTY = 0.1;

/**
 * 心灯将熄：灯油将尽时心灯摇曳。
 *
 * 克苏鲁恐怖感增强（框架 28.6）：原版灯油耗尽只是「不能行动」。
 * 窥渊录里这一刻不再是「没力气」，而是「心灯将熄」——
 *  - 防御萎靡：物理/法术防御各 -10%。
 *  - 神智检定恶化：每回合烧掉当前神智的 3%（呼应「入魔风险抬升」）。
 *  - 与「灯晃/入魔」叠加：神智被进一步压低，可能直接掉进出魔阈值。
 *
 * 状态机被动（`LAMPFLICKER_STATE_ABILITY_SLUG`）会在灯油跌穿 10% 时施加本 buff，
 * 灯油回到 10% 以上时移除。
 */
export function buildLampFlickerBuff(): BuffConfig {
  return {
    id: LAMPFLICKER_BUFF_ID,
    name: '心灯将熄',
    description:
      '灯油将尽：物理/灯律防御各 -10%，每回合再被心灯摇曳烧去 3% 神智。',
    type: BuffType.DEBUFF,
    duration: -1,
    stackRule: StackRule.REFRESH_DURATION,
    dispelPolicy: 'normal',
    tags: [LAMPFLICKER_BUFF_ID],
    modifiers: [
      { attrType: AttributeType.DEF, type: ModifierType.ADD, value: -LAMPFLICKER_DEF_PENALTY },
      { attrType: AttributeType.MAGIC_DEF, type: ModifierType.ADD, value: -LAMPFLICKER_DEF_PENALTY },
    ],
    removeOnDeath: true,
  };
}

/**
 * 心灯将熄状态机被动：在每回合开始时按灯油比例决定施加/移除 buff。
 *  - 灯油 < 10%：施加「心灯将熄」；
 *  - 灯油 ≥ 10%：移除「心灯将熄」。
 */
export function buildLampFlickerStateAbility(): AbilityConfig {
  return {
    slug: LAMPFLICKER_STATE_ABILITY_SLUG,
    name: '心灯状态',
    description: '灯油 < 10% 时心灯摇曳（每回合烧神智 + 防御衰减）。',
    type: AbilityType.PASSIVE_SKILL,
    tags: [
      GameplayTags.ABILITY.FUNCTION.DEBUFF,
      GameplayTags.ABILITY.KIND.PASSIVE,
    ],
    listeners: [lampFlickerApplyListener(), lampFlickerRemoveListener(), lampFlickerDrainListener()],
  };
}

/** 每回合开始时：灯油 < 阈值 → 施加「心灯将熄」。 */
function lampFlickerApplyListener(): ListenerConfig {
  return {
    id: 'core.sanity.lampflicker-apply',
    eventType: 'RoundStartEvent',
    scope: 'global',
    priority: 50,
    mapping: { caster: 'owner', target: 'owner' },
    conditions: [
      {
        type: 'mp_below',
        params: { value: LAMPFLICKER_MP_THRESHOLD },
      },
    ],
    effects: [
      {
        type: 'apply_buff',
        params: { buffConfig: buildLampFlickerBuff(), target: 'target' },
      },
    ],
  };
}

/** 每回合开始时：灯油 ≥ 阈值 → 移除「心灯将熄」。 */
function lampFlickerRemoveListener(): ListenerConfig {
  return {
    id: 'core.sanity.lampflicker-remove',
    eventType: 'RoundStartEvent',
    scope: 'global',
    priority: 51,
    mapping: { caster: 'owner', target: 'owner' },
    conditions: [
      {
        type: 'mp_above',
        params: { value: LAMPFLICKER_MP_THRESHOLD - 0.0001 },
      },
    ],
    effects: [
      {
        type: 'dispel',
        params: { targetTag: LAMPFLICKER_BUFF_ID, recipient: 'target' },
      },
    ],
  };
}

/** 每回合开始时：心灯将熄 buff 存在 → 烧神智。 */
function lampFlickerDrainListener(): ListenerConfig {
  return {
    id: 'core.sanity.lampflicker-drain',
    eventType: 'RoundStartEvent',
    scope: 'global',
    priority: 55,
    mapping: { caster: 'owner', target: 'owner' },
    conditions: [
      {
        type: 'buff_layer_at_least',
        params: { id: LAMPFLICKER_BUFF_ID, value: 1 },
      },
    ],
    effects: [
      {
        type: 'combat_resource_modify',
        params: {
          resourceId: SANITY_RESOURCE_ID,
          operation: 'subtract',
          ratioOfCurrent: LAMPFLICKER_SANITY_DRAIN_RATIO,
          target: 'target',
          reason: 'spend',
        },
      },
    ],
  };
}

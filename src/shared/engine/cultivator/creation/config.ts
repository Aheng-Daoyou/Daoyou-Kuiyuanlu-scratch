/**
 * 角色创建用基础功法 / 神通配置（v2 迁移版）
 *
 * 旧的 EffectConfig 体系已下线，这里使用 v5 的 AttributeModifierConfig（功法被动属性）
 * 与 AbilityConfig（神通主动效果）进行最小可运行的初始化。
 *
 * 待 Phase 6 接入完整的 v2 造物流后，会用 CreationOrchestrator 动态产出，
 * 不再依赖此静态配置。
 */

import type {
  AbilityConfig,
  AttributeModifierConfig,
} from '@shared/engine/battle-v5/core/configs';
import {
  AbilityType,
  AttributeType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import type { ElementType } from '@shared/types/constants';
import type { CultivationTechnique, Skill } from '@shared/types/cultivator';
import {
  ensureStarterSkill,
  ensureStarterTechnique,
} from './starterProducts';

function modifier(
  attrType: AttributeType,
  value: number,
): AttributeModifierConfig {
  return { attrType, type: ModifierType.FIXED, value };
}

function buildTechnique(
  name: string,
  element: ElementType,
  modifiers: AttributeModifierConfig[],
): CultivationTechnique {
  return ensureStarterTechnique({
    name,
    element,
    quality: '凡品',
    description: `${element}窍纳秽入门之法，导梦涎缓缓入体而不立毙，是守灯一脉最稳妥的「慢性中毒」。`,
    attributeModifiers: modifiers,
  });
}

function buildAttackSkill(
  name: string,
  element: ElementType,
  baseDamage: number,
  cooldown = 1,
  cost = 5,
): Skill {
  const ability: AbilityConfig = {
    slug: `basic-${element}-${name}`,
    name,
    type: AbilityType.ACTIVE_SKILL,
    tags: ['attack', element],
    mpCost: cost,
    cooldown,
    targetPolicy: { team: 'enemy', scope: 'single' },
    effects: [
      {
        type: 'damage',
        params: {
          value: {
            base: baseDamage,
            attribute: AttributeType.SPIRIT,
            coefficient: 1.2,
          },
        },
      },
    ],
  };
  return ensureStarterSkill({
    name,
    element,
    quality: '凡品',
    cost,
    cooldown,
    target_self: false,
    description: `${element}窍之力凝成一点凶光刺出，乃初入灯途的攻伐手段。`,
    abilityConfig: ability,
  });
}

function buildHealSkill(
  name: string,
  element: ElementType,
  baseHeal: number,
  cooldown = 4,
  cost = 8,
): Skill {
  const ability: AbilityConfig = {
    slug: `basic-${element}-${name}`,
    name,
    type: AbilityType.ACTIVE_SKILL,
    tags: ['heal', element],
    mpCost: cost,
    cooldown,
    targetPolicy: { team: 'self', scope: 'single' },
    effects: [
      {
        type: 'heal',
        params: {
          value: {
            base: baseHeal,
            attribute: AttributeType.SPIRIT,
            coefficient: 1.0,
          },
          target: 'hp',
        },
      },
    ],
  };
  return ensureStarterSkill({
    name,
    element,
    quality: '凡品',
    cost,
    cooldown,
    target_self: true,
    description: `${element}窍之息回护周身，可作自保续灯之用。`,
    abilityConfig: ability,
  });
}

export const BASIC_TECHNIQUES: Record<ElementType, () => CultivationTechnique> =
  {
    烛: () =>
      buildTechnique('照烛功', '烛', [
        modifier(AttributeType.STRENGTH, 5),
        modifier(AttributeType.ENDURANCE, 5),
      ]),
    尸: () =>
      buildTechnique('枯荣功', '尸', [
        modifier(AttributeType.VITALITY, 5),
        modifier(AttributeType.ENDURANCE, 5),
      ]),
    星: () =>
      buildTechnique('坠星诀', '星', [
        modifier(AttributeType.SPIRIT, 5),
        modifier(AttributeType.SPEED, 5),
      ]),
    渊: () =>
      buildTechnique('渊火功', '渊', [
        modifier(AttributeType.SPIRIT, 8),
        modifier(AttributeType.WILLPOWER, 2),
      ]),
    梦: () =>
      buildTechnique('沉梦经', '梦', [
        modifier(AttributeType.ENDURANCE, 8),
        modifier(AttributeType.VITALITY, 2),
      ]),
    噬: () =>
      buildTechnique('噬风功', '噬', [
        modifier(AttributeType.SPEED, 8),
        modifier(AttributeType.STRENGTH, 2),
      ]),
    帘: () =>
      buildTechnique('揭帘诀', '帘', [
        modifier(AttributeType.SPIRIT, 5),
        modifier(AttributeType.SPEED, 5),
      ]),
    疫: () =>
      buildTechnique('瘟霜诀', '疫', [
        modifier(AttributeType.SPIRIT, 6),
        modifier(AttributeType.WILLPOWER, 4),
      ]),
  };

export const BASIC_SKILLS: Record<ElementType, Skill[]> = {
  烛: [buildAttackSkill('烛锋刺', '烛', 12), buildHealSkill('灯皮护', '烛', 8)],
  尸: [buildAttackSkill('枯藤缚', '尸', 8), buildHealSkill('续命灯', '尸', 14)],
  星: [
    buildAttackSkill('坠星锥', '星', 10),
    buildHealSkill('星幕', '星', 12),
  ],
  渊: [buildAttackSkill('渊火指', '渊', 14), buildHealSkill('渊息灯', '渊', 8)],
  梦: [
    buildAttackSkill('梦石坠', '梦', 11),
    buildHealSkill('梦土甲', '梦', 10),
  ],
  噬: [buildAttackSkill('吞风刃', '噬', 10), buildHealSkill('噬风息', '噬', 9)],
  帘: [buildAttackSkill('裂幕击', '帘', 13), buildHealSkill('幕隙守', '帘', 9)],
  疫: [
    buildAttackSkill('瘟霜刺', '疫', 11),
    buildHealSkill('瘟幕守', '疫', 10),
  ],
};

import { StackRule } from '@shared/engine/battle-v5/buffs/Buff';
import type { EffectConfig } from '@shared/engine/battle-v5/core/configs';
import { EventPriorityLevel } from '@shared/engine/battle-v5/core/events';
import {
  AttributeType,
  BuffType,
  DamageSource,
  DamageType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { withSectBuffMethodGrowth } from '../../../core';
import { BAIXIBAN_BASE_DEFINITION } from '../definition';
import { BAIXIBAN_SECT_ID } from '../ids';

export const BAIXIBAN_STAGE_GRACE =
  BAIXIBAN_BASE_DEFINITION.combatResource.id;
export const BAIXIBAN_STAGE_MARK_BUFF = 'sect.baixiban.sword-mark';
export const BAIXIBAN_ARMOR_REND_BUFF = 'sect.baixiban.armor-rend';
export const BAIXIBAN_RETURNING_SWALLOW_BUFF =
  'sect.baixiban.returning-swallow';

export const SWIFT_GUARDED_EDGE = 'sect.baixiban.swift.guarded-edge';
export const SWIFT_IDLE_ACTIONS = 'sect.baixiban.swift.idle-actions';
export const SWIFT_FINISHER_ACTION = 'sect.baixiban.swift.finisher-action';
export const SWIFT_LINKED_CITY_ROUND = 'sect.baixiban.swift.linked-city-round';
export const SWIFT_ENDLESS_COOLDOWN = 'sect.baixiban.swift.endless-cooldown';
export const SWIFT_GAPLESS = 'sect.baixiban.swift.gapless';

export const HEAVY_ECHO_COOLDOWN = 'sect.baixiban.heavy.echo-cooldown';

export function createSwordMark(): EffectConfig {
  return {
    type: 'apply_buff',
    params: {
      target: 'target',
      buffConfig: withSectBuffMethodGrowth(
        {
          id: BAIXIBAN_STAGE_MARK_BUFF,
          name: '戏痕',
          description:
            '每层使受到的直接、反击和追击伤害提高，可被《谢幕》引动。',
          type: BuffType.DEBUFF,
          duration: 3,
          stackRule: StackRule.STACK_LAYER,
          maxLayers: 3,
          tags: [
            GameplayTags.BUFF.TYPE.DEBUFF,
            GameplayTags.BUFF.SECT.namespace(BAIXIBAN_SECT_ID, 'SwordMark'),
          ],
          statusTags: [
            GameplayTags.STATUS.SECT.state(BAIXIBAN_SECT_ID, 'SwordMarked'),
          ],
          listeners: [
            {
              id: 'sect.baixiban.sword-mark.damage-taken',
              eventType: GameplayTags.EVENT.DAMAGE_REQUEST,
              scope: GameplayTags.SCOPE.OWNER_AS_TARGET,
              priority: EventPriorityLevel.DAMAGE_REQUEST + 1,
              mapping: { caster: 'owner', target: 'owner' },
              effects: [
                {
                  type: 'percent_damage_modifier',
                  params: {
                    mode: 'increase',
                    value: 0.02,
                    scaleByBuffLayer: true,
                    allowedDamageSources: [
                      DamageSource.DIRECT,
                      DamageSource.COUNTER,
                      DamageSource.FOLLOW_UP,
                    ],
                    excludedDamageTypes: [DamageType.DOT],
                  },
                },
              ],
            },
          ],
        },
        { methodId: 'baixiban-canon', duration: true },
      ),
    },
  };
}

export function createArmorRend(layers = 1): EffectConfig[] {
  return Array.from({ length: layers }, () => ({
    type: 'apply_buff' as const,
    params: {
      target: 'target' as const,
      buffConfig: withSectBuffMethodGrowth(
        {
          id: BAIXIBAN_ARMOR_REND_BUFF,
          name: '裂甲',
          description: '每层降低目标物理防御。',
          type: BuffType.DEBUFF,
          duration: 3,
          stackRule: StackRule.STACK_LAYER,
          maxLayers: 3,
          tags: [GameplayTags.BUFF.TYPE.DEBUFF],
          modifiers: [
            {
              attrType: AttributeType.DEF,
              type: ModifierType.ADD,
              value: -0.03,
              scaleByLayer: true,
            },
          ],
        },
        { methodId: 'baixiban-canon', duration: true },
      ),
    },
  }));
}

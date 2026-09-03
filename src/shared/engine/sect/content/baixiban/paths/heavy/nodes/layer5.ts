import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { DAMAGE_MODIFIER_PRIORITY } from '../../../../../core';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import {
  growthShieldMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import { addBaixibanPassive } from '../../../shared/StageNodePassives';
import { heavySwordBuild } from '../HeavySwordBuildFacade';
import { HEAVY_RETURNING_PEAK_SHIELD_COEFFICIENT } from '../variants';

export const HEAVY_LAYER_5_NODES = [
  createBaixibanNode(
    {
      id: 'heavy-aftershock',
      layerId: '5',
      name: '裂岳',
      description: '《谢幕》获得15%穿防。',
    },
    (_context, builder) => heavySwordBuild(builder).enable('rendingMountain'),
  ),
  createBaixibanNode(
    {
      id: 'heavy-linked-mountains',
      layerId: '5',
      name: '断命',
      description: '目标气血低于25%时，《谢幕》造成的伤害提高15%。',
    },
    (context, builder) =>
      addBaixibanPassive(context, builder, {
        id: 'heavy-linked-mountains',
        name: '断命',
        listeners: [
          {
            id: 'sect.baixiban.heavy.life-ending',
            eventType: GameplayTags.EVENT.DAMAGE_REQUEST,
            scope: GameplayTags.SCOPE.OWNER_AS_CASTER,
            priority: DAMAGE_MODIFIER_PRIORITY,
            mapping: { caster: 'owner', target: 'event.target' },
            conditions: [
              {
                type: 'ability_has_tag',
                params: { tag: GameplayTags.ABILITY.SECT.FINISHER },
              },
              { type: 'hp_below', params: { value: 0.25, scope: 'target' } },
            ],
            effects: [
              {
                type: 'percent_damage_modifier',
                params: { mode: 'increase', value: 0.15 },
              },
            ],
          },
        ],
        presentationModifiers: [
          {
            abilityId: 'sect-ultimate',
            factRows: [
              '参悟·断命：目标气血低于25%时，《谢幕》造成的伤害提高15%',
            ],
          },
        ],
      }),
  ),
  createBaixibanNode(
    {
      id: 'heavy-steady-mountain',
      layerId: '5',
      name: '回峰',
      description:
        '《谢幕》伤害降低15%，施展后返还2点戏念，并获得随《百戏谱》成长的护盾。',
    },
    (_context, builder) => heavySwordBuild(builder).enable('returningPeak'),
    (context) =>
      `《谢幕》伤害降低15%；施展后返还2点戏念，并获得相当于${nodePercent(growthShieldMagnitude(context, 'baixiban-canon', HEAVY_RETURNING_PEAK_SHIELD_COEFFICIENT))}物攻的护盾。`,
  ),
] as const;

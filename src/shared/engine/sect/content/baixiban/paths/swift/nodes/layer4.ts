import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { DAMAGE_MODIFIER_PRIORITY } from '../../../../../core';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import {
  growthMagnitude,
  growthShieldMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import { addBaixibanPassive } from '../../../shared/StageNodePassives';
import { swiftSwordBuild } from '../SwiftSwordBuildFacade';
import {
  SWIFT_MOUNTAIN_BREAKING_COEFFICIENT,
  SWIFT_SHEATHING_SHIELD_COEFFICIENT,
} from '../variants';

export const SWIFT_LAYER_4_NODES = [
  createBaixibanNode(
    {
      id: 'swift-mountain-breaking',
      layerId: '4',
      name: '破妄',
      description:
        '施展《谢幕》时消耗全部戏痕；每消耗1层，追加一次随《百戏谱》成长且无视防御的伤害。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('mountainBreaking'),
    (context) =>
      `施展《谢幕》时消耗目标全部戏痕；每消耗1层，追加相当于${nodePercent(growthMagnitude(context, 'baixiban-canon', SWIFT_MOUNTAIN_BREAKING_COEFFICIENT))}物攻且无视防御的伤害。`,
  ),
  createBaixibanNode(
    {
      id: 'swift-life-chasing',
      layerId: '4',
      name: '追命',
      description: '目标气血低于25%时，《谢幕》造成的伤害提高15%。',
    },
    (context, builder) =>
      addBaixibanPassive(context, builder, {
        id: 'swift-life-chasing',
        name: '追命',
        listeners: [
          {
            id: 'sect.baixiban.swift-life-chasing.damage',
            eventType: GameplayTags.EVENT.DAMAGE_REQUEST,
            scope: GameplayTags.SCOPE.OWNER_AS_CASTER,
            priority: DAMAGE_MODIFIER_PRIORITY,
            mapping: { caster: 'owner', target: 'event.target' },
            effects: [
              {
                type: 'percent_damage_modifier',
                params: { mode: 'increase', value: 0.15 },
                conditions: [
                  {
                    type: 'ability_has_tag',
                    params: { tag: GameplayTags.ABILITY.SECT.FINISHER },
                  },
                  {
                    type: 'hp_below',
                    params: { value: 0.25, scope: 'target' },
                  },
                ],
              },
            ],
          },
        ],
        presentationModifiers: [
          {
            abilityId: 'sect-ultimate',
            factRows: [
              '参悟·追命：目标气血低于25%时，《谢幕》造成的伤害提高15%',
            ],
          },
        ],
      }),
  ),
  createBaixibanNode(
    {
      id: 'swift-sheathing',
      layerId: '4',
      name: '归鞘',
      description:
        '《谢幕》伤害降低15%，施展后返还2点戏念，并获得随《百戏谱》成长的护盾。器有出时，也应有归处。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('sheathing'),
    (context) =>
      `《谢幕》伤害降低15%；施展后返还2点戏念，并获得相当于${nodePercent(growthShieldMagnitude(context, 'baixiban-canon', SWIFT_SHEATHING_SHIELD_COEFFICIENT))}物攻的护盾。器有出时，也应有归处。`,
  ),
] as const;

import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { sectEffects } from '../../../../../core';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import {
  BAIXIBAN_STAGE_GRACE,
  SWIFT_GUARDED_EDGE,
} from '../../../shared/BaixibanMechanics';
import {
  growthDuration,
  growthMagnitude,
  growthStatusMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import {
  addBorrowedNodePassive,
  addBaixibanPassive,
} from '../../../shared/StageNodePassives';
import { swiftSwordBuild } from '../SwiftSwordBuildFacade';
import { SWIFT_RETURNING_SWALLOW_COUNTER_COEFFICIENT } from '../variants';

export const SWIFT_LAYER_3_NODES = [
  createBaixibanNode(
    {
      id: 'swift-returning-swallow',
      layerId: '3',
      name: '燕返',
      description:
        '提高《压轴》的首次闪避反击伤害，命中后施加1层随《百戏谱》成长的戏痕。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('returningSwallow'),
    (context) =>
      `《压轴》的首次闪避反击造成相当于${nodePercent(growthMagnitude(context, 'void-step', SWIFT_RETURNING_SWALLOW_COUNTER_COEFFICIENT))}物攻的伤害；命中后施加1层戏痕，每层使目标受到的直接、反击和追击伤害提高${nodePercent(growthStatusMagnitude(context, 'baixiban-canon', 0.02))}，持续目标未来${growthDuration(context, 'baixiban-canon', 3)}次行动。`,
  ),
  createBaixibanNode(
    {
      id: 'swift-borrowed-force',
      layerId: '3',
      name: '借风',
      description: '每回合首次受到直接伤害时，获得1点戏念。',
    },
    (context, builder) =>
      addBorrowedNodePassive(context, builder, {
        id: 'swift-borrowed-force',
        name: '借风',
        resourceId: BAIXIBAN_STAGE_GRACE,
      }),
  ),
  createBaixibanNode(
    {
      id: 'swift-guarded-edge',
      layerId: '3',
      name: '守锋',
      description:
        '被控制而跳过行动时戏念不衰减；下一次通过积势神通获得戏念时额外获得1点。',
    },
    (context, builder) => {
      swiftSwordBuild(builder).enable('guardedEdge');
      addBaixibanPassive(context, builder, {
        id: 'swift-guarded-edge',
        name: '守锋',
        listeners: [
          {
            id: 'sect.baixiban.swift-guarded-edge.skip',
            eventType: GameplayTags.EVENT.CONTROLLED_SKIP,
            scope: GameplayTags.SCOPE.OWNER_AS_ACTOR,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            effects: [
              sectEffects.modifyCounter(SWIFT_GUARDED_EDGE, 'set', {
                amount: 1,
              }),
            ],
          },
          {
            id: 'sect.baixiban.swift-guarded-edge.refund',
            eventType: GameplayTags.EVENT.COMBAT_RESOURCE_CHANGE,
            scope: GameplayTags.SCOPE.OWNER_AS_TARGET,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            effects: [
              sectEffects.modifyCounter(SWIFT_GUARDED_EDGE, 'reset', {
                effects: [
                  sectEffects.modifyResource(BAIXIBAN_STAGE_GRACE, 1),
                ],
                conditions: [
                  sectEffects.counterCondition(SWIFT_GUARDED_EDGE, 'gte', 1),
                  sectEffects.resourceChangeCondition(
                    BAIXIBAN_STAGE_GRACE,
                    'applied',
                    1,
                  ),
                  {
                    type: 'ability_has_tag',
                    params: { tag: GameplayTags.ABILITY.SECT.GENERATOR },
                  },
                ],
              }),
            ],
          },
        ],
        presentationModifiers: [
          {
            abilityId: 'guiding-sword',
            factRows: [
              '参悟·守锋：被控制而跳过行动时戏念不衰减；下一次通过积势神通获得戏念时额外获得1点',
            ],
          },
        ],
      });
    },
  ),
] as const;

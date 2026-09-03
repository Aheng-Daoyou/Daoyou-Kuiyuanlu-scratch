import { StackRule } from '@shared/engine/battle-v5/buffs/Buff';
import {
  AttributeType,
  BuffType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import {
  BAIXIBAN_STAGE_GRACE,
  createSwordMark,
} from '../../../shared/BaixibanMechanics';
import {
  growthDuration,
  growthStatusMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import {
  addHiddenNodePassive,
  addBaixibanPassive,
  addProbingNodePassive,
} from '../../../shared/StageNodePassives';
import { swiftSwordBuild } from '../SwiftSwordBuildFacade';

export const SWIFT_LAYER_1_NODES = [
  createBaixibanNode(
    {
      id: 'swift-opening',
      layerId: '1',
      name: '风起',
      description: '战斗开始时获得2点戏念；首回合灯影提高8%。',
    },
    (context, builder) => {
      swiftSwordBuild(builder).enable('opening');
      addBaixibanPassive(context, builder, {
        id: 'swift-opening',
        name: '风起',
        listeners: [
          {
            id: 'sect.baixiban.swift-opening.speed',
            eventType: 'BattleInitEvent',
            scope: GameplayTags.SCOPE.GLOBAL,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            triggerPolicy: { maxTriggers: 1, granularity: 'battle' },
            effects: [
              {
                type: 'apply_buff',
                params: {
                  target: 'caster',
                  buffConfig: {
                    id: 'sect.baixiban.swift-opening-speed',
                    name: '风起',
                    type: BuffType.BUFF,
                    duration: 1,
                    stackRule: StackRule.REFRESH_DURATION,
                    tags: [GameplayTags.BUFF.TYPE.BUFF],
                    modifiers: [
                      {
                        attrType: AttributeType.SPEED,
                        type: ModifierType.ADD,
                        value: 0.08,
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      });
    },
  ),
  createBaixibanNode(
    {
      id: 'swift-hidden-edge',
      layerId: '1',
      name: '敛锋',
      description:
        '本场战斗首次受到直接伤害时，该次伤害降低10%，并获得3点戏念。',
    },
    (context, builder) =>
      addHiddenNodePassive(context, builder, {
        id: 'swift-hidden-edge',
        name: '敛锋',
        resourceId: BAIXIBAN_STAGE_GRACE,
      }),
  ),
  createBaixibanNode(
    {
      id: 'swift-probing-edge',
      layerId: '1',
      name: '探虚',
      description:
        '《亮相》每累计命中2次，额外获得1点戏念，并施加1层随《百戏谱》成长的戏痕。',
    },
    (context, builder) =>
      addProbingNodePassive(context, builder, {
        id: 'swift-probing-edge',
        name: '探虚',
        resourceId: BAIXIBAN_STAGE_GRACE,
        basicAbilityId: 'plain-sword',
        statusEffect: createSwordMark(),
      }),
    (context) =>
      `《亮相》每累计命中2次，额外获得1点戏念，并施加1层戏痕；每层使目标受到的直接、反击和追击伤害提高${nodePercent(growthStatusMagnitude(context, 'baixiban-canon', 0.02))}，持续目标未来${growthDuration(context, 'baixiban-canon', 3)}次行动。`,
  ),
] as const;

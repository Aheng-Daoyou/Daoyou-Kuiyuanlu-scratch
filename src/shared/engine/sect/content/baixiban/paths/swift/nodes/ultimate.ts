import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { sectEffects } from '../../../../../core';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import { SWIFT_ENDLESS_COOLDOWN } from '../../../shared/BaixibanMechanics';
import {
  growthMagnitude,
  growthShieldMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import { addBaixibanPassive } from '../../../shared/StageNodePassives';
import { swiftSwordBuild } from '../SwiftSwordBuildFacade';
import {
  SWIFT_ENDLESS_FLOW_COEFFICIENT,
  SWIFT_UNENDING_WIND_SHIELD_COEFFICIENT,
} from '../variants';

export const SWIFT_ULTIMATE_NODES = [
  createBaixibanNode(
    {
      id: 'swift-endless-flow',
      layerId: 'ultimate',
      name: '无间',
      description:
        '施展《谢幕》后，追加随《百戏谱》成长的追击并获得1点戏念，每3回合最多触发一次。',
    },
    (context, builder) => {
      swiftSwordBuild(builder).enable('endlessFlow');
      addBaixibanPassive(context, builder, {
        id: 'swift-endless-flow',
        name: '无间',
        listeners: [
          {
            id: 'sect.baixiban.swift-endless-flow-round.tick',
            eventType: GameplayTags.EVENT.ROUND_START,
            scope: GameplayTags.SCOPE.GLOBAL,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            effects: [
              sectEffects.modifyCounter(SWIFT_ENDLESS_COOLDOWN, 'subtract', {
                amount: 1,
              }),
            ],
          },
        ],
        presentationModifiers: [
          {
            abilityId: 'sect-ultimate',
            factRows: ['参悟·无间：每3回合最多触发一次'],
          },
        ],
      });
    },
    (context) =>
      `施展《谢幕》后，追加相当于${nodePercent(growthMagnitude(context, 'baixiban-canon', SWIFT_ENDLESS_FLOW_COEFFICIENT))}物攻的追击并获得1点戏念，每3回合最多触发一次。`,
  ),
  createBaixibanNode(
    {
      id: 'swift-shadow-line',
      layerId: 'ultimate',
      name: '绝影',
      description:
        '以6点戏念施展《谢幕》时，总伤害降低15%，全部伤害段必定暴击，冷却增加1回合。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('shadowLine'),
  ),
  createBaixibanNode(
    {
      id: 'swift-unending-wind',
      layerId: 'ultimate',
      name: '回风',
      description:
        '每次《压轴》持续期间首次闪避时，获得随《圆场步》成长的护盾，并施加1层戏痕。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('unendingWind'),
    (context) =>
      `每次《压轴》持续期间首次闪避时，获得相当于${nodePercent(growthShieldMagnitude(context, 'void-step', SWIFT_UNENDING_WIND_SHIELD_COEFFICIENT))}物攻的护盾，并施加1层戏痕。`,
  ),
] as const;

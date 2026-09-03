import { GameplayTags } from '@shared/engine/shared/tag-domain';
import { sectEffects } from '../../../../../core';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import { HEAVY_ECHO_COOLDOWN } from '../../../shared/BaixibanMechanics';
import {
  growthDuration,
  growthHealMagnitude,
  growthMagnitude,
  growthShieldMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import { addBaixibanPassive } from '../../../shared/StageNodePassives';
import { heavySwordBuild } from '../HeavySwordBuildFacade';
import {
  HEAVY_ECHO_HEAL_RATIO,
  HEAVY_ECHO_SHIELD_COEFFICIENT,
  HEAVY_HEAVEN_CLEAVING_TOTAL_COEFFICIENT,
  HEAVY_IMMOVABLE_COUNTER_COEFFICIENT,
  HEAVY_IMMOVABLE_SHIELD_COEFFICIENT,
} from '../variants';

export const HEAVY_ULTIMATE_NODES = [
  createBaixibanNode(
    {
      id: 'heavy-heaven-cleaving',
      layerId: 'ultimate',
      name: '开天',
      description:
        '开锋之顶，《谢幕》改为仅可在6点戏念时施展，提高随《百戏谱》成长的总倍率并获得20%穿防；冷却增加1回合。',
    },
    (_context, builder) => heavySwordBuild(builder).enable('heavenCleaving'),
    (context) =>
      `《谢幕》仅可在6点戏念时施展，当前总倍率为${nodePercent(growthMagnitude(context, 'baixiban-canon', HEAVY_HEAVEN_CLEAVING_TOTAL_COEFFICIENT))}物攻，并获得20%穿防；冷却增加1回合。`,
  ),
  createBaixibanNode(
    {
      id: 'heavy-immovable-mountain',
      layerId: 'ultimate',
      name: '不动如山',
      description:
        '《心戏通明》额外提供随《万法不侵》成长的护盾；持续期间每回合可反击一次，造成随该心法成长的伤害。',
    },
    (_context, builder) => heavySwordBuild(builder).enable('immovableMountain'),
    (context) =>
      `《心戏通明》额外提供相当于${nodePercent(growthShieldMagnitude(context, 'origin-returning', HEAVY_IMMOVABLE_SHIELD_COEFFICIENT))}物攻的护盾；未来${growthDuration(context, 'origin-returning', 3)}次自身行动内，每回合首次受到直接伤害时反击，造成相当于${nodePercent(growthMagnitude(context, 'origin-returning', HEAVY_IMMOVABLE_COUNTER_COEFFICIENT))}物攻的伤害。`,
  ),
  createBaixibanNode(
    {
      id: 'heavy-mountain-river-echo',
      layerId: 'ultimate',
      name: '山河回响',
      description:
        '施展《谢幕》后恢复气血并获得随《百戏谱》成长的护盾，每3回合最多触发一次。',
    },
    (context, builder) => {
      heavySwordBuild(builder).enable('mountainRiverEcho');
      addBaixibanPassive(context, builder, {
        id: 'heavy-mountain-river-echo',
        name: '山河回响',
        listeners: [
          {
            id: 'sect.baixiban.heavy.echo.tick',
            eventType: GameplayTags.EVENT.ROUND_START,
            scope: GameplayTags.SCOPE.GLOBAL,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            effects: [
              sectEffects.modifyCounter(HEAVY_ECHO_COOLDOWN, 'subtract', {
                amount: 1,
              }),
            ],
          },
        ],
        presentationModifiers: [
          {
            abilityId: 'sect-ultimate',
            factRows: ['参悟·山河回响：每3回合最多触发一次'],
          },
        ],
      });
    },
    (context) =>
      `施展《谢幕》后恢复${nodePercent(growthHealMagnitude(context, 'baixiban-canon', HEAVY_ECHO_HEAL_RATIO))}最大气血，并获得相当于${nodePercent(growthShieldMagnitude(context, 'baixiban-canon', HEAVY_ECHO_SHIELD_COEFFICIENT))}物攻的护盾，每3回合最多触发一次。`,
  ),
] as const;

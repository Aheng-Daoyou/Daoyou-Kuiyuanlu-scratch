import { GameplayTags } from '@shared/engine/shared/tag-domain';
import {
  DAMAGE_MODIFIER_PRIORITY,
  DIRECT_DAMAGE_CONDITION,
  sectEffects,
} from '../../../../../core';
import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import { BAIXIBAN_STAGE_GRACE } from '../../../shared/BaixibanMechanics';
import { addBaixibanPassive } from '../../../shared/StageNodePassives';
import { heavySwordBuild } from '../HeavySwordBuildFacade';

export const HEAVY_LAYER_1_NODES = [
  createBaixibanNode(
    {
      id: 'heavy-opening',
      layerId: '1',
      name: '立地',
      description: '重剑立地，起手沉势：战斗开始时获得1点戏念，并获得相当于35%物攻的护盾。',
    },
    (context, builder) => {
      heavySwordBuild(builder).enable('opening');
      addBaixibanPassive(context, builder, {
        id: 'heavy-opening',
        name: '立地',
        listeners: [
          {
            id: 'sect.baixiban.heavy.opening',
            eventType: 'BattleInitEvent',
            scope: GameplayTags.SCOPE.GLOBAL,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            triggerPolicy: { maxTriggers: 1, granularity: 'battle' },
            effects: [sectEffects.shieldByAttack(0.35, undefined, 'caster')],
          },
        ],
      });
    },
  ),
  createBaixibanNode(
    {
      id: 'heavy-hidden-weight',
      layerId: '1',
      name: '承锋',
      description:
        '以身承剑锋，本场战斗首次受到直接伤害时，该次伤害降低15%，并获得2点戏念。',
    },
    (context, builder) =>
      addBaixibanPassive(context, builder, {
        id: 'heavy-hidden-weight',
        name: '承锋',
        listeners: [
          {
            id: 'sect.baixiban.heavy.bearing-edge',
            eventType: GameplayTags.EVENT.DAMAGE_REQUEST,
            scope: GameplayTags.SCOPE.OWNER_AS_TARGET,
            priority: DAMAGE_MODIFIER_PRIORITY,
            mapping: { caster: 'owner', target: 'owner' },
            triggerPolicy: { maxTriggers: 1, granularity: 'battle' },
            guard: { skipSecondaryDamageSource: true },
            conditions: [DIRECT_DAMAGE_CONDITION],
            effects: [
              {
                type: 'percent_damage_modifier',
                params: { mode: 'reduce', value: 0.15 },
              },
              sectEffects.modifyResource(BAIXIBAN_STAGE_GRACE, 2),
            ],
          },
        ],
      }),
  ),
  createBaixibanNode(
    {
      id: 'heavy-testing-frame',
      layerId: '1',
      name: '守拙',
      description:
        '每回合首次护盾破裂时，额外获得1点戏念。不争一时得失，以守势积成后手。',
    },
    (context, builder) =>
      addBaixibanPassive(context, builder, {
        id: 'heavy-testing-frame',
        name: '守拙',
        listeners: [
          {
            id: 'sect.baixiban.heavy.simple-guard',
            eventType: 'ShieldBreakEvent',
            scope: GameplayTags.SCOPE.OWNER_AS_TARGET,
            priority: 0,
            mapping: { caster: 'owner', target: 'owner' },
            triggerPolicy: { maxTriggers: 1, granularity: 'round' },
            effects: [sectEffects.modifyResource(BAIXIBAN_STAGE_GRACE, 1)],
          },
        ],
      }),
  ),
] as const;

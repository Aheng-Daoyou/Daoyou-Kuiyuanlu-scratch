import { StackRule } from '@shared/engine/battle-v5/buffs/Buff';
import type {
  AttributeModifierConfig,
  EffectConfig,
  ListenerConfig,
} from '@shared/engine/battle-v5/core/configs';
import { EventPriorityLevel } from '@shared/engine/battle-v5/core/events';
import {
  AttributeType,
  BuffType,
  DamageSource,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import { GameplayTags } from '@shared/engine/shared/tag-domain';
import {
  DIRECT_DAMAGE_CONDITION,
  SectAbilityFactory,
  sectEffects,
  withSectBuffMethodGrowth,
  type SectBuildBuilder,
  type SectProjectionContext,
} from '../../../core';
import { BAIXIBAN_BASE_DEFINITION } from '../definition';
import { BAIXIBAN_SECT_ID } from '../ids';
import { BAIXIBAN_STAGE_GRACE } from '../shared/BaixibanMechanics';

const abilityDefinition = (abilityId: string) => {
  const definition = BAIXIBAN_BASE_DEFINITION.abilities.find(
    (ability) => ability.id === abilityId,
  );
  if (!definition || definition.kind === 'passive')
    throw new Error(`百戏班基础主动神通未定义: ${abilityId}`);
  return definition;
};

const passiveDefinition = (abilityId: string) => {
  const definition = BAIXIBAN_BASE_DEFINITION.abilities.find(
    (ability) => ability.id === abilityId,
  );
  if (!definition || definition.kind !== 'passive')
    throw new Error(`百戏班基础被动未定义: ${abilityId}`);
  return definition;
};

const selfBuff = (
  id: string,
  name: string,
  duration: number,
  modifiers: AttributeModifierConfig[],
  listeners?: ListenerConfig[],
  growsWithMethod = true,
): EffectConfig => ({
  type: 'apply_buff',
  params: {
    target: 'caster',
    buffConfig: withSectBuffMethodGrowth(
      {
        id,
        name,
        type: BuffType.BUFF,
        duration,
        stackRule: StackRule.REFRESH_DURATION,
        tags: [GameplayTags.BUFF.TYPE.BUFF],
        modifiers,
        listeners,
      },
      { duration: growsWithMethod },
    ),
  },
});

const directReduction = (value: number): ListenerConfig[] => [
  {
    id: `sect.baixiban.direct-reduction.${value}`,
    eventType: GameplayTags.EVENT.DAMAGE_REQUEST,
    scope: GameplayTags.SCOPE.OWNER_AS_TARGET,
    priority: EventPriorityLevel.DAMAGE_REQUEST + 1,
    mapping: { caster: 'owner', target: 'owner' },
    guard: { skipSecondaryDamageSource: true },
    conditions: [DIRECT_DAMAGE_CONDITION],
    effects: [
      { type: 'percent_damage_modifier', params: { mode: 'reduce', value } },
    ],
  },
];

/** 编译无流派时的九个稳定基础神通。 */
export function compileBaixibanBase(
  context: SectProjectionContext,
  builder: SectBuildBuilder,
): void {
  const factory = new SectAbilityFactory(BAIXIBAN_SECT_ID);
  const resourceId = BAIXIBAN_STAGE_GRACE;
  const active = (
    abilityId: string,
    spec: Omit<Parameters<SectAbilityFactory['active']>[0], 'definition'>,
  ) =>
    builder.setAbility(
      abilityId,
      factory.active({ ...spec, definition: abilityDefinition(abilityId) }),
    );

  builder.setAbility(
    'baixiban-runtime',
    factory.passive({
      definition: passiveDefinition('baixiban-runtime'),
      modifiers: [
        {
          attrType: AttributeType.MAX_HP,
          type: ModifierType.ADD,
          value: 0.12,
        },
        {
          attrType: AttributeType.DEF,
          type: ModifierType.ADD,
          value: 0.08,
        },
        {
          attrType: AttributeType.CONTROL_RESISTANCE,
          type: ModifierType.FIXED,
          value: 0.06,
        },
      ],
      detailRows: [
        '常驻：最大气血+12%',
        '常驻：物理防御+8%',
        '常驻：控制抗性+6%',
      ],
    }),
  );

  active('plain-sword', {
    targetPolicy: { team: 'enemy', scope: 'single' },
    effects: [
      sectEffects.physicalDamage(0.6),
      sectEffects.modifyResource(resourceId, 1),
      // 亮相先铸一层薄护：封灵器起手，灯下先立住脚跟。
      sectEffects.shieldByAttack(0.25, undefined, 'caster'),
    ],
  });
  active('guiding-sword', {
    targetPolicy: { team: 'enemy', scope: 'single' },
    effects: [
      sectEffects.physicalDamage(0.72),
      sectEffects.modifyResource(resourceId, 2),
      sectEffects.shieldByAttack(0.3, undefined, 'caster'),
    ],
  });
  active('linked-edge', {
    targetPolicy: { team: 'enemy', scope: 'single' },
    effects: [
      sectEffects.physicalDamage(0.4),
      sectEffects.physicalDamage(0.4),
      sectEffects.physicalDamage(0.4),
      sectEffects.modifyResource(resourceId, 1),
    ],
    castEffects: [
      {
        type: 'skip_action',
        params: { count: 1, name: '调息', reason: '走场·调息' },
      },
    ],
  });
  active('turning-body', {
    targetPolicy: { team: 'self', scope: 'single' },
    effects: [],
    castEffects: [
      selfBuff(
        'sect.baixiban.hidden-thunder-guard',
        '压轴',
        1,
        [],
        directReduction(0.28),
        false,
      ),
      {
        type: 'queue_action',
        params: {
          id: 'sect.baixiban.hidden-thunder-strike',
          name: '听雷',
          tags: [
            GameplayTags.ABILITY.FUNCTION.DAMAGE,
            GameplayTags.ABILITY.CHANNEL.PHYSICAL,
            GameplayTags.ABILITY.KIND.SECT,
            GameplayTags.ABILITY.SECT.namespace(BAIXIBAN_SECT_ID),
            GameplayTags.ABILITY.SECT.ability(BAIXIBAN_SECT_ID, 'turning-body'),
            GameplayTags.ABILITY.SECT.COMBO,
            GameplayTags.ABILITY.TARGET.SINGLE,
          ],
          effects: [
            sectEffects.physicalDamage(1.6),
            sectEffects.modifyResource(resourceId, 2),
          ],
          interruptPolicy: 'uninterruptible',
          hitPolicy: 'guaranteed',
        },
      },
    ],
  });
  active('shadow-step', {
    targetPolicy: { team: 'self', scope: 'single' },
    effects: [
      selfBuff('sect.baixiban.traceless-step', '圆场', 2, [
        { attrType: AttributeType.SPEED, type: ModifierType.ADD, value: 0.08 },
        {
          attrType: AttributeType.EVASION_RATE,
          type: ModifierType.FIXED,
          value: 0.06,
        },
      ]),
    ],
  });
  active('breaking-edge', {
    targetPolicy: { team: 'enemy', scope: 'single' },
    effects: [
      sectEffects.physicalDamage(0.8),
      sectEffects.dispelPositiveBuffsByMethod(
        'edge-cleansing',
        1,
        context.sect.methods['edge-cleansing'],
        context.methodGrowth,
      ),
      sectEffects.shieldByAttack(0.2, undefined, 'caster'),
    ],
  });
  active('sword-aegis', {
    targetPolicy: { team: 'self', scope: 'single' },
    effects: [
      selfBuff('sect.baixiban.clear-heart', '心戏通明', 3, [
        {
          attrType: AttributeType.MAGIC_DEF,
          type: ModifierType.ADD,
          value: 0.2,
        },
        {
          attrType: AttributeType.CONTROL_RESISTANCE,
          type: ModifierType.FIXED,
          value: 0.06,
        },
      ]),
    ],
  });
  active('nurturing-sword', {
    targetPolicy: { team: 'self', scope: 'single' },
    effects: [
      selfBuff('sect.baixiban.sword-intent', '人戏合一', 3, [
        { attrType: AttributeType.ATK, type: ModifierType.ADD, value: 0.1 },
        { attrType: AttributeType.DEF, type: ModifierType.ADD, value: 0.1 },
      ]),
    ],
  });
  active('sect-ultimate', {
    targetPolicy: { team: 'enemy', scope: 'single' },
    castConditions: [
      {
        type: 'combat_resource_at_least',
        params: { resourceId, value: 3, scope: 'caster' },
      },
    ],
    effects: [
      {
        type: 'resource_scaled_damage',
        params: {
          resourceId,
          baseCoefficient: 0.5,
          coefficientPerPoint: 0.18,
          minPoints: 3,
          maxPoints: 6,
          consume: 'all',
          damageSource: DamageSource.DIRECT,
        },
      },
      // 谢幕铸盾：以戏念收束为护持，炉火不散，台上不崩。
      selfBuff(
        'sect.baixiban.curtain-shield',
        '谢幕护持',
        2,
        [
          {
            attrType: AttributeType.DEF,
            type: ModifierType.ADD,
            value: 0.18,
          },
          {
            attrType: AttributeType.MAX_HP,
            type: ModifierType.ADD,
            value: 0.1,
          },
        ],
        [
          {
            id: 'sect.baixiban.curtain-reflect',
            eventType: GameplayTags.EVENT.DAMAGE_TAKEN,
            scope: GameplayTags.SCOPE.OWNER_AS_TARGET,
            priority: EventPriorityLevel.DAMAGE_TAKEN,
            mapping: { caster: 'owner', target: 'event.caster' },
            guard: { skipSecondaryDamageSource: true },
            conditions: [DIRECT_DAMAGE_CONDITION],
            effects: [
              {
                type: 'reflect',
                params: { ratio: 0.25, maxHpRatioPerAction: 0.12 },
              },
            ],
          },
        ],
        false,
      ),
    ],
  });

  builder.setResource({
    ...BAIXIBAN_BASE_DEFINITION.combatResource,
    initial: 0,
  });
}

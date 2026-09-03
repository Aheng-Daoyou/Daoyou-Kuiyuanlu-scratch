import type { Cultivator } from '@shared/types/cultivator';
import type { RealmStage, RealmType } from '@shared/types/constants';
import { getRealmStageRank } from '@shared/config/realmProgression';
import {
  getArtifactWearerRealmFactor,
  scaleArtifactMainPanelFixedModifiers,
} from '@shared/engine/shared/artifactRealmScaling';
import { buildBodyCultivationAttributeModifiers } from '@shared/lib/bodyCultivation/effects';
import { AbilityFactory } from '../factories/AbilityFactory';
import {
  AttributeType,
  type AttributeModifier,
  type UnitId,
  type TeamId,
  type TeamSlot,
} from '../core/types';
import type { AbilityConfig } from '../core/configs';
import { buildSanityResource, buildSanityStateAbility, buildGuixiSanityBurnAbility, buildInvokeTruenameAbility, buildLampFlickerStateAbility } from '../core/sanity';
import { Unit } from '../units/Unit';
import { createSectAbilitySelectionStrategy } from '@shared/engine/sect';
import { projectSectCombat } from '@shared/engine/sect/content';
import type { BattleRuntime } from '../runtime/BattleRuntime';

export type CultivatorCombatInput = Pick<
  Cultivator,
  | 'id'
  | 'name'
  | 'clan'
  | 'realm'
  | 'realm_stage'
  | 'attributes'
  | 'spiritual_roots'
  | 'pre_heaven_fates'
  | 'sect'
  | 'skills'
  | 'cultivations'
  | 'equipped'
  | 'condition'
> & {
  inventory: Pick<Cultivator['inventory'], 'artifacts'>;
};

const ATTRIBUTE_MAP = {
  vitality: AttributeType.VITALITY,
  strength: AttributeType.STRENGTH,
  spirit: AttributeType.SPIRIT,
  endurance: AttributeType.ENDURANCE,
  speed: AttributeType.SPEED,
  willpower: AttributeType.WILLPOWER,
} as const;

function mountBodyCultivationModifiers(
  unit: Unit,
  cultivator: CultivatorCombatInput,
): void {
  for (const [index, modifier] of buildBodyCultivationAttributeModifiers(
    cultivator.condition,
  ).entries()) {
    const mountedModifier: AttributeModifier = {
      id: `bodyCultivation:body-cultivation:${modifier.attrType}:${index}`,
      attrType: modifier.attrType,
      type: modifier.type,
      value: modifier.value,
      source: {
        sourceType: 'bodyCultivation',
        carrierId: 'body-cultivation',
      },
    };
    unit.attributes.addModifier(mountedModifier);
  }
}

export function createCombatUnitFromCultivator(
  cultivator: CultivatorCombatInput,
  isMirror: boolean = false,
  runtime?: BattleRuntime,
  team?: { teamId: TeamId; slot: TeamSlot },
): Unit {
  const baseAttrs: Partial<Record<AttributeType, number>> = {};

  for (const [cultivatorKey, attrType] of Object.entries(ATTRIBUTE_MAP)) {
    baseAttrs[attrType] =
      cultivator.attributes[cultivatorKey as keyof typeof cultivator.attributes] ?? 0;
  }

  const unitId = ((cultivator.id ?? cultivator.name) + (isMirror ? '_mirror' : '')) as UnitId;
  const unitName = isMirror ? `${cultivator.name}的镜像` : cultivator.name;
  const unit = new Unit(unitId, unitName, baseAttrs, { runtime, ...team });
  unit.setSpiritualRoots(cultivator.spiritual_roots ?? []);
  unit.setRealmMeta({
    realm: cultivator.realm,
    realmStage: cultivator.realm_stage,
    realmRank: getRealmStageRank(cultivator.realm, cultivator.realm_stage),
  });

  // 神智轴：所有战斗单位（玩家与敌人）均持有神智资源，上限由境界决定。
  // 「力量↑则理智↓」——修为越高，神智永久上限越低。
  unit.combatResources.define(buildSanityResource(cultivator.realm));
  // 神智状态机：灯晃（<30%）与入魔（=0）由通用被动能力监听神智资源变化驱动。
  unit.abilities.addAbility(AbilityFactory.create(buildSanityStateAbility()));
  // 心灯将熄（克苏鲁恐怖感增强 28.6）：灯油 < 10% 时施加心灯摇曳 debuff。
  unit.abilities.addAbility(AbilityFactory.create(buildLampFlickerStateAbility()));
  // 呼真名处置动作：所有战斗单位通用挂载，念出真名灼烧目标神智并使其受缚。
  unit.abilities.addAbility(AbilityFactory.create(buildInvokeTruenameAbility()));
  // 诡异烧神智：诡异类敌人每次造成伤害，附带按比例灼烧目标神智。
  // 窥渊录中所有敌人皆属诡异三族（腌物/遗种/投影），故有 clan 字段即视为诡异。
  if (cultivator.clan) {
    unit.abilities.addAbility(AbilityFactory.create(buildGuixiSanityBurnAbility()));
  }

  const sectProjection = cultivator.sect
    ? projectSectCombat({ sect: cultivator.sect, realm: cultivator.realm })
    : null;

  for (const skill of sectProjection ? [] : (cultivator.skills ?? [])) {
    if (!skill.abilityConfig) continue;
    unit.abilities.addAbility(AbilityFactory.create(skill.abilityConfig));
  }

  for (const cultivation of cultivator.cultivations ?? []) {
    if (!cultivation.abilityConfig) continue;
    unit.abilities.addAbility(AbilityFactory.create(cultivation.abilityConfig));
  }

  const equippedIds = new Set(
    [cultivator.equipped.weapon, cultivator.equipped.armor, cultivator.equipped.accessory].filter(
      Boolean,
    ),
  );
  for (const artifact of cultivator.inventory.artifacts ?? []) {
    if (!artifact.id || !equippedIds.has(artifact.id) || !artifact.abilityConfig) {
      continue;
    }
    const productModel = (artifact.productModel ?? {}) as {
      metadata?: { anchorRealm?: RealmType; anchorRealmStage?: RealmStage };
    };
    const factor = getArtifactWearerRealmFactor(
      artifact.battleRuntimeMeta?.anchorRealm ??
        productModel.metadata?.anchorRealm,
      artifact.battleRuntimeMeta?.anchorRealmStage ??
        productModel.metadata?.anchorRealmStage,
      cultivator.realm,
      cultivator.realm_stage,
    );
    const effectiveAbilityConfig: AbilityConfig =
      artifact.abilityConfig.modifiers?.length && factor < 0.999
        ? {
            ...artifact.abilityConfig,
            modifiers: scaleArtifactMainPanelFixedModifiers(
              artifact.abilityConfig.modifiers,
              factor,
            ),
          }
        : artifact.abilityConfig;
    unit.abilities.addAbility(AbilityFactory.create(effectiveAbilityConfig));
  }

  mountBodyCultivationModifiers(unit, cultivator);

  if (sectProjection) {
    for (const resource of sectProjection.resources) {
      unit.combatResources.define(resource);
    }
    if (sectProjection.defaultAttack) {
      unit.abilities.setDefaultAttack(AbilityFactory.create(sectProjection.defaultAttack));
    }
    for (const ability of sectProjection.abilities) {
      unit.abilities.addAbility(AbilityFactory.create(ability));
    }
    const selectionStrategy = createSectAbilitySelectionStrategy(sectProjection);
    if (selectionStrategy) {
      unit.abilities.setSelectionStrategy(selectionStrategy);
    }
    for (const method of sectProjection.methodModifiers) {
      for (const [index, modifier] of method.modifiers.entries()) {
        unit.attributes.addModifier({
          id: `sect-method:${method.methodId}:${modifier.attrType}:${index}`,
          ...modifier,
          source: { sourceType: 'sectMethod', carrierId: method.methodId },
        });
      }
    }
  }

  unit.updateDerivedStats();
  unit.initializeCurrentResourcesToMax();
  return unit;
}

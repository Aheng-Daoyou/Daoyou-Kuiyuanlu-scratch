import type { AttributeModifierConfig } from '@shared/engine/battle-v5/core/configs';
import {
  AttributeType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import type { TowerBlessingId } from './blessings';
import type { TowerFloorKind } from './types';

const PRIMARY_ATTRIBUTES = [
  AttributeType.VITALITY,
  AttributeType.STRENGTH,
  AttributeType.SPIRIT,
  AttributeType.ENDURANCE,
  AttributeType.SPEED,
  AttributeType.WILLPOWER,
] as const;

function createModifier(
  attrType: AttributeType,
  value: number,
): AttributeModifierConfig {
  return {
    attrType,
    type: ModifierType.MULTIPLY,
    value,
  };
}

function appendRepeatedModifiers(
  target: AttributeModifierConfig[],
  attrTypes: readonly AttributeType[],
  multiplier: number,
  stacks: number,
) {
  for (let index = 0; index < stacks; index += 1) {
    for (const attrType of attrTypes) {
      target.push(createModifier(attrType, multiplier));
    }
  }
}

export function buildTowerBlessingAttributeModifiers(
  blessings: Partial<Record<TowerBlessingId, number>>,
): AttributeModifierConfig[] {
  const modifiers: AttributeModifierConfig[] = [];
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.VITALITY],
    1.08,
    blessings.vitality_surge ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.STRENGTH],
    1.08,
    blessings.strength_surge ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.SPIRIT],
    1.08,
    blessings.spirit_surge ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.ENDURANCE],
    1.08,
    blessings.endurance_surge ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.SPEED],
    1.08,
    blessings.swift_step ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.WILLPOWER],
    1.08,
    blessings.mind_focus ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.MAX_HP],
    1.1,
    blessings.jade_bones ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    [AttributeType.MAX_MP],
    1.12,
    blessings.sea_of_qi ?? 0,
  );
  appendRepeatedModifiers(
    modifiers,
    PRIMARY_ATTRIBUTES,
    1.05,
    blessings.balanced_dao ?? 0,
  );
  return modifiers;
}

export function buildTowerEncounterAttributeModifiers(
  kind: TowerFloorKind,
): AttributeModifierConfig[] {
  if (kind === 'normal') {
    return [];
  }

  const multiplier = kind === 'boss' ? 1.15 : 1.08;
  const hpMultiplier = kind === 'boss' ? 1.3 : 1.18;
  const modifiers = [
    createModifier(AttributeType.MAX_HP, hpMultiplier),
  ];

  for (const attrType of PRIMARY_ATTRIBUTES) {
    modifiers.push(createModifier(attrType, multiplier));
  }
  return modifiers;
}

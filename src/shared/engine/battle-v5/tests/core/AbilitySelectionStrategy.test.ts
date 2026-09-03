import {
  DefaultAbilitySelectionStrategy,
  type AbilitySelectionCandidate,
} from '@shared/engine/battle-v5/abilities/AbilitySelectionStrategy';
import { DataDrivenActiveSkill } from '@shared/engine/battle-v5/abilities/DataDrivenActiveSkill';
import { AttributeType } from '@shared/engine/battle-v5/core/types';
import { Unit } from '@shared/engine/battle-v5/units/Unit';
import { describe, expect, it } from 'vitest';

function unit(id: string): Unit {
  return new Unit(id, id, {
    [AttributeType.VITALITY]: 100,
    [AttributeType.SPIRIT]: 100,
    [AttributeType.ENDURANCE]: 100,
    [AttributeType.SPEED]: 100,
    [AttributeType.WILLPOWER]: 100,
  });
}

function candidate(
  id: string,
  priority: number,
  caster: Unit,
  target: Unit,
  order: number,
): AbilitySelectionCandidate {
  const ability = new DataDrivenActiveSkill(id, id, {
    priority,
    selectionProfile: { intents: ['damage'] },
  });
  ability.setOwner(caster);
  ability.setActive(true);
  return { ability, target, order };
}

describe('默认主动技能评分', () => {
  it('允许战术增加分数，但仍复用通用合法性和排序规则', () => {
    const caster = unit('caster');
    const opponent = unit('opponent');
    const lower = candidate('lower', 0, caster, opponent, 0);
    const higher = candidate('higher', 100, caster, opponent, 1);
    const context = { caster, opponent, candidates: [lower, higher] };
    const strategy = new DefaultAbilitySelectionStrategy();

    expect(strategy.select(context)?.ability.id).toBe('higher');
    expect(
      strategy.select(context, (entry) => (entry === lower ? 200 : 0))?.ability
        .id,
    ).toBe('lower');
  });
});

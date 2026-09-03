import { describe, expect, it } from 'vitest';
import { AttributeSet } from '../../units/AttributeSet';
import { AttributeType, ModifierType } from '../../core/types';

describe('AttributeSet derived combat attributes', () => {
  it('derives accuracy only from speed', () => {
    const attributes = new AttributeSet({
      [AttributeType.ENDURANCE]: 100,
      [AttributeType.WILLPOWER]: 40,
      [AttributeType.SPEED]: 20,
    });

    expect(attributes.getBaseValue(AttributeType.ACCURACY)).toBeCloseTo(
      0.05 + (0.27 * 20) / (20 + 240),
      8,
    );
    expect(attributes.getValue(AttributeType.ACCURACY)).toBeCloseTo(
      0.05 + (0.27 * 20) / (20 + 240),
      8,
    );
  });

  it('keeps derived accuracy on a diminishing-return curve', () => {
    const attributes = new AttributeSet({
      [AttributeType.ENDURANCE]: 3000,
      [AttributeType.WILLPOWER]: 3000,
      [AttributeType.SPEED]: 3000,
    });

    expect(attributes.getBaseValue(AttributeType.ACCURACY)).toBeCloseTo(
      0.05 + (0.27 * 3000) / (3000 + 240),
      8,
    );
  });

  it('derives evasion from speed with diminishing returns', () => {
    const attributes = new AttributeSet({
      [AttributeType.SPEED]: 1000,
    });
    const cappedAttributes = new AttributeSet({
      [AttributeType.SPEED]: 3000,
    });

    expect(attributes.getBaseValue(AttributeType.EVASION_RATE)).toBeCloseTo(
      0.02 + (0.24 * 1000) / (1000 + 240),
      8,
    );
    expect(cappedAttributes.getBaseValue(AttributeType.EVASION_RATE)).toBeCloseTo(
      0.02 + (0.24 * 3000) / (3000 + 240),
      8,
    );
  });

  it('keeps modifier support on derived accuracy and evasion', () => {
    const attributes = new AttributeSet({
      [AttributeType.ENDURANCE]: 1000,
      [AttributeType.WILLPOWER]: 1000,
      [AttributeType.SPEED]: 1000,
    });

    attributes.addModifier({
      id: 'accuracy_bonus',
      attrType: AttributeType.ACCURACY,
      type: ModifierType.FIXED,
      value: 0.05,
      source: 'test',
    });
    attributes.addModifier({
      id: 'evasion_bonus',
      attrType: AttributeType.EVASION_RATE,
      type: ModifierType.FIXED,
      value: 0.04,
      source: 'test',
    });

    expect(attributes.getValue(AttributeType.ACCURACY)).toBeCloseTo(
      0.05 + (0.27 * 1000) / (1000 + 240) + 0.05,
      8,
    );
    expect(attributes.getValue(AttributeType.EVASION_RATE)).toBeCloseTo(
      0.02 + (0.24 * 1000) / (1000 + 240) + 0.04,
      8,
    );
  });

  it('keeps the base critical rate independent from primary attributes', () => {
    const agile = new AttributeSet({
      [AttributeType.SPEED]: 1000,
      [AttributeType.ENDURANCE]: 100,
    });
    const slow = new AttributeSet({
      [AttributeType.SPEED]: 10,
      [AttributeType.ENDURANCE]: 100,
    });

    expect(agile.getBaseValue(AttributeType.CRIT_RATE)).toBeCloseTo(
      slow.getBaseValue(AttributeType.CRIT_RATE),
      8,
    );
    expect(agile.getBaseValue(AttributeType.CRIT_RATE)).toBeCloseTo(
      0.05,
      8,
    );
  });

  it('derives action speed only from speed with modifier support', () => {
    const attributes = new AttributeSet({
      [AttributeType.SPEED]: 100,
      [AttributeType.WILLPOWER]: 50,
    });

    expect(attributes.getBaseValue(AttributeType.ACTION_SPEED)).toBe(100);

    attributes.addModifier({
      id: 'haste',
      attrType: AttributeType.ACTION_SPEED,
      type: ModifierType.ADD,
      value: 0.2,
      source: 'test',
    });

    expect(attributes.getValue(AttributeType.ACTION_SPEED)).toBe(120);
  });

  it('derives fixed combat attributes linearly from primary attributes', () => {
    const attributes = new AttributeSet({
      [AttributeType.VITALITY]: 100,
      [AttributeType.STRENGTH]: 100,
      [AttributeType.SPEED]: 50,
      [AttributeType.SPIRIT]: 100,
      [AttributeType.ENDURANCE]: 100,
      [AttributeType.WILLPOWER]: 50,
    });

    expect(attributes.getBaseValue(AttributeType.ATK)).toBe(390);
    expect(attributes.getBaseValue(AttributeType.DEF)).toBe(185);
    expect(attributes.getBaseValue(AttributeType.MAGIC_ATK)).toBe(390);
    expect(attributes.getBaseValue(AttributeType.MAGIC_DEF)).toBe(122);
    expect(attributes.getBaseValue(AttributeType.ACTION_SPEED)).toBe(50);
    expect(attributes.getBaseValue(AttributeType.MAX_HP)).toBe(2700);
    expect(attributes.getBaseValue(AttributeType.MAX_MP)).toBe(1100);
  });

  it('keeps offense and survival sources orthogonal', () => {
    const baseline = new AttributeSet({});
    const vitality = new AttributeSet({ [AttributeType.VITALITY]: 100 });
    const strength = new AttributeSet({ [AttributeType.STRENGTH]: 100 });
    const endurance = new AttributeSet({ [AttributeType.ENDURANCE]: 100 });

    expect(vitality.getBaseValue(AttributeType.MAX_HP)).toBeGreaterThan(
      baseline.getBaseValue(AttributeType.MAX_HP),
    );
    expect(vitality.getBaseValue(AttributeType.ATK)).toBe(
      baseline.getBaseValue(AttributeType.ATK),
    );
    expect(strength.getBaseValue(AttributeType.ATK)).toBeGreaterThan(
      baseline.getBaseValue(AttributeType.ATK),
    );
    expect(strength.getBaseValue(AttributeType.MAX_HP)).toBe(
      baseline.getBaseValue(AttributeType.MAX_HP),
    );
    expect(endurance.getBaseValue(AttributeType.DEF)).toBeGreaterThan(
      baseline.getBaseValue(AttributeType.DEF),
    );
    expect(endurance.getBaseValue(AttributeType.ATK)).toBe(
      baseline.getBaseValue(AttributeType.ATK),
    );
  });

  it('adds only minor cross-survival value from vitality and endurance', () => {
    const baseline = new AttributeSet({
      [AttributeType.VITALITY]: 10,
      [AttributeType.ENDURANCE]: 10,
      [AttributeType.WILLPOWER]: 10,
    });
    const vitality = new AttributeSet({
      [AttributeType.VITALITY]: 110,
      [AttributeType.ENDURANCE]: 10,
      [AttributeType.WILLPOWER]: 10,
    });
    const endurance = new AttributeSet({
      [AttributeType.VITALITY]: 10,
      [AttributeType.ENDURANCE]: 110,
      [AttributeType.WILLPOWER]: 10,
    });

    expect(
      vitality.getBaseValue(AttributeType.MAGIC_DEF) -
        baseline.getBaseValue(AttributeType.MAGIC_DEF),
    ).toBe(25);
    expect(
      endurance.getBaseValue(AttributeType.MAX_HP) -
        baseline.getBaseValue(AttributeType.MAX_HP),
    ).toBe(300);
    expect(vitality.getBaseValue(AttributeType.ATK)).toBe(
      baseline.getBaseValue(AttributeType.ATK),
    );
    expect(endurance.getBaseValue(AttributeType.ATK)).toBe(
      baseline.getBaseValue(AttributeType.ATK),
    );
  });
});

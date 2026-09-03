import { describe, expect, it, beforeEach } from 'vitest';
import { AbilityFactory } from '../factories/AbilityFactory';
import { EventBus } from './EventBus';
import { Unit } from '../units/Unit';
import { AttributeType, DamageSource } from './types';
import { createHitResolution } from './resolution';
import type { DamageSegmentAppliedEvent } from './events';
import {
  buildGuixiSanityBurnAbility,
  buildSanityResource,
  GUIXI_SANITY_BURN_ABILITY_SLUG,
  GUIXI_SANITY_BURN_RATIO,
  SANITY_RESOURCE_ID,
} from './sanity';

/**
 * 诡异烧神智被动测试。
 *
 * 验证「诡异主烧神智、人形主烧气血」的数值分野：
 *  - 诡异单位挂载「梦涎蚀神」被动。
 *  - 诡异（owner）造成伤害（DamageSegmentAppliedEvent）后，目标神智按比例被烧。
 *  - 非诡异单位造成伤害不烧神智。
 *  - 比例扣减：烧的是目标「当前」神智的比例，越接近灯灭扣得越少。
 */
const TEST_SOURCE = { kind: 'system' as const, id: 'test', name: '测试' };

function makeUnit(id: string, realm: '闻腥' = '闻腥'): Unit {
  const unit = new Unit(id, id, {
    [AttributeType.VITALITY]: 10,
    [AttributeType.SPIRIT]: 10,
    [AttributeType.ENDURANCE]: 10,
    [AttributeType.SPEED]: 10,
    [AttributeType.WILLPOWER]: 10,
  });
  unit.combatResources.define(buildSanityResource(realm));
  return unit;
}

function publishDamage(caster: Unit, target: Unit): void {
  EventBus.instance.publish<DamageSegmentAppliedEvent>({
    type: 'DamageSegmentAppliedEvent',
    timestamp: Date.now(),
    caster,
    target,
    resolution: createHitResolution({
      actionId: `${caster.id}:action`,
      castId: `${caster.id}:cast`,
      caster,
      target,
    }),
    damageSource: DamageSource.DIRECT,
    damageTaken: 10,
    beforeHp: target.getCurrentHp(),
    remainHp: target.getCurrentHp(),
    hpReachedZeroBeforeReactions: false,
  });
}

describe('诡异烧神智被动', () => {
  beforeEach(() => {
    EventBus.instance.reset();
  });

  it('诡异单位挂载「梦涎蚀神」被动', () => {
    const guixi = makeUnit('guixi');
    guixi.abilities.addAbility(
      AbilityFactory.create(buildGuixiSanityBurnAbility()),
    );
    expect(
      guixi.abilities.getAbility(GUIXI_SANITY_BURN_ABILITY_SLUG),
    ).toBeDefined();
  });

  it('诡异造成伤害后，目标神智按当前值比例被烧', () => {
    const guixi = makeUnit('guixi');
    guixi.abilities.addAbility(
      AbilityFactory.create(buildGuixiSanityBurnAbility()),
    );
    const victim = makeUnit('victim'); // 闻腥：神智上限 100

    expect(victim.combatResources.getCurrent(SANITY_RESOURCE_ID)).toBe(100);
    publishDamage(guixi, victim);

    // 首次烧：100 * 6% = 6，剩 94
    expect(victim.combatResources.getCurrent(SANITY_RESOURCE_ID)).toBe(94);

    publishDamage(guixi, victim);
    // 第二次烧：94 * 6% = 5（floor），剩 89
    expect(victim.combatResources.getCurrent(SANITY_RESOURCE_ID)).toBe(89);
  });

  it('非诡异单位造成伤害不烧神智', () => {
    const human = makeUnit('human');
    const victim = makeUnit('victim');
    expect(victim.combatResources.getCurrent(SANITY_RESOURCE_ID)).toBe(100);

    publishDamage(human, victim);
    expect(victim.combatResources.getCurrent(SANITY_RESOURCE_ID)).toBe(100);
  });

  it('比例扣减越接近灯灭扣得越少（防暴走）', () => {
    const guixi = makeUnit('guixi');
    guixi.abilities.addAbility(
      AbilityFactory.create(buildGuixiSanityBurnAbility()),
    );
    const victim = makeUnit('victim');
    // 把目标神智压到 10
    victim.combatResources.set(SANITY_RESOURCE_ID, 10);
    publishDamage(guixi, victim);
    // 10 * 6% = 0.6 → floor 后至少 1，剩 9
    expect(victim.combatResources.getCurrent(SANITY_RESOURCE_ID)).toBe(9);
    // 烧神智比例常量
    expect(GUIXI_SANITY_BURN_RATIO).toBe(0.06);
  });
});

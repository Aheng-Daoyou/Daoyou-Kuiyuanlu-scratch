import { describe, expect, it, beforeEach } from 'vitest';
import { AbilityFactory } from '../factories/AbilityFactory';
import { EventBus } from './EventBus';
import { Unit } from '../units/Unit';
import { CombatAttributionV3 } from '../v3/origin';
import { TargetSelectionSystem } from '../systems/TargetSelectionSystem';
import { TargetPolicy } from '../abilities/TargetPolicy';
import {
  buildSanityResource,
  buildSanityStateAbility,
  SANITY_MADDENED_BUFF_ID,
  SANITY_RESOURCE_ID,
  SANITY_WAVER_BUFF_ID,
  isMaddened,
} from './sanity';

/**
 * 神智状态机（灯晃 / 入魔）集成测试。
 *
 * 验证核心张力「力量永远比理智涨得快」的下半场：
 *  - 神智跌破 30% → 施加「灯晃」（命中率、闪避率各 -15%）。
 *  - 神智归零 → 施加「入魔」（攻击 +30%、防御 -20%，终态不可驱散）。
 *  - 神智恢复到 30% 以上 → 移除「灯晃」（入魔不可逆）。
 */
const TEST_SOURCE = { kind: 'system' as const, id: 'test', name: '测试' };

describe('神智状态机（灯晃 / 入魔）', () => {
  beforeEach(() => {
    EventBus.instance.reset();
  });

  function makeUnit(realm: Parameters<typeof buildSanityResource>[0]): Unit {
    const unit = new Unit(`unit-${realm}`, realm, {});
    unit.combatResources.define(buildSanityResource(realm));
    unit.abilities.addAbility(AbilityFactory.create(buildSanityStateAbility()));
    return unit;
  }

  function hasBuff(unit: Unit, id: string): boolean {
    return unit.buffs.getAllBuffs().some((buff) => buff.id === id);
  }

  function sanitySource(unit: Unit) {
    return {
      attribution: CombatAttributionV3.system(unit, TEST_SOURCE),
      trace: EventBus.instance.reserveTrace(),
    };
  }

  it('神智状态能力可被装配为被动技能', () => {
    const unit = makeUnit('闻腥');
    expect(unit.abilities.getAbility('core.sanity.state')).toBeDefined();
  });

  it('神智低于 30% 时施加「灯晃」', () => {
    const unit = makeUnit('闻腥'); // 上限 100，30% = 30
    unit.combatResources.consume(SANITY_RESOURCE_ID, 80, {
      ...sanitySource(unit),
      operation: 'subtract',
      reason: 'spend',
    });
    expect(hasBuff(unit, SANITY_WAVER_BUFF_ID)).toBe(true);
  });

  it('神智归零时施加「入魔」', () => {
    const unit = makeUnit('闻腥');
    unit.combatResources.consume(SANITY_RESOURCE_ID, 'all', {
      ...sanitySource(unit),
      operation: 'consume_all',
      reason: 'spend',
    });
    expect(hasBuff(unit, SANITY_MADDENED_BUFF_ID)).toBe(true);
  });

  it('神智恢复 30% 以上时移除「灯晃」', () => {
    const unit = makeUnit('闻腥');
    unit.combatResources.consume(SANITY_RESOURCE_ID, 80, {
      ...sanitySource(unit),
      operation: 'subtract',
      reason: 'spend',
    });
    expect(hasBuff(unit, SANITY_WAVER_BUFF_ID)).toBe(true);

    unit.combatResources.modify(SANITY_RESOURCE_ID, 80, {
      ...sanitySource(unit),
      operation: 'add',
      reason: 'gain',
    });
    expect(hasBuff(unit, SANITY_WAVER_BUFF_ID)).toBe(false);
  });
});

describe('入魔敌我不分（AI 选敌）', () => {
  beforeEach(() => {
    EventBus.instance.reset();
  });

  function makeUnit(id: string, teamId: string): Unit {
    const unit = new Unit(id, `unit-${id}`, {}, { teamId });
    unit.combatResources.define(buildSanityResource('闻腥'));
    unit.abilities.addAbility(AbilityFactory.create(buildSanityStateAbility()));
    return unit;
  }

  function madden(unit: Unit): void {
    unit.combatResources.consume(SANITY_RESOURCE_ID, 'all', {
      attribution: CombatAttributionV3.system(unit, TEST_SOURCE),
      trace: EventBus.instance.reserveTrace(),
      operation: 'consume_all',
      reason: 'spend',
    });
  }

  it('isMaddened 正确识别入魔状态', () => {
    const unit = makeUnit('mad', 'a');
    expect(isMaddened(unit)).toBe(false);
    madden(unit);
    expect(isMaddened(unit)).toBe(true);
  });

  it('入魔的施法者在 enemy 目标池中敌我不分（包含友方）', () => {
    const caster = makeUnit('caster', 'team-a');
    const ally = makeUnit('ally', 'team-a');
    const enemy = makeUnit('enemy', 'team-b');
    const allUnits = [caster, ally, enemy];
    const targetSystem = new TargetSelectionSystem();

    // 未入魔：enemy 目标池只含敌方
    const normal = targetSystem.getTargetCandidates(
      caster,
      new TargetPolicy({ team: 'enemy', scope: 'single' }),
      allUnits,
    );
    expect(normal.map((u) => u.id).sort()).toEqual(['enemy']);

    // 入魔后：enemy 目标池敌我不分（含友方，排除自身）
    madden(caster);
    const maddened = targetSystem.getTargetCandidates(
      caster,
      new TargetPolicy({ team: 'enemy', scope: 'single' }),
      allUnits,
    );
    expect(maddened.map((u) => u.id).sort()).toEqual(['ally', 'enemy']);
  });

  it('入魔者不会把自己选为攻击目标', () => {
    const caster = makeUnit('caster', 'team-a');
    const ally = makeUnit('ally', 'team-a');
    const allUnits = [caster, ally];
    const targetSystem = new TargetSelectionSystem();
    madden(caster);
    const candidates = targetSystem.getTargetCandidates(
      caster,
      new TargetPolicy({ team: 'enemy', scope: 'single' }),
      allUnits,
    );
    expect(candidates.some((u) => u.id === caster.id)).toBe(false);
    expect(candidates.map((u) => u.id)).toEqual(['ally']);
  });
});

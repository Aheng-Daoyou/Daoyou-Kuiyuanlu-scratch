import { describe, expect, it, beforeEach } from 'vitest';
import { AbilityFactory } from '../factories/AbilityFactory';
import { EventBus } from './EventBus';
import { Unit } from '../units/Unit';
import { CombatAttributionV3 } from '../v3/origin';
import {
  buildSanityResource,
  buildLampFlickerStateAbility,
  LAMPFLICKER_BUFF_ID,
  LAMPFLICKER_MP_THRESHOLD,
  SANITY_RESOURCE_ID,
} from './sanity';
import type { RoundStartEvent } from './events';

/**
 * 心灯将熄（克苏鲁恐怖感增强 · 框架 28.6）集成测试。
 *
 * 验证「灯油将尽时心灯摇曳」：
 *  - 灯油 < 10% → 施加「心灯将熄」（防御 -10%，每回合再烧 3% 神智）。
 *  - 灯油 ≥ 10% → 移除「心灯将熄」。
 *  - 状态 buff 存在时，每回合开始按比例灼烧神智（呼应「入魔风险抬升」）。
 */
const TEST_SOURCE = { kind: 'system' as const, id: 'test', name: '测试' };

function publishRoundStart(): void {
  EventBus.instance.publish<RoundStartEvent>({
    type: 'RoundStartEvent',
    resolution: { turn: 1 } as never,
    timestamp: 0,
    turn: 1,
  });
}

describe('心灯将熄（克苏鲁恐怖感增强 28.6）', () => {
  beforeEach(() => {
    EventBus.instance.reset();
  });

  function makeUnit(realm: Parameters<typeof buildSanityResource>[0]): Unit {
    const unit = new Unit(`unit-${realm}`, realm, {});
    unit.combatResources.define(buildSanityResource(realm));
    unit.abilities.addAbility(AbilityFactory.create(buildLampFlickerStateAbility()));
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

  it('心灯将熄状态能力可被装配为被动技能', () => {
    const unit = makeUnit('闻腥');
    expect(unit.abilities.getAbility('core.sanity.lampflicker-state')).toBeDefined();
  });

  it('灯油充足（>= 10%）时不会施加心灯将熄', () => {
    const unit = makeUnit('闻腥');
    // 默认满灯油（100%），不应挂 buff。
    publishRoundStart();
    expect(hasBuff(unit, LAMPFLICKER_BUFF_ID)).toBe(false);
  });

  it('灯油跌穿 10% 阈值后，下一回合开始时施加心灯将熄', () => {
    const unit = makeUnit('闻腥');
    // 假设上限 200（闻腥境界），9% = 18 → 扣到 18/200 < 10%
    unit.setMp(unit.getMaxMp() * (LAMPFLICKER_MP_THRESHOLD - 0.01));
    publishRoundStart();
    expect(hasBuff(unit, LAMPFLICKER_BUFF_ID)).toBe(true);
  });

  it('灯油恢复到 10% 以上后，下一回合开始时移除心灯将熄', () => {
    const unit = makeUnit('闻腥');
    // 先打到灯将熄
    unit.setMp(unit.getMaxMp() * (LAMPFLICKER_MP_THRESHOLD - 0.01));
    publishRoundStart();
    expect(hasBuff(unit, LAMPFLICKER_BUFF_ID)).toBe(true);
    // 恢复灯油
    unit.setMp(unit.getMaxMp() * (LAMPFLICKER_MP_THRESHOLD + 0.05));
    publishRoundStart();
    expect(hasBuff(unit, LAMPFLICKER_BUFF_ID)).toBe(false);
  });

  it('心灯将熄存在时，每回合开始按比例烧神智', () => {
    const unit = makeUnit('闻腥');
    // 手动施加心灯将熄（避免等 1 回合）。
    // 直接挂 buff，然后发 RoundStart 观察神智扣减。
    // 借用 buildLampFlickerBuff 需要引出，但更稳的做法：先跌穿阈值触发一次。
    unit.setMp(unit.getMaxMp() * (LAMPFLICKER_MP_THRESHOLD - 0.01));
    publishRoundStart();
    expect(hasBuff(unit, LAMPFLICKER_BUFF_ID)).toBe(true);

    const sanityBefore = unit.combatResources.getCurrent(SANITY_RESOURCE_ID);
    // 手动把神智顶到满，便于清晰观察「每回合 3%」扣减。
    unit.combatResources.set(SANITY_RESOURCE_ID, 100, sanitySource(unit));
    const sanityFull = unit.combatResources.getCurrent(SANITY_RESOURCE_ID);
    expect(sanityFull).toBe(100);

    publishRoundStart();
    const sanityAfter = unit.combatResources.getCurrent(SANITY_RESOURCE_ID);
    // ratioOfCurrent 0.03 × 100 = 3，Math.max(1, ...) 保证至少扣 1。
    expect(sanityAfter).toBeLessThan(sanityFull);
    expect(sanityAfter).toBeGreaterThanOrEqual(sanityFull - 5);
  });
});

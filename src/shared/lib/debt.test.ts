import { describe, expect, it } from 'vitest';
import {
  buildDefaultConsequence,
  collateralLabel,
  collateralLifespanCost,
  computeOutstanding,
  creditorLabel,
  isDebtOverdue,
} from './debt';

describe('debt 领域规则', () => {
  it('判定到期：未到期不算违约，已到期算违约，非 active 不算违约', () => {
    const dueAt = '2026-09-10T00:00:00Z';
    const before = new Date('2026-09-09T23:59:59Z');
    const after = new Date('2026-09-10T00:00:00Z');

    expect(isDebtOverdue({ dueAt, status: 'active' }, before)).toBe(false);
    expect(isDebtOverdue({ dueAt, status: 'active' }, after)).toBe(true);
    expect(isDebtOverdue({ dueAt, status: 'settled' }, after)).toBe(false);
    expect(isDebtOverdue({ dueAt, status: 'defaulted' }, after)).toBe(false);
  });

  it('单利计息：不足一年按一年计，利息向上取整', () => {
    const incurred = new Date('2026-01-01T00:00:00Z');
    // 100 本金，50% 年利率，未满一年 → 150
    expect(
      computeOutstanding(100, 0.5, incurred, new Date('2026-06-01T00:00:00Z')),
    ).toBe(150);
    // 零利率 → 本金
    expect(
      computeOutstanding(100, 0, incurred, new Date('2026-06-01T00:00:00Z')),
    ).toBe(100);
  });

  it('抵押品标签与债主标签', () => {
    expect(collateralLabel('memory')).toBe('一段记忆');
    expect(collateralLabel('lifespan')).toBe('寿元');
    expect(collateralLabel('name')).toBe('名字');
    expect(collateralLabel('bond')).toBe('一段关系');
    expect(creditorLabel('black_alley')).toBe('无灯巷');
    expect(creditorLabel('ghost_market')).toBe('鬼市大集');
    expect(creditorLabel('sect_renewal')).toBe('幽都续灯');
  });

  it('违约后果：不同抵押品产生不同确定性后果', () => {
    const lifespan = buildDefaultConsequence('lifespan');
    expect(lifespan.kind).toBe('lifespan');
    expect(lifespan.effect.lifespanYears).toBe(5);

    const name = buildDefaultConsequence('name');
    expect(name.kind).toBe('name');
    expect(name.effect.nameStyle).toBe('scrambled');

    const memory = buildDefaultConsequence('memory');
    expect(memory.kind).toBe('memory');
    expect(memory.effect.memoryLabel).toBe('一段记忆');

    const bond = buildDefaultConsequence('bond');
    expect(bond.kind).toBe('bond');
    expect(bond.effect.bondLabel).toBe('一段关系');
  });

  it('寿元抵押的违约扣减权重', () => {
    expect(collateralLifespanCost('lifespan')).toBe(5);
    expect(collateralLifespanCost('memory')).toBe(0);
    expect(collateralLifespanCost('name')).toBe(0);
    expect(collateralLifespanCost('bond')).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import type { RolledAffix } from '../types';
import {
  buildArtifactSpirit,
  inferSpiritWhisperKind,
  type ArtifactSpiritInfo,
} from './spiritNarrative';

function makeAffix(overrides: Partial<RolledAffix> = {}): RolledAffix {
  return {
    id: 'affix-1',
    name: '守御镇诡',
    description: '',
    slot: 'weapon',
    rarity: 'rare',
    match: { any: [] },
    tags: [],
    weight: 10,
    energyCost: 8,
    effectTemplate: { kind: 'flat_modifier', attrType: 'attack', type: 'flat' },
    rollScore: 0.9,
    rollEfficiency: 0.9,
    finalMultiplier: 1.1,
    isPerfect: false,
    ...overrides,
  };
}

describe('spiritNarrative', () => {
  it('buildArtifactSpirit 产出完整器灵信息', () => {
    const spirit = buildArtifactSpirit('无睑之刃', '玄品', [makeAffix()], '2026-08-31T12:00:00.000Z');

    expect(spirit.name).toBeTruthy();
    expect(spirit.disposition).toBeTruthy();
    expect(spirit.whisper).toBeTruthy();
    expect(spirit.whisperKind).toBeTruthy();
    expect(spirit.awakenedAt).toBe('2026-08-31T12:00:00.000Z');
    expect(spirit.sealTier).toContain('玄品');
    expect(spirit.sealTier).toContain('器灵');
  });

  it('同输入确定性一致（同名同时刻产出一致器灵）', () => {
    const a = buildArtifactSpirit('沉渊目', '地品', [makeAffix()], '2026-08-31T00:00:00.000Z');
    const b = buildArtifactSpirit('沉渊目', '地品', [makeAffix()], '2026-08-31T00:00:00.000Z');
    expect(a).toEqual(b);
  });

  it('不同名字/时刻产出可不同（种子不同）', () => {
    const a = buildArtifactSpirit('甲器', '凡品', [makeAffix()], '2026-01-01T00:00:00.000Z');
    const b = buildArtifactSpirit('乙器', '凡品', [makeAffix()], '2026-02-02T00:00:00.000Z');
    // 至少名字或低语有一处不同，体现种子差异。
    expect(a.name === b.name && a.whisper === b.whisper).toBe(false);
  });

  it('inferSpiritWhisperKind 依词缀意象判定倾向', () => {
    expect(
      inferSpiritWhisperKind([makeAffix({ name: '噬灵夺魂' })], '玄品'),
    ).toBe('hunger');
    expect(
      inferSpiritWhisperKind([makeAffix({ name: '镇邪守御' })], '玄品'),
    ).toBe('vigil');
    expect(
      inferSpiritWhisperKind([makeAffix({ name: '惑心乱神' })], '玄品'),
    ).toBe('murmur');
  });

  it('无倾向词缀时按品质回退（高品偏向初醒）', () => {
    expect(inferSpiritWhisperKind([makeAffix({ name: '平平无奇' })], '神品')).toBe('bloom');
  });

  it('类型完整：ArtifactSpiritInfo 字段齐全', () => {
    const spirit: ArtifactSpiritInfo = buildArtifactSpirit('灯下伏藏', '灵品', [], 't');
    expect(Object.keys(spirit).sort()).toEqual(
      ['awakenedAt', 'disposition', 'name', 'sealTier', 'whisper', 'whisperKind'].sort(),
    );
  });
});

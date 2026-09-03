import { describe, expect, it } from 'vitest';
import {
  BAD_INCENSE_CONFLICT_THRESHOLD,
  buildBadIncenseSpec,
  resolveBadIncenseQuality,
  shouldTriggerBadIncense,
} from './badIncense';

describe('香变（坏香）失败机制', () => {
  describe('shouldTriggerBadIncense', () => {
    it('产出为空时触发香变', () => {
      expect(shouldTriggerBadIncense({ lotsEmpty: true })).toBe(true);
    });

    it('香力散逸比过高时触发香变', () => {
      expect(shouldTriggerBadIncense({ essenceLossRatio: 0.95 })).toBe(true);
    });

    it('fitBand 为 poor 时触发香变', () => {
      expect(shouldTriggerBadIncense({ fitBand: 'poor' })).toBe(true);
    });

    it('香路冲突分过高时触发香变', () => {
      expect(
        shouldTriggerBadIncense({
          conflictScore: BAD_INCENSE_CONFLICT_THRESHOLD + 0.01,
        }),
      ).toBe(true);
    });

    it('正常信号下不触发香变', () => {
      expect(
        shouldTriggerBadIncense({
          lotsEmpty: false,
          essenceLossRatio: 0.2,
          fitBand: 'aligned',
          conflictScore: 0.1,
        }),
      ).toBe(false);
    });

    it('无任何信号时不触发香变', () => {
      expect(shouldTriggerBadIncense({})).toBe(false);
    });
  });

  describe('resolveBadIncenseQuality', () => {
    it('空材料列表回退为凡品', () => {
      expect(resolveBadIncenseQuality([])).toBe('凡品');
    });

    it('取材料最高品阶', () => {
      expect(
        resolveBadIncenseQuality(['凡品', '玄品', '地品', '灵品']),
      ).toBe('地品');
    });
  });

  describe('buildBadIncenseSpec', () => {
    it('improvised 坏香标记 isBadIncense 且无有效香效来源', () => {
      const spec = buildBadIncenseSpec({
        family: 'healing',
        sourceMaterials: ['灯心草', '沉水香'],
        dominantElement: '渊',
        stability: 40,
        toxicityRating: 80,
        source: 'improvised',
        tags: ['坏香', '香变'],
      });

      expect(spec.kind).toBe('pill');
      expect(spec.alchemyMeta.source).toBe('improvised');
      expect(spec.alchemyMeta.isBadIncense).toBe(true);
      expect(spec.alchemyMeta.sourceMaterials).toEqual(['灯心草', '沉水香']);
      expect(spec.consumeRules.quotaCategory).toBe('none');
    });

    it('formula 坏香携带 formulaId 与 fitBand', () => {
      const spec = buildBadIncenseSpec({
        family: 'cultivation',
        sourceMaterials: ['玄铁矿'],
        stability: 30,
        toxicityRating: 90,
        source: 'formula',
        formulaId: 'formula-123',
        fitBand: 'poor',
        fitScore: 0,
        fitMultiplier: 0.5,
        tags: ['坏香'],
      });

      expect(spec.alchemyMeta.source).toBe('formula');
      expect(spec.alchemyMeta.formulaId).toBe('formula-123');
      expect(spec.alchemyMeta.fitBand).toBe('poor');
      expect(spec.alchemyMeta.isBadIncense).toBe(true);
    });
  });
});

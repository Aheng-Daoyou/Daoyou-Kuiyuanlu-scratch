import { vi } from 'vitest';
import { ELEMENT_VALUES } from '@shared/types/constants';
import { generateSpiritualRoots } from './utils';

describe('generateSpiritualRoots', () => {
  it('filters invalid elements and never outputs values outside ELEMENT_VALUES', () => {
    const roots = generateSpiritualRoots(88, ['无', '渊', '渊']);

    expect(roots).toHaveLength(1);
    expect(roots[0].element).toBe('渊');
    expect(ELEMENT_VALUES).toContain(roots[0].element);
    expect(roots[0].grade).toBe('天窍');
  });

  it('assigns spiritual root grade by rules', () => {
    const tian = generateSpiritualRoots(95, ['渊']);
    const bianyi = generateSpiritualRoots(95, ['帘']);
    const mixedWithMutation = generateSpiritualRoots(85, ['帘', '尸']);
    const zhen = generateSpiritualRoots(80, ['烛', '尸', '星']);
    const wei = generateSpiritualRoots(40, ['烛', '尸', '星', '渊']);

    expect(tian[0].grade).toBe('天窍');
    expect(bianyi[0].grade).toBe('变异窍');
    expect(mixedWithMutation.find((root) => root.element === '帘')?.grade).toBe(
      '变异窍',
    );
    expect(zhen.every((root) => root.grade === '真窍')).toBe(true);
    expect(wei.every((root) => root.grade === '伪窍')).toBe(true);
  });

  it('falls back to valid random roots when all preferences are invalid', () => {
    const roots = generateSpiritualRoots(40, ['无', '虚空']);

    expect(roots).toHaveLength(4);
    roots.forEach((root) => {
      expect(ELEMENT_VALUES).toContain(root.element);
      if (
        root.element === '噬' ||
        root.element === '帘' ||
        root.element === '疫'
      ) {
        expect(root.grade).toBe('变异窍');
      } else {
        expect(root.grade).toBe('伪窍');
      }
    });
  });

  it('applies strength caps by root count and mutation bonus', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    try {
      const oneRoot = generateSpiritualRoots(100, ['渊']);
      const twoRoots = generateSpiritualRoots(100, ['烛', '尸']);
      const threeRoots = generateSpiritualRoots(100, ['烛', '尸', '星']);
      const fourRoots = generateSpiritualRoots(100, ['烛', '尸', '星', '渊']);
      const mixedMutation = generateSpiritualRoots(100, ['帘', '尸']);

      expect(oneRoot[0].strength).toBeLessThanOrEqual(95);
      expect(twoRoots.every((root) => root.strength <= 80)).toBe(true);
      expect(threeRoots.every((root) => root.strength <= 65)).toBe(true);
      expect(fourRoots.every((root) => root.strength <= 55)).toBe(true);

      expect(
        mixedMutation.find((root) => root.element === '帘')?.strength,
      ).toBeLessThanOrEqual(90);
      expect(
        mixedMutation.find((root) => root.element === '尸')?.strength,
      ).toBeLessThanOrEqual(80);
    } finally {
      randomSpy.mockRestore();
    }
  });
});

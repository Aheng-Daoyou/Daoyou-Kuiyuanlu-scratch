import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreHeavenFate } from '@shared/types/cultivator';
import { applyFateNaming } from './FateNamingService';

const { generateAiObjectMock } = vi.hoisted(() => ({
  generateAiObjectMock: vi.fn(),
}));

vi.mock('@server/utils/aiClient', () => ({
  generateAiObject: generateAiObjectMock,
}));

const makeFate = (overrides: Partial<PreHeavenFate> = {}): PreHeavenFate => ({
  name: '旧名甲',
  quality: '灵品',
  description: '预设描述甲',
  effects: [
    {
      id: 'e1',
      effectId: 'retreat_exp_multiplier',
      scope: 'daily',
      polarity: 'boon',
      effectType: 'retreat_exp_multiplier',
      value: 12,
      label: '闭关灯韵 +12%',
      description: '闭关窥悟时灯韵获取提升。',
      rollMeta: {
        qualityAnchor: '灵品',
        minValue: 5,
        maxValue: 20,
        rolledPercentile: 60,
        roundingStep: 1,
      },
    },
  ],
  generationModel: {
    version: 'v6',
    rollVersion: 'v6',
    quality: '灵品',
    effectIds: ['retreat_exp_multiplier'],
    compositionHash: 'abc123',
    category: 'single_positive',
  },
  ...overrides,
});

describe('FateNamingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AI 成功时回填命数名称/描述与命名元数据', async () => {
    generateAiObjectMock.mockResolvedValueOnce({
      output: {
        candidates: [
          {
            name: '灯下伏藏',
            description: '此人生来便有灯影相随，闭关时气机沉潜，如灯油绵长，久蕴方成。',
            styleInsight: '沉潜藏锋',
          },
        ],
      },
    });

    const fates = [makeFate()];
    const named = await applyFateNaming(fates);

    expect(named[0].name).toBe('灯下伏藏');
    expect(named[0].description).toContain('灯影');
    expect(named[0].namingMetadata).toEqual({
      status: 'success',
      provider: 'fate-naming',
      originalName: '旧名甲',
      styleInsight: '沉潜藏锋',
    });
    expect(generateAiObjectMock).toHaveBeenCalledTimes(1);
  });

  it('AI 失败时降级为本地预设（保持原名并标记 fallback）', async () => {
    generateAiObjectMock.mockRejectedValueOnce(new Error('LLM unavailable'));

    const fates = [makeFate()];
    const named = await applyFateNaming(fates);

    expect(named[0].name).toBe('旧名甲');
    expect(named[0].namingMetadata?.status).toBe('fallback');
    expect(named[0].namingMetadata?.provider).toBe('fate-naming');
  });

  it('空候选池直接返回，不调用 AI', async () => {
    const named = await applyFateNaming([]);
    expect(named).toEqual([]);
    expect(generateAiObjectMock).not.toHaveBeenCalled();
  });

  it('AI 返回数量不足时，缺失项保持 fallback 命名', async () => {
    generateAiObjectMock.mockResolvedValueOnce({
      output: {
        candidates: [
          {
            name: '灯下伏藏',
            description: '此人生来便有灯影相随。',
          },
        ],
      },
    });

    const fates = [makeFate({ name: '旧名甲' }), makeFate({ name: '旧名乙' })];
    const named = await applyFateNaming(fates);

    expect(named[0].name).toBe('灯下伏藏');
    expect(named[1].name).toBe('旧名乙');
    expect(named[1].namingMetadata?.status).toBe('fallback');
  });
});

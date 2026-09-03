import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CultivatorAIRawData } from './types';
import { CharacterGenerator } from './CharacterGenerator';
import { CultivatorAIRawSchema } from './types';

const { generateAiObjectMock, hasAnyServerLlmProviderConfiguredMock } = vi.hoisted(() => ({
  generateAiObjectMock: vi.fn(),
  hasAnyServerLlmProviderConfiguredMock: vi.fn(() => true),
}));

vi.mock('@server/utils/aiClient', () => ({
  generateAiObject: generateAiObjectMock,
  hasAnyServerLlmProviderConfigured: hasAnyServerLlmProviderConfiguredMock,
}));

const buildAIData = (
  overrides: Partial<CultivatorAIRawData> = {},
): CultivatorAIRawData => ({
  name: '林秋',
  gender: '男',
  origin: '青岚山',
  personality: '沉静坚韧',
  lineage_lore: '祖上三代皆在灯下守灯，曾祖某夜未归，自此一脉开窍皆偏星。',
  background: '少年出身山村，偶得残卷，自此踏上修行之路。',
  element_preferences: ['烛', '尸', '星', '渊'],
  aptitude_score: 78,
  balance_notes: '双目有神，命数稳中带锋。',
  ...overrides,
});

describe('CharacterGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the tolerant AI schema and trims extra element preferences', async () => {
    generateAiObjectMock.mockResolvedValueOnce({
      output: buildAIData({
        element_preferences: ['烛', '尸', '星', '渊', '梦'],
      }),
    });

    const { cultivator } = await CharacterGenerator.generate('偏向封灵道的少年');

    expect(generateAiObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.any(String),
        prompt: expect.any(String),
        schema: CultivatorAIRawSchema,
        name: '守灯真形骨架',
        sceneId: 'character-generation',
      }),
    );
    expect(cultivator.spiritual_roots.map((root) => root.element)).toEqual([
      '烛',
      '尸',
      '星',
      '渊',
    ]);
  });

  it('deduplicates repeated element preferences before generating roots', async () => {
    generateAiObjectMock.mockResolvedValueOnce({
      output: buildAIData({
        element_preferences: ['渊', '渊', '星'],
      }),
    });

    const { cultivator } = await CharacterGenerator.generate('擅长丹火的修士');

    expect(cultivator.spiritual_roots.map((root) => root.element)).toEqual([
      '渊',
      '星',
    ]);
  });

  it('creates fixed base attributes without a persisted skill cap field', async () => {
    generateAiObjectMock.mockResolvedValueOnce({
      output: buildAIData({
        aptitude_score: 95,
      }),
    });

    const { cultivator } = await CharacterGenerator.generate('根骨上佳的修士');

    expect(cultivator.attributes).toEqual({
      vitality: 10,
      strength: 10,
      spirit: 10,
      endurance: 10,
      speed: 10,
      willpower: 10,
    });
    const removedSkillCapKey = 'max' + '_skills';
    expect(removedSkillCapKey in cultivator).toBe(false);
  });
});

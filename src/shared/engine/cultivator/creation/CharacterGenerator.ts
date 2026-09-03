import type {
  CultivationTechnique,
  Cultivator,
  Skill,
} from '@shared/types/cultivator';
import { hasAnyServerLlmProviderConfigured } from '@server/utils/aiClient';
import { generateAiObject } from '@server/utils/aiClient';
import { BASIC_SKILLS, BASIC_TECHNIQUES } from './config';
import {
  getCharacterGenerationPrompt,
  getCharacterGenerationUserPrompt,
} from './prompts';
import { CultivatorAIRawSchema, normalizeCultivatorAIData } from './types';
import { buildTemplateCultivatorAIData } from './templateFallback';
import { generateAttributes, generateSpiritualRoots } from './utils';

export class CharacterGenerator {
  /**
   * 生成新角色
   * @param userInput 用户输入的描述/提示词
   */
  public static async generate(
    userInput: string,
  ): Promise<{ cultivator: Cultivator; balanceNotes: string }> {
    // 1. 调用 AI 生成角色骨架（未配置 LLM 或调用失败时降级到内置模板）
    let aiOutput;

    if (!hasAnyServerLlmProviderConfigured()) {
      console.warn(
        '[CharacterGenerator] 未配置 LLM Provider，使用内置模板生成角色骨架',
      );
      aiOutput = buildTemplateCultivatorAIData(userInput);
    } else {
      const prompt = getCharacterGenerationPrompt();
      const userPrompt = getCharacterGenerationUserPrompt(userInput);

      try {
        const aiResponse = await generateAiObject({
          system: prompt,
          prompt: userPrompt,
          schema: CultivatorAIRawSchema,
          name: '守灯真形骨架',
          sceneId: 'character-generation',
        });
        aiOutput = aiResponse.output;
      } catch (error) {
        console.warn(
          '[CharacterGenerator] AI 角色生成失败，降级到内置模板:',
          error instanceof Error ? error.message : error,
        );
        aiOutput = buildTemplateCultivatorAIData(userInput);
      }
    }

    const data = normalizeCultivatorAIData(aiOutput);

    // 2. 数值化生成
    const attributes = generateAttributes();
    const spiritual_roots = generateSpiritualRoots(
      data.aptitude_score,
      data.element_preferences,
    );

    // 确定主窍（强度最高的）
    const mainRoot = spiritual_roots.reduce((prev, current) =>
      prev.strength > current.strength ? prev : current,
    );

    // 3. 分配功法与神通
    // 功法：主窍对应的基础功法
    const cultivation = BASIC_TECHNIQUES[mainRoot.element]();
    const cultivations: CultivationTechnique[] = [cultivation];

    // 神通：主窍对应的一攻一守
    const skills: Skill[] = [...BASIC_SKILLS[mainRoot.element]];

    // 4. 其他基础数值
    const age = 14 + Math.floor(Math.random() * 6); // 14-20岁
    // 寿元：闻腥期基础100，分数高加成
    const lifespan =
      80 + Math.floor(Math.random() * 20) + (data.aptitude_score > 80 ? 20 : 0);

    // 构造完整的 Cultivator 对象
    const cultivator: Cultivator = {
      id: '', // Placeholder
      name: data.name,
      gender: data.gender,
      origin: data.origin,
      personality: data.personality,
      lineage_lore: data.lineage_lore,
      background: data.background,
      playerRace: 'human',
      raceNarrative: data.race_narrative,

      realm: '闻腥',
      realm_stage: '初期',
      age,
      lifespan,

      attributes,
      spiritual_roots,
      cultivations,
      skills,
      status: 'active',
      spirit_stones: 0,
      pre_heaven_fates: [], // 后续流程生成
      inventory: {
        artifacts: [],
        consumables: [],
        materials: [],
      },
      equipped: {
        weapon: null,
        armor: null,
        accessory: null,
      },
      prompt: userInput,
      balance_notes: data.balance_notes,
    };

    return {
      cultivator,
      balanceNotes: data.balance_notes,
    };
  }
}

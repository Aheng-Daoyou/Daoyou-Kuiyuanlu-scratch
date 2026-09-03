import { renderPrompt } from '@server/lib/prompts';
import { generateAiObject, hasAnyServerLlmProviderConfigured } from '@server/utils/aiClient';
import { stableCompactStringify, truncateText } from '@server/utils/llmPayload';
import {
  GENERATABLE_ALCHEMY_PROPERTY_KEY_VALUES,
  getAlchemyPropertyLabel,
  normalizeWeightedAlchemyProperties,
} from '@shared/lib/alchemyProperties';
import { mergeAlchemyMaterialPropertyHints } from '@shared/lib/alchemyMaterialHints';
import { ELEMENT_VALUES, type Quality } from '@shared/types/constants';
import {
  ALCHEMY_FOCUS_MODE_VALUES,
  type AlchemyPropertyKey,
  type AlchemyRecipePlan,
  type CompatibleAlchemyPropertyKey,
} from '@shared/types/consumable';
import { z } from 'zod';
import type { PreparedAlchemyMaterial } from './AlchemyRecipeRules';

const weightedAlchemyPropertySchema = z.object({
  key: z.enum(GENERATABLE_ALCHEMY_PROPERTY_KEY_VALUES),
  weight: z.number().min(0).max(1),
});

const materialVectorSchema = z.object({
  materialRef: z.string().min(1),
  properties: z.array(weightedAlchemyPropertySchema).min(1).max(3),
});

const alchemyRecipePlanSchema = z.object({
  materialVectors: z.array(materialVectorSchema).min(1),
  intentVector: z.array(weightedAlchemyPropertySchema).max(3).default([]),
  focusMode: z.enum(ALCHEMY_FOCUS_MODE_VALUES),
  requestedElementBias: z.enum(ELEMENT_VALUES).optional(),
});

function buildPropertyGuide(): string {
  return GENERATABLE_ALCHEMY_PROPERTY_KEY_VALUES.map(
    (key) => `- ${key}: ${getAlchemyPropertyLabel(key)}`,
  ).join('\n');
}

function normalizePlan(plan: z.infer<typeof alchemyRecipePlanSchema>) {
  return {
    ...plan,
    materialVectors: plan.materialVectors.map((vector) => ({
      ...vector,
      properties: normalizeWeightedAlchemyProperties(vector.properties).slice(
        0,
        3,
      ),
    })),
    intentVector: normalizeWeightedAlchemyProperties(plan.intentVector).slice(
      0,
      3,
    ),
  };
}

export class AlchemyRecipePlanner {
  constructor(
    private readonly options: {
      timeoutMs?: number;
    } = {},
  ) {}

  async plan(input: {
    materials: PreparedAlchemyMaterial[];
    userPrompt?: string;
  }): Promise<AlchemyRecipePlan> {
    // 无 LLM Provider 时降级为规则模板规划（保证炼香功能可用），
    // 基于材料类型/品质生成确定性的属性向量，不依赖 LLM 语义分析。
    if (!hasAnyServerLlmProviderConfigured()) {
      return this.buildTemplatePlan(input.materials);
    }

    const payloadJson = stableCompactStringify({
      materials: input.materials.map((material) => ({
        materialRef: material.materialRef,
        materialName: material.name,
        type: material.type,
        rank: material.rank,
        element: material.element,
        dose: material.dose,
        description: truncateText(material.description, 64),
      })),
      userPrompt: input.userPrompt?.trim() || '',
    });

    const { system, user } = renderPrompt('alchemy-recipe-plan', {
      propertyGuide: buildPropertyGuide(),
      payloadJson,
      hasUserPrompt: input.userPrompt?.trim() ? 'true' : 'false',
    });

    let response: { output: z.infer<typeof alchemyRecipePlanSchema> };
    try {
      response = await this.withTimeout(
        generateAiObject({
          system,
          prompt: user,
          schema: alchemyRecipePlanSchema,
          name: 'AlchemyRecipePlan',
          sceneId: 'alchemy-recipe-plan',
        }),
      );
    } catch (error) {
      // glm-4-flash 等模型偶发输出破损 JSON / schema 校验失败 / 超时，
      // 降级为规则模板规划，保证炼香功能可用（与无 LLM 时同一降级策略）。
      console.warn(
        '[AlchemyRecipePlanner] LLM 规划失败，降级规则模板:',
        error instanceof Error ? error.message : String(error),
      );
      return this.buildTemplatePlan(input.materials);
    }

    const normalized = normalizePlan(response.output);
    const materialMap = new Map(
      input.materials.map((material) => [material.materialRef, material]),
    );

    if (normalized.materialVectors.length !== input.materials.length) {
      throw new Error(
        'alchemy planner returned mismatched material vector count',
      );
    }

    // [安全守卫] 检测重复的 materialRef，防止 LLM 伪造多个向量指向同一材料以操纵香性权重
    const seenRefs = new Set<string>();
    for (const vector of normalized.materialVectors) {
      if (seenRefs.has(vector.materialRef)) {
        throw new Error(
          `alchemy planner returned duplicate materialRef: ${vector.materialRef}`,
        );
      }
      seenRefs.add(vector.materialRef);
    }

    const materialVectors = normalized.materialVectors.map((vector) => {
      const material = materialMap.get(vector.materialRef);
      if (!material) {
        throw new Error(
          `alchemy planner returned unknown material ref: ${vector.materialRef}`,
        );
      }
      if (vector.properties.length === 0) {
        throw new Error(
          `alchemy planner returned empty property vector: ${vector.materialRef}`,
        );
      }
      return mergeAlchemyMaterialPropertyHints(
        {
          ...vector,
          materialName: material.name,
        },
        material,
      );
    });

    if (!input.userPrompt?.trim()) {
      normalized.intentVector = [];
      normalized.focusMode = 'balanced';
      normalized.requestedElementBias = undefined;
    }

    return {
      ...normalized,
      materialVectors,
    };
  }

  /**
   * 无 LLM 时的规则模板规划：按材料类型给出确定性的基础属性向量，
   * 品质越高权重越高，使炼香在离线环境仍可用。
   */
  private buildTemplatePlan(
    materials: PreparedAlchemyMaterial[],
  ): AlchemyRecipePlan {
    const materialVectors = materials.map((material) => {
      const baseProperties = templatePropertiesForMaterial(material);
      const qualityBias = qualityWeight(material.rank);
      const properties = baseProperties.map((key) => ({
        key,
        weight: clamp01(
          Math.min(1, 0.55 + qualityBias + (material.dose || 1) * 0.05),
        ),
      }));
      return {
        materialRef: material.materialRef,
        materialName: material.name,
        properties,
      };
    });

    return {
      materialVectors,
      intentVector: [],
      focusMode: 'balanced',
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(
          () => reject(new Error('LLM alchemy recipe plan timeout')),
          this.options.timeoutMs ?? 20_000,
        );
      }),
    ]);
  }
}

/**
 * 无 LLM 时按材料类型给出基础属性候选。
 * - herb（草木）→ 恢复 / 悟性
 * - ore（矿石）→ 护脉 / 气血
 * - monster（妖兽）→ 破境 / 洗髓
 * - tcdb（天材地宝）/ aux（辅材）→ 综合
 */
function templatePropertiesForMaterial(
  material: PreparedAlchemyMaterial,
): AlchemyPropertyKey[] {
  switch (material.type) {
    case 'herb':
      return ['restore_hp', 'restore_mp', 'insight'];
    case 'ore':
      return ['protect_meridians_support', 'body_qi_blood', 'restore_hp'];
    case 'monster':
      return ['breakthrough_support', 'marrow_wash', 'body_primordial_spirit'];
    case 'tcdb':
      return ['cultivation', 'insight', 'extend_lifespan'];
    default:
      return ['restore_hp', 'clear_mind_support'];
  }
}

const QUALITY_WEIGHT: Record<Quality, number> = {
  凡品: 0,
  灵品: 0.08,
  玄品: 0.16,
  真品: 0.24,
  地品: 0.32,
  天品: 0.4,
  仙品: 0.48,
  神品: 0.56,
};

function qualityWeight(rank: Quality): number {
  return QUALITY_WEIGHT[rank] ?? 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const alchemyRecipePlanner = new AlchemyRecipePlanner();

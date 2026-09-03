import { renderPrompt } from '@server/lib/prompts';
import { generateAiObject } from '@server/utils/aiClient';
import type { PreHeavenFate } from '@shared/types/cultivator';
import { z } from 'zod';

/**
 * fate-naming AI 接线服务。
 *
 * 原版中 fate-naming prompt 模板（fate-naming.md）已注册进 prompt registry，
 * 但从未被调用——命格命名 100% 走本地 FATE_TEXT_PRESETS 预设（死代码）。
 *
 * 本服务把该模板接入 AI 生成管线：对候选命格池批量做「命案执笔」命名，
 * 让命格名称/描述从「预设模板」升级为「契合克苏鲁世界观、贴合实际效果的
 * 天生气数」。
 *
 * 降级策略：AI 调用失败（无 API key、超时、schema 校验失败等）时，
 * 保留引擎生成的 fallbackName/fallbackDescription，仅标记
 * namingMetadata.status = 'fallback'，绝不让命名失败阻塞捏人/重塑流程。
 */

/** AI 命名单项 schema（与候选数量、顺序完全一致）。 */
const FateNamingItemSchema = z.object({
  name: z
    .string()
    .regex(/^[\u4e00-\u9fff]{3,5}$/, '名称必须是 3-5 个汉字')
    .describe('3-5 个汉字的命数名称'),
  description: z
    .string()
    .min(10)
    .max(120)
    .describe('点出此人天生被什么标记、得何助力、若带代价又如何反噬'),
  styleInsight: z
    .string()
    .max(80)
    .optional()
    .describe('命案执笔对该命数气质的一句话批注'),
});

const FateNamingResultSchema = z.object({
  candidates: z.array(FateNamingItemSchema).min(1),
});

/** 输入某个候选命格的完整事实（供 AI 提炼意象）。 */
function serializeCandidate(candidate: PreHeavenFate): unknown {
  const quality = candidate.quality ?? '普通';
  const effects = (candidate.effects ?? []).map((effect) => ({
    effectId: effect.effectId,
    scope: effect.scope,
    polarity: effect.polarity,
    effectType: effect.effectType,
    value: effect.value,
    label: effect.label,
    description: effect.description,
  }));
  const dualSided =
    candidate.generationModel?.category === 'dual_sided';
  return {
    quality,
    dualSided,
    effects,
  };
}

/**
 * 对候选命格池执行 AI 命名。
 *
 * @param fates 由 FateEngine 生成的候选命格池（含 effects、generationModel）。
 * @param candidatesJson 可选——测试/调试时可直接传入序列化 JSON 覆盖。
 * @returns 命名后的候选池；单个失败不影响整体（失败项保持 fallback 命名）。
 */
export async function applyFateNaming(
  fates: PreHeavenFate[],
  candidatesJson?: string,
): Promise<PreHeavenFate[]> {
  if (fates.length === 0) return fates;

  const serialized = candidatesJson ?? JSON.stringify({
    candidates: fates.map(serializeCandidate),
  });

  const named = await callFateNaming(serialized, fates.length);

  return fates.map((fate, index) => {
    const ai = named[index];
    if (!ai) {
      // AI 结果数量不足时，该项保持 fallback，标记 fallback。
      return {
        ...fate,
        namingMetadata: {
          status: 'fallback',
          provider: 'fate-naming',
          originalName: fate.name,
        },
      };
    }
    return {
      ...fate,
      name: ai.name,
      description: ai.description,
      namingMetadata: {
        status: 'success',
        provider: 'fate-naming',
        originalName: fate.name,
        styleInsight: ai.styleInsight,
      },
    };
  });
}

async function callFateNaming(
  candidatesJson: string,
  expectedCount: number,
): Promise<Array<{ name: string; description: string; styleInsight?: string }>> {
  try {
    const { system, user } = renderPrompt('fate-naming', { candidatesJson });
    const aiResponse = await generateAiObject({
      system,
      prompt: user,
      schema: FateNamingResultSchema,
      name: 'FateNaming',
      sceneId: 'fate-naming',
    });
    const list = aiResponse.output.candidates;
    // 强制与候选数量、顺序一致（超出截断，不足则返回现有部分）。
    return list.slice(0, expectedCount);
  } catch (error) {
    console.error('命格 AI 命名失败，降级为本地预设:', error);
    return [];
  }
}

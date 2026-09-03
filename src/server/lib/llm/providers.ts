import { createAlibaba } from '@ai-sdk/alibaba';
import { createDeepSeek, deepSeek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import {
  LLM_PROVIDER_DEFAULT_MODELS,
  type LlmProviderId,
} from '@shared/config/llm';

export interface LlmProviderDef {
  id: LlmProviderId;
  defaultModel: string;
  apiKeyEnv: string;
  create: (opts: {
    apiKey?: string;
    fetch?: typeof fetch;
  }) => (modelId: string) => LanguageModel;
}

const ALIBABA_BASE_URL =
  process.env.ALIBABA_BASE_URL?.trim() ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1';

const ZHIPU_BASE_URL =
  process.env.ZHIPU_BASE_URL?.trim() ||
  'https://open.bigmodel.cn/api/paas/v4';

export const LLM_PROVIDERS: Record<LlmProviderId, LlmProviderDef> = {
  deepseek: {
    id: 'deepseek',
    defaultModel: LLM_PROVIDER_DEFAULT_MODELS.deepseek,
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    create: ({ apiKey, fetch }) =>
      apiKey || fetch ? createDeepSeek({ apiKey, fetch }) : deepSeek,
  },
  alibaba: {
    id: 'alibaba',
    defaultModel: LLM_PROVIDER_DEFAULT_MODELS.alibaba,
    apiKeyEnv: 'ALIBABA_API_KEY',
    create: ({ apiKey, fetch }) => {
      const provider = createAlibaba({
        apiKey,
        baseURL: ALIBABA_BASE_URL,
        fetch,
      });
      return (modelId: string) => provider(modelId);
    },
  },
  zhipu: {
    id: 'zhipu',
    defaultModel: LLM_PROVIDER_DEFAULT_MODELS.zhipu,
    apiKeyEnv: 'ZHIPU_API_KEY',
    create: ({ apiKey, fetch }) => {
      const provider = createOpenAICompatible({
        name: 'zhipu',
        baseURL: ZHIPU_BASE_URL,
        apiKey,
        fetch,
        // 智谱不支持 OpenAI 结构化输出（json_schema），改用 json_object 兜底，
        // 避免 AI SDK 尝试注入 response_format.schema 导致 4xx 或吞输出。
        supportsStructuredOutputs: false,
        transformRequestBody: (body) => {
          const next: Record<string, unknown> = { ...body };
          // 关闭思考：智谱 glm-4 系列不认 reasoning_effort，需显式传 thinking.disabled，
          // 否则模型仍会输出大量 reasoning_content（既慢又烧 token）。
          if (!next.thinking) {
            next.thinking = { type: 'disabled' };
          }
          // 结构化输出：智谱仅支持 response_format.type=json_object，不支持 json_schema。
          if (!next.response_format) {
            next.response_format = { type: 'json_object' };
          } else if (
            typeof next.response_format === 'object' &&
            next.response_format !== null &&
            (next.response_format as Record<string, unknown>).type !==
              'json_object'
          ) {
            next.response_format = { type: 'json_object' };
          }
          return next;
        },
      });
      return (modelId: string) => provider(modelId);
    },
  },
};

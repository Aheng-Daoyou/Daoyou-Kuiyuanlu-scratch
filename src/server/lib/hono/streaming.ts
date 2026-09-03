import type { AppEnv } from '@server/lib/hono/types';
import type { Context } from 'hono';
import { streamSSE, type SSEStreamingApi } from 'hono/streaming';

export type SseEventHandler = (
  stream: SSEStreamingApi,
  isAborted: () => boolean,
) => Promise<void>;

/**
 * Wraps Hono's streamSSE with a shared client-disconnect signal.
 *
 * The returned handler receives an isAborted() helper that flips to true when
 * either the incoming request is aborted or Hono cancels the response stream.
 * Callers should use it to stop streaming work that no longer has a consumer.
 */
export function streamSseEvents(
  c: Context<AppEnv>,
  handler: SseEventHandler,
): Response {
  let aborted = false;
  const markAborted = () => {
    aborted = true;
  };

  if (c.req.raw.signal.aborted) {
    aborted = true;
  } else {
    c.req.raw.signal.addEventListener('abort', markAborted, { once: true });
  }

  return streamSSE(c, async (stream) => {
    stream.onAbort(markAborted);
    // 立即写入一个心跳注释帧（SSE 规范 `: comment`，客户端会忽略）：
    // 连接建立即重置服务器空闲计时器，避免 LLM 首个 token 到达前
    // （glm-4-flash TTFB 可达 ~15s）因无数据帧被 Bun idleTimeout 掐断。
    try {
      await stream.write(': ping\n\n');
    } catch {
      // 客户端已断开，忽略写入失败
    }
    if (!aborted) {
      await handler(stream, () => aborted);
    }
  });
}

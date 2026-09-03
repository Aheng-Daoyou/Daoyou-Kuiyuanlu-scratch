/**
 * 副本 SSE 流式响应消费器。
 *
 * 服务端在 Accept: text/event-stream 时推送三类事件：
 * - { type: 'narrative', text }  回合叙事（累积式全量文本，直接替换展示）
 * - { type: 'result', data }     最终结果（payload 与原 JSON 响应一致）
 * - { type: 'error', error, status?, code? } 失败
 */

export type DungeonStreamEvent =
  | { type: 'narrative'; text: string }
  | { type: 'result'; data: unknown }
  | { type: 'error'; error: string; status?: number; code?: string };

export interface DungeonStreamHandlers {
  onNarrative?: (text: string) => void;
  onError?: (message: string) => void;
}

/** 解析 SSE 响应流，返回最终 result 事件携带的 payload */
export async function consumeDungeonStream<T>(
  response: Response,
  handlers: DungeonStreamHandlers = {},
): Promise<T> {
  if (!response.body) {
    throw new Error('副本响应流为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | undefined;
  let receivedResult = false;
  let streamError: string | null = null;

  const handleEvent = (event: DungeonStreamEvent) => {
    if (event.type === 'narrative') {
      handlers.onNarrative?.(event.text);
      return;
    }
    if (event.type === 'result') {
      receivedResult = true;
      result = event.data as T;
      return;
    }
    streamError = event.error || '副本推演失败';
    handlers.onError?.(streamError);
  };

  const flushBuffer = () => {
    const segments = buffer.split('\n\n');
    buffer = segments.pop() ?? '';
    for (const segment of segments) {
      const data = segment
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .join('\n')
        .trim();
      if (!data || data === '[DONE]') continue;
      try {
        handleEvent(JSON.parse(data) as DungeonStreamEvent);
      } catch {
        // 单帧解析失败不中断整体流
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flushBuffer();
  }
  buffer += decoder.decode();
  flushBuffer();

  if (streamError) {
    throw new Error(streamError);
  }
  if (!receivedResult) {
    throw new Error('副本推演结果解析失败');
  }
  return result as T;
}

/** 判断响应是否为 SSE 流 */
export function isDungeonStreamResponse(response: Response): boolean {
  return Boolean(
    response.headers.get('content-type')?.includes('text/event-stream'),
  );
}

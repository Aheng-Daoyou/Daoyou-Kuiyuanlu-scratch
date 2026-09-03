import { useInkUI } from '@app/components/providers/InkUIProvider';
import { consumeResourceMutation } from '@app/lib/resources/mutations';
import type {
  DungeonOption,
  DungeonRecoverAction,
  DungeonState,
} from '@shared/lib/dungeon/types';
import { useState } from 'react';
import {
  consumeDungeonStream,
  isDungeonStreamResponse,
} from './dungeonStream';

function createActionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function readDungeonMutation<T>(
  response: Response,
): Promise<T | { conflict: true; message?: string }> {
  const data = await response.json();
  if (!response.ok || data.error) {
    if (response.status === 409) {
      return { conflict: true, message: data.message || data.error };
    }
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  if (!data.success || !data.state) {
    throw new Error('副本状态响应协议无效');
  }
  return consumeResourceMutation<T>(data);
}

/** SSE 模式下 result 事件 payload 的校验与资源变更消费（与 readDungeonMutation 同语义） */
async function readDungeonStreamResult<T>(
  data: unknown,
): Promise<T | { conflict: true; message?: string }> {
  const payload = data as {
    error?: string;
    message?: string;
    success?: boolean;
    state?: unknown;
  };
  if (payload?.error) {
    throw new Error(payload.message || payload.error);
  }
  if (!payload?.success || !payload?.state) {
    throw new Error('副本状态响应协议无效');
  }
  return consumeResourceMutation<T>(payload as never);
}

/**
 * 副本操作Hook
 * 负责处理副本相关的操作（启动、选择选项、退出）
 */
export function useDungeonActions() {
  const { pushToast, openDialog } = useInkUI();
  const [processing, setProcessing] = useState(false);

  /**
   * 启动副本
   */
  const startDungeon = async (
    nodeId: string,
    onNarrative?: (text: string) => void,
  ) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/dungeon/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          mapNodeId: nodeId,
        }),
      });

      if (res.ok && isDungeonStreamResponse(res)) {
        const raw = await consumeDungeonStream<unknown>(res, { onNarrative });
        const data = await readDungeonStreamResult<{ state?: DungeonState }>(
          raw,
        );
        if ('conflict' in data) {
          throw new Error(data.message ?? '启动秘境失败');
        }
        pushToast({ message: '秘境已开启', tone: 'success' });
        return data.state;
      }

      const data = await readDungeonMutation<{ state?: DungeonState }>(res);
      if ('conflict' in data) {
        throw new Error(data.message ?? '启动秘境失败');
      }

      pushToast({ message: '秘境已开启', tone: 'success' });
      return data.state;
    } catch (e) {
      pushToast({
        message: e instanceof Error ? e.message : '启动秘境失败',
        tone: 'danger',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 执行选项
   */
  const performAction = async (
    option: DungeonOption,
    onNarrative?: (text: string) => void,
  ) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/dungeon/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          choiceId: option.id,
          actionId: createActionId(),
        }),
      });

      if (res.ok && isDungeonStreamResponse(res)) {
        const raw = await consumeDungeonStream<unknown>(res, { onNarrative });
        return await readDungeonStreamResult(raw);
      }

      return await readDungeonMutation(res);
    } catch (e) {
      pushToast({
        message: e instanceof Error ? e.message : '操作失败',
        tone: 'danger',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 退出副本
   */
  const quitDungeon = () => {
    return new Promise<boolean>((resolve) => {
      openDialog({
        title: '放弃探索',
        content:
          '确定要放弃当前探索吗？放弃后无法获得任何奖励，且本轮进度将丢失。',
        confirmLabel: '确认放弃',
        cancelLabel: '取消',
        onConfirm: async () => {
          try {
            setProcessing(true);
            const res = await fetch('/api/dungeon/quit', { method: 'POST' });
            const data =
              await readDungeonMutation<{ state?: DungeonState }>(res);
            if ('conflict' in data) {
              throw new Error(data.message ?? '放弃失败');
            }

            pushToast({ message: '已放弃探索', tone: 'success' });
            resolve(true);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            pushToast({ message: '操作失败', tone: 'danger' });
            resolve(false);
          } finally {
            setProcessing(false);
          }
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
  };

  /**
   * 战后休整：继续探索
   */
  const continueLooting = async (onNarrative?: (text: string) => void) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/dungeon/looting/continue', {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
      });
      if (res.ok && isDungeonStreamResponse(res)) {
        const raw = await consumeDungeonStream<unknown>(res, { onNarrative });
        return await readDungeonStreamResult(raw);
      }
      return await readDungeonMutation(res);
    } catch (e) {
      pushToast({ message: e instanceof Error ? e.message : '操作失败', tone: 'danger' });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 战后休整：离开秘境
   */
  const escapeLooting = async (onNarrative?: (text: string) => void) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/dungeon/looting/escape', {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
      });
      if (res.ok && isDungeonStreamResponse(res)) {
        const raw = await consumeDungeonStream<unknown>(res, { onNarrative });
        return await readDungeonStreamResult(raw);
      }
      return await readDungeonMutation(res);
    } catch (e) {
      pushToast({ message: e instanceof Error ? e.message : '操作失败', tone: 'danger' });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const recoverDungeon = async (
    action: DungeonRecoverAction,
    onNarrative?: (text: string) => void,
  ) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/dungeon/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok && isDungeonStreamResponse(res)) {
        const raw = await consumeDungeonStream<unknown>(res, { onNarrative });
        return await readDungeonStreamResult(raw);
      }
      return await readDungeonMutation(res);
    } catch (e) {
      pushToast({
        message: e instanceof Error ? e.message : '副本恢复失败',
        tone: 'danger',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  return {
    startDungeon,
    performAction,
    continueLooting,
    escapeLooting,
    recoverDungeon,
    quitDungeon,
    processing,
  };
}

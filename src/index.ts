import { websocket } from 'hono/bun';
import app from './server/app';
import { registerInternalCronJobs } from './server/lib/jobs/internalCronScheduler';
import {
  registerMessageInfrastructure,
  shutdownMessageInfrastructure,
} from './server/lib/mq/domainEventRegistry';
import {
  startOnlineBattleRuntime,
  stopOnlineBattleRuntime,
} from './server/lib/services/onlineBattleRuntime';

await registerMessageInfrastructure();
await startOnlineBattleRuntime();
registerInternalCronJobs({ enabled: import.meta.env.PROD });

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info('[runtime] graceful shutdown started', { signal });
  await stopOnlineBattleRuntime();
  await shutdownMessageInfrastructure();
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

export default {
  port: Number(process.env.PORT ?? 3000),
  // SSE 推演依赖长连接：LLM 首个 token 到达前（glm-4-flash TTFB 可达 ~15s）
  // 连接处于"空闲"状态，Bun 默认 idleTimeout=10s 会掐断连接导致
  // 「秘境推演中断 / The connection was closed」。放宽到 120s 覆盖 LLM 最长生成时间。
  idleTimeout: 120,
  fetch(request: Request, server: unknown) {
    return app.fetch(request, { server });
  },
  websocket,
};

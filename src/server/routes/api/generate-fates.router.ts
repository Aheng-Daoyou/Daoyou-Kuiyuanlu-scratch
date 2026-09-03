import { requireUser } from '@server/lib/hono/middleware';
import type { AppEnv } from '@server/lib/hono/types';
import { FATE_REROLL_LIMIT } from '@server/lib/services/FateConfig';
import { FateEngine } from '@server/lib/services/FateEngine';
import { applyFateNaming } from '@server/lib/services/FateNamingService';
import {
  checkAndIncrementReroll,
  getTempCharacter,
  getTempFates,
  saveTempFates,
} from '@server/lib/repositories/redisCultivatorRepository';
import { Hono } from 'hono';
import { z } from 'zod';

const GenerateFatesSchema = z.object({
  tempId: z.string().min(1),
});

const router = new Hono<AppEnv>();

router.post('/', requireUser(), async (c) => {
  const parsed = GenerateFatesSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ success: false, error: '请求参数格式错误' }, 400);
  }

  const { tempId } = parsed.data;
  const cultivator = await getTempCharacter(tempId);
  if (!cultivator) {
    return c.json({ success: false, error: '角色推演已过期，请重新生成。' }, 404);
  }

  const previousFates = await getTempFates(tempId);
  let remainingRerolls = FATE_REROLL_LIMIT;

  if (previousFates && previousFates.length > 0) {
    const rerollCheck = await checkAndIncrementReroll(tempId, FATE_REROLL_LIMIT);
    if (!rerollCheck.allowed) {
      return c.json(
        {
          success: false,
          error: `逆天改命次数已尽（最多 ${FATE_REROLL_LIMIT} 次）`,
        },
        400,
      );
    }

    remainingRerolls = rerollCheck.remaining;
  }

  const fates = await FateEngine.generateCandidatePool();
  // 命案执笔 AI 命名：为候选命格批量起名/补全描述，失败自动降级为本地预设。
  const namedFates = await applyFateNaming(fates);
  await saveTempFates(tempId, namedFates);

  return c.json({
    success: true,
    data: {
      fates: namedFates,
      remainingRerolls,
    },
  });
});

export default router;

import { getExecutor } from '@server/lib/drizzle/db';
import { invitationLamps } from '@server/lib/drizzle/schema';
import { requireAdmin } from '@server/lib/hono/middleware';
import type { AppEnv } from '@server/lib/hono/types';
import {
  generateInvitationCode,
  isValidInvitationCodeFormat,
  normalizeInvitationCode,
} from '@server/lib/invitation/code';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

const CreateInvitationLampSchema = z
  .object({
    code: z.string().trim().max(40).optional(),
    referrerUserId: z.string().trim().uuid().nullable().optional(),
    note: z.string().trim().max(200).optional(),
    totalLimit: z.number().int().min(1).max(100000).optional(),
    expiresAt: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.expiresAt && Number.isNaN(new Date(value.expiresAt).getTime())) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: '过期时间格式错误',
      });
    }
  });

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string };
  return maybe.code === '23505';
}

async function createWithAutoCode(params: {
  referrerUserId: string | null;
  note: string | null;
  totalLimit: number;
  expiresAt: Date | null;
  userId: string;
}) {
  const q = getExecutor();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInvitationCode();
    try {
      const [inserted] = await q
        .insert(invitationLamps)
        .values({
          code,
          referrerUserId: params.referrerUserId,
          note: params.note,
          totalLimit: params.totalLimit,
          expiresAt: params.expiresAt,
          status: 'active',
          createdBy: params.userId,
        })
        .returning();
      return inserted;
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  throw new Error('自动生成灯引失败，请重试');
}

const router = new Hono<AppEnv>();

router.get('/', requireAdmin(), async (c) => {
  const q = getExecutor();
  const status = c.req.query('status');
  const whereConditions: SQL<unknown>[] = [];

  if (status === 'active' || status === 'disabled') {
    whereConditions.push(eq(invitationLamps.status, status));
  }

  const items = await q.query.invitationLamps.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    orderBy: [desc(invitationLamps.createdAt)],
  });

  return c.json({ invitationLamps: items });
});

router.post('/', requireAdmin(), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: '未授权访问' }, 401);
  }

  const q = getExecutor();
  const body = await c.req.json().catch(() => null);
  const parsed = CreateInvitationLampSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: '参数错误', details: parsed.error.flatten() },
      400,
    );
  }

  const manualCode = parsed.data.code
    ? normalizeInvitationCode(parsed.data.code)
    : '';
  const referrerUserId = parsed.data.referrerUserId ?? null;
  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
  const totalLimit = parsed.data.totalLimit ?? 1;
  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : null;

  try {
    if (manualCode) {
      if (!isValidInvitationCodeFormat(manualCode)) {
        return c.json(
          { error: '灯引格式错误，仅支持 4-4 位大写字母数字（如 ABCD-EFGH）' },
          400,
        );
      }

      const [inserted] = await q
        .insert(invitationLamps)
        .values({
          code: manualCode,
          referrerUserId,
          note,
          totalLimit,
          expiresAt,
          status: 'active',
          createdBy: user.id,
        })
        .returning();

      return c.json({ success: true, invitationLamp: inserted });
    }

    const inserted = await createWithAutoCode({
      referrerUserId,
      note,
      totalLimit,
      expiresAt,
      userId: user.id,
    });

    return c.json({ success: true, invitationLamp: inserted });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ error: '灯引码已存在' }, 409);
    }

    console.error('Create invitation lamp error:', error);
    return c.json({ error: '创建灯引失败' }, 500);
  }
});

router.post('/:id/toggle', requireAdmin(), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: '未授权访问' }, 401);
  }

  const q = getExecutor();
  const id = c.req.param('id');
  const item = await q.query.invitationLamps.findFirst({
    where: eq(invitationLamps.id, id),
  });

  if (!item) {
    return c.json({ error: '灯引不存在' }, 404);
  }

  const nextStatus = item.status === 'active' ? 'disabled' : 'active';
  const [updated] = await q
    .update(invitationLamps)
    .set({ status: nextStatus })
    .where(eq(invitationLamps.id, item.id))
    .returning();

  return c.json({ success: true, invitationLamp: updated });
});

export default router;

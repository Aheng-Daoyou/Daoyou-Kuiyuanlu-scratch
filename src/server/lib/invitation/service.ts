import { invitationLamps } from '@server/lib/drizzle/schema';
import {
  getExecutor,
  type DbExecutor,
} from '@server/lib/drizzle/db';
import { eq } from 'drizzle-orm';
import { normalizeInvitationCode } from './code';

export type InvitationLampValidation =
  | { status: 'valid'; code: string }
  | { status: 'invalid'; reason: 'not_found' | 'disabled' | 'exhausted' | 'expired' };

const INVALID_MESSAGE_BY_REASON: Record<
  Extract<InvitationLampValidation, { status: 'invalid' }>['reason'],
  string
> = {
  not_found: '灯引不存在或无效',
  disabled: '该灯引已被停用',
  exhausted: '该灯引已用完引荐次数',
  expired: '该灯引已过期',
};

export function invitationErrorMessage(
  validation: InvitationLampValidation,
): string {
  if (validation.status === 'valid') {
    return '';
  }
  return INVALID_MESSAGE_BY_REASON[validation.reason];
}

/**
 * 校验一枚灯引码是否「当前有效」。
 * 仅用于纯校验（不消耗）。若 code 为空则视为未填写，直接返回 valid（选填门槛）。
 */
export async function validateInvitationCode(
  rawCode: string | null | undefined,
): Promise<InvitationLampValidation> {
  const code = normalizeInvitationCode(rawCode ?? '');
  if (!code) {
    return { status: 'valid', code: '' };
  }

  const q = getExecutor();
  const lamp = await q.query.invitationLamps.findFirst({
    where: eq(invitationLamps.code, code),
  });

  if (!lamp) {
    return { status: 'invalid', reason: 'not_found' };
  }
  if (lamp.status !== 'active') {
    return { status: 'invalid', reason: 'disabled' };
  }
  if (lamp.usedCount >= lamp.totalLimit) {
    return { status: 'invalid', reason: 'exhausted' };
  }
  if (lamp.expiresAt && new Date(lamp.expiresAt).getTime() < Date.now()) {
    return { status: 'invalid', reason: 'expired' };
  }

  return { status: 'valid', code };
}

/**
 * 原子校验并消耗一枚灯引（注册门槛校验点）。
 * 事务内 SELECT FOR UPDATE 锁定该码，校验有效后 usedCount+1。
 * 若 code 为空（未填写）则直接通过，不消耗。
 */
export async function consumeInvitationLamp(
  rawCode: string | null | undefined,
  executor: DbExecutor = getExecutor(),
): Promise<InvitationLampValidation> {
  const code = normalizeInvitationCode(rawCode ?? '');
  if (!code) {
    return { status: 'valid', code: '' };
  }

  return executor.transaction(async (tx) => {
    const lamp = await tx.query.invitationLamps.findFirst({
      where: eq(invitationLamps.code, code),
    });

    if (!lamp) {
      return { status: 'invalid', reason: 'not_found' };
    }
    if (lamp.status !== 'active') {
      return { status: 'invalid', reason: 'disabled' };
    }
    if (lamp.usedCount >= lamp.totalLimit) {
      return { status: 'invalid', reason: 'exhausted' };
    }
    if (lamp.expiresAt && new Date(lamp.expiresAt).getTime() < Date.now()) {
      return { status: 'invalid', reason: 'expired' };
    }

    await tx
      .update(invitationLamps)
      .set({
        usedCount: lamp.usedCount + 1,
        usedAt: new Date(),
      })
      .where(eq(invitationLamps.id, lamp.id));

    return { status: 'valid', code };
  });
}

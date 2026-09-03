import { getExecutor, type DbExecutor, type DbTransaction } from '@server/lib/drizzle/db';
import { cultivators } from '@server/lib/drizzle/schema';
import {
  createDebt,
  listActiveDebts,
  listDebts,
  listOverdueActiveDebts,
  markDebtDefaulted,
  settleDebt,
} from '@server/lib/repositories/DebtRepository';
import { updateCultivator, updateLifespan, updateSpiritStones } from '@server/lib/services/cultivator/CultivatorStateRepository';
import {
  buildDefaultConsequence,
  collateralLifespanCost,
  computeOutstanding,
  type DebtCollateral,
  type DebtCreditor,
  type DebtRecord,
} from '@shared/lib/debt';
import { and, eq } from 'drizzle-orm';

export type DebtActor = { userId: string; cultivatorId: string };

export class DebtServiceError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 = 400) {
    super(message);
  }
}

export interface IncurDebtInput {
  creditor: DebtCreditor;
  collateral: DebtCollateral;
  principal: number;
  annualInterestRate: number;
  /** 借期天数，到期未清进入违约。 */
  termDays: number;
}

/** 立债：以「过去」作抵押换取灯油券信用。 */
export async function incurDebt(
  actor: DebtActor,
  input: IncurDebtInput,
): Promise<DebtRecord> {
  if (input.principal <= 0) {
    throw new DebtServiceError('记债本金必须为正');
  }
  if (input.annualInterestRate < 0) {
    throw new DebtServiceError('记债利率不得为负');
  }
  if (input.termDays <= 0) {
    throw new DebtServiceError('记债借期必须为正');
  }

  await assertActiveCultivator(actor);
  const now = new Date();
  const dueAt = new Date(now.getTime() + input.termDays * 24 * 60 * 60 * 1000);

  const debt = await getExecutor().transaction(async (tx) => {
    // 记债入账：本金即时兑现为灯油券（发放给玩家）。
    await updateSpiritStones(actor.userId, actor.cultivatorId, input.principal, tx);
    return createDebt(
      {
        cultivatorId: actor.cultivatorId,
        creditor: input.creditor,
        collateral: input.collateral,
        principal: input.principal,
        outstanding: input.principal,
        annualInterestRate: input.annualInterestRate,
        dueAt,
      },
      tx,
    );
  });

  return debt;
}

/** 清债：以灯油券一次性清偿未结余额（含利息）。 */
export async function settleOutstandingDebt(
  actor: DebtActor,
  debtId: string,
): Promise<void> {
  const debt = await findDebt(actor.cultivatorId, debtId);
  if (debt.status !== 'active') {
    throw new DebtServiceError('该记债已结清或已违约', 409);
  }

  const outstanding = computeOutstanding(
    debt.principal,
    debt.annualInterestRate,
    new Date(debt.incurredAt),
    new Date(),
  );

  await getExecutor().transaction(async (tx) => {
    // 扣减灯油券后标记结清（原子）。
    await updateSpiritStones(actor.userId, actor.cultivatorId, -outstanding, tx);
    await settleDebt(tx, debtId);
  });
}

/** 违约结算：将到期的 active 记债全部标记违约，并落地违约后果。 */
export async function processOverdueDebts(now: Date = new Date()): Promise<number> {
  const overdue = await listOverdueActiveDebts(now);
  let settledCount = 0;

  for (const debt of overdue) {
    const consequence = buildDefaultConsequence(debt.collateral, {
      lifespanYears: collateralLifespanCost(debt.collateral),
    });
    const [row] = await getExecutor()
      .select({ userId: cultivators.userId })
      .from(cultivators)
      .where(eq(cultivators.id, debt.cultivatorId))
      .limit(1);
    if (!row) continue;

    await getExecutor().transaction(async (tx) => {
      await applyDefaultConsequence(row.userId, debt, consequence, tx);
      await markDebtDefaulted(tx, debt.id, consequence);
    });
    settledCount += 1;
  }

  return settledCount;
}

/** 落地违约后果（引擎判定）：寿元直接扣减，名字改写为讳名。 */
async function applyDefaultConsequence(
  userId: string,
  debt: DebtRecord,
  consequence: ReturnType<typeof buildDefaultConsequence>,
  tx: DbTransaction,
): Promise<void> {
  switch (debt.collateral) {
    case 'lifespan': {
      const years = consequence.effect.lifespanYears ?? 0;
      if (years > 0) {
        await updateLifespan(userId, debt.cultivatorId, -years, tx);
      }
      break;
    }
    case 'name': {
      // 名字被「抹去」：改写为讳名样式（保留一个可识别的残缺形态）。
      const [row] = await tx
        .select({ name: cultivators.name })
        .from(cultivators)
        .where(eq(cultivators.id, debt.cultivatorId))
        .limit(1);
      if (row?.name) {
        await updateCultivator(
          debt.cultivatorId,
          { name: maskName(row.name) },
          tx,
        );
      }
      break;
    }
    case 'memory':
    case 'bond':
      // 记忆 / 关系：暂不落数值字段，后果以「异化叙事」形式记录在后果快照中。
      // 后续可接入异化特质 / 好友系统 / 神智持久轴后落地。
      break;
  }
}

/** 讳名：名字被抹去后的残缺形态（「林阿四」→「林□四」）。 */
function maskName(name: string): string {
  const chars = Array.from(name);
  if (chars.length <= 1) return '□';
  const masked = chars.slice();
  const mid = Math.floor(chars.length / 2);
  masked[mid] = '□';
  return masked.join('');
}

/** 查询单个记债（校验归属）。 */
async function findDebt(cultivatorId: string, debtId: string): Promise<DebtRecord> {
  const debts = await listDebts(cultivatorId);
  const debt = debts.find((item) => item.id === debtId);
  if (!debt) throw new DebtServiceError('未找到该记债', 404);
  return debt;
}

async function assertActiveCultivator(
  actor: DebtActor,
  q: DbExecutor | DbTransaction = getExecutor(),
): Promise<void> {
  const [row] = await q
    .select({ id: cultivators.id })
    .from(cultivators)
    .where(
      and(
        eq(cultivators.id, actor.cultivatorId),
        eq(cultivators.userId, actor.userId),
        eq(cultivators.status, 'active'),
      ),
    )
    .limit(1);
  if (!row) throw new DebtServiceError('当前没有可用的活跃角色', 404);
}

export async function getActiveDebts(actor: DebtActor): Promise<DebtRecord[]> {
  await assertActiveCultivator(actor);
  return listActiveDebts(actor.cultivatorId);
}

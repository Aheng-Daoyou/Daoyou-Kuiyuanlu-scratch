import {
  getExecutor,
  type DbExecutor,
  type DbTransaction,
} from '@server/lib/drizzle/db';
import { debtLedgers } from '@server/lib/drizzle/schema';
import type {
  DebtCollateral,
  DebtCreditor,
  DebtDefaultConsequence,
  DebtRecord,
  DebtStatus,
} from '@shared/lib/debt';
import { and, desc, eq } from 'drizzle-orm';

function mapRow(row: typeof debtLedgers.$inferSelect): DebtRecord {
  return {
    id: row.id,
    cultivatorId: row.cultivatorId,
    creditor: row.creditor as DebtCreditor,
    collateral: row.collateral as DebtCollateral,
    principal: row.principal,
    outstanding: row.outstanding,
    annualInterestRate: row.annual_interest_rate,
    status: row.status as DebtStatus,
    incurredAt: row.incurred_at.toISOString(),
    dueAt: row.due_at.toISOString(),
    defaultConsequence: row.default_consequence as DebtDefaultConsequence | undefined,
    settledAt: row.settled_at?.toISOString(),
    version: row.version,
  };
}

export interface CreateDebtInput {
  cultivatorId: string;
  creditor: DebtCreditor;
  collateral: DebtCollateral;
  principal: number;
  outstanding: number;
  annualInterestRate: number;
  dueAt: Date;
}

/** 立债：向台账写入一笔记债。 */
export async function createDebt(
  input: CreateDebtInput,
  q: DbExecutor | DbTransaction = getExecutor(),
): Promise<DebtRecord> {
  const [row] = await q
    .insert(debtLedgers)
    .values({
      cultivatorId: input.cultivatorId,
      creditor: input.creditor,
      collateral: input.collateral,
      principal: input.principal,
      outstanding: input.outstanding,
      annual_interest_rate: input.annualInterestRate,
      due_at: input.dueAt,
    })
    .returning();
  if (!row) throw new Error('立债失败');
  return mapRow(row);
}

/** 查询某角色所有未清记债（active）。 */
export async function listActiveDebts(
  cultivatorId: string,
  q: DbExecutor | DbTransaction = getExecutor(),
): Promise<DebtRecord[]> {
  const rows = await q
    .select()
    .from(debtLedgers)
    .where(
      and(
        eq(debtLedgers.cultivatorId, cultivatorId),
        eq(debtLedgers.status, 'active'),
      ),
    )
    .orderBy(desc(debtLedgers.due_at));
  return rows.map(mapRow);
}

/** 查询某角色全部记债（含已清/违约）。 */
export async function listDebts(
  cultivatorId: string,
  q: DbExecutor | DbTransaction = getExecutor(),
): Promise<DebtRecord[]> {
  const rows = await q
    .select()
    .from(debtLedgers)
    .where(eq(debtLedgers.cultivatorId, cultivatorId))
    .orderBy(desc(debtLedgers.incurred_at));
  return rows.map(mapRow);
}

/** 查询所有到期的 active 记债（供违约检查 cron 批量处理）。 */
export async function listOverdueActiveDebts(
  now: Date,
  q: DbExecutor | DbTransaction = getExecutor(),
): Promise<DebtRecord[]> {
  const rows = await q
    .select()
    .from(debtLedgers)
    .where(eq(debtLedgers.status, 'active'));
  // 过滤到期（确定性判断，避免依赖 DB 时钟差异）
  return rows
    .map(mapRow)
    .filter((debt) => new Date(debt.dueAt).getTime() <= now.getTime());
}

/** 清债：将一笔 active 记债标记为 settled。 */
export async function settleDebt(
  tx: DbTransaction,
  debtId: string,
): Promise<void> {
  await tx
    .update(debtLedgers)
    .set({
      status: 'settled',
      outstanding: 0,
      settled_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(debtLedgers.id, debtId));
}

/** 违约：将一笔 active 记债标记为 defaulted，并写入违约后果快照。 */
export async function markDebtDefaulted(
  tx: DbTransaction,
  debtId: string,
  consequence: DebtDefaultConsequence,
): Promise<void> {
  await tx
    .update(debtLedgers)
    .set({
      status: 'defaulted',
      default_consequence: consequence,
      updated_at: new Date(),
    })
    .where(eq(debtLedgers.id, debtId));
}

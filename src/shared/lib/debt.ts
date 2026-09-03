/**
 * 记债系统领域模型（窥渊录）
 *
 * 记债 = 无灯巷 / 鬼市流通的高风险信用，玩家以自身「过去」为抵押换取。
 * 核心张力（框架第十九节）：欠债不还的后果不是催收，而是「你抵押的那样东西先一步不辞而别」。
 *
 * 引擎判定边界：
 * - 抵押品类型、利率、到期、违约判定、清债金额全部由本模块的纯函数确定。
 * - 违约后果的「描述」由本模块生成，「实际生效」由 service 层落地（减寿元 / 改名字等）。
 * - AI 不参与任何判定，只可能在将来为违约事件写一段「不辞而别」的叙事文案。
 */

/** 抵押品类型：玩家押出去的那一部分「过去」。 */
export type DebtCollateral = 'memory' | 'lifespan' | 'name' | 'bond';

/** 债主：记债的发放方。 */
export type DebtCreditor =
  | 'black_alley' // 无灯巷（黑市）
  | 'ghost_market' // 鬼市大集（拍卖行）
  | 'sect_renewal'; // 幽都续灯（复活）

/** 债项状态。 */
export type DebtStatus = 'active' | 'settled' | 'defaulted';

/** 违约后果描述：抵押品「不辞而别」时发生了什么（引擎生成，供叙事层使用）。 */
export interface DebtDefaultConsequence {
  /** 后果类别，与抵押品一一对应。 */
  kind: DebtCollateral;
  /** 已确定的、可落地的数值后果（寿元扣减等）。 */
  effect: {
    /** 寿元抵押：扣减的寿元年数。 */
    lifespanYears?: number;
    /** 名字抵押：名字被改写后的样式（讳名，如「□□」）。 */
    nameStyle?: 'erased' | 'scrambled';
    /** 记忆抵押：损失的一段「记忆」的叙事标签（供异化特质 / 命数记录）。 */
    memoryLabel?: string;
    /** 关系抵押：被忘川抹除的关系叙事标签。 */
    bondLabel?: string;
  };
  /** 面向玩家的叙事摘要（不包含数值，可由 AI 扩写）。 */
  narrative: string;
}

/** 一笔记债。 */
export interface DebtRecord {
  id: string;
  cultivatorId: string;
  creditor: DebtCreditor;
  collateral: DebtCollateral;
  /** 本金（以灯油券计）。 */
  principal: number;
  /** 未清偿余额（含未结利息，由引擎累计）。 */
  outstanding: number;
  /** 年化利率（记债为负道德设计，允许高利率）。 */
  annualInterestRate: number;
  status: DebtStatus;
  /** 立债时间。 */
  incurredAt: string;
  /** 到期时间；到期未清则进入违约。 */
  dueAt: string;
  /** 违约后果快照（违约时生成）。 */
  defaultConsequence?: DebtDefaultConsequence;
  settledAt?: string;
  version: number;
}

/** 抵押品对应的违约后果元数据（纯描述，不含具体数值）。 */
const COLLATERAL_META: Record<
  DebtCollateral,
  { label: string; narrative: string }
> = {
  memory: {
    label: '一段记忆',
    narrative: '你发现自己想不起某段本该牢记的旧事，像是被谁提前取走了。',
  },
  lifespan: {
    label: '寿元',
    narrative: '镜中的你忽然老去几岁，鬓角多出一缕不该有的白。',
  },
  name: {
    label: '名字',
    narrative: '有人唤你的名字，你却一时想不起那个字该作何书写。',
  },
  bond: {
    label: '一段关系',
    narrative: '你记得曾与某人相熟，却再也想不起那人的脸，连名字都只是空白。',
  },
};

/**
 * 判定一笔债是否已经逾期（当前时间 >= 到期时间）。
 * 纯函数，便于单测与 cron 复用。
 */
export function isDebtOverdue(debt: Pick<DebtRecord, 'dueAt' | 'status'>, now: Date): boolean {
  if (debt.status !== 'active') return false;
  return now.getTime() >= new Date(debt.dueAt).getTime();
}

/**
 * 计算到期时应清偿的总额（本金 + 单利利息）。
 * 记债使用单利：outstanding = principal * (1 + rate * years)。
 * years 不足一年按一年计（鬼市从不亏待债主）。
 */
export function computeOutstanding(
  principal: number,
  annualInterestRate: number,
  incurredAt: Date,
  now: Date,
): number {
  const years = Math.max(1, (now.getTime() - incurredAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.ceil(principal * (1 + annualInterestRate * years));
}

/**
 * 生成违约后果（引擎判定，抵押品不同后果不同）。
 * 只描述「不辞而别」的确定性后果，不含 AI 叙事。
 */
export function buildDefaultConsequence(
  collateral: DebtCollateral,
  opts: { lifespanYears?: number } = {},
): DebtDefaultConsequence {
  const meta = COLLATERAL_META[collateral];
  switch (collateral) {
    case 'memory':
      return {
        kind: 'memory',
        effect: { memoryLabel: meta.label },
        narrative: meta.narrative,
      };
    case 'lifespan':
      return {
        kind: 'lifespan',
        effect: { lifespanYears: opts.lifespanYears ?? 5 },
        narrative: meta.narrative,
      };
    case 'name':
      return {
        kind: 'name',
        effect: { nameStyle: 'scrambled' },
        narrative: meta.narrative,
      };
    case 'bond':
      return {
        kind: 'bond',
        effect: { bondLabel: meta.label },
        narrative: meta.narrative,
      };
  }
}

/** 抵押品标签（展示用）。 */
export function collateralLabel(collateral: DebtCollateral): string {
  return COLLATERAL_META[collateral].label;
}

/** 债主标签（展示用）。 */
export function creditorLabel(creditor: DebtCreditor): string {
  switch (creditor) {
    case 'black_alley':
      return '无灯巷';
    case 'ghost_market':
      return '鬼市大集';
    case 'sect_renewal':
      return '幽都续灯';
  }
}

/** 抵押品对应的违约寿命扣减（引擎硬编码，不同抵押品权重不同）。 */
export function collateralLifespanCost(collateral: DebtCollateral): number {
  switch (collateral) {
    case 'lifespan':
      return 5;
    case 'memory':
      return 0;
    case 'name':
      return 0;
    case 'bond':
      return 0;
  }
}

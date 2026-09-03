export const QI_MAX = 200;
export const QI_NATURAL_RESTORE_PER_HOUR = 10;
export const QI_NATURAL_RESTORE_INTERVAL_MS = 60 * 60 * 1000;
export const QI_OVERFLOW_MAX = 300;
export const QI_DAILY_RESTORE_ITEM_LIMIT = 3;
export const QI_REFRESH_TIMEZONE = 'Asia/Shanghai';

export const QI_ACTION_COSTS = {
  dungeon_start: 50,
  retreat_10_years: 4,
  breakthrough_attempt: 20,
  // 制香会按本炉原始香蕴动态计费；这里仅保留最低消耗作为通用兜底。
  alchemy_improvised: 1,
  alchemy_formula: 1,
  creation_artifact: 8,
  creation_gongfa: 8,
  creation_skill: 8,
  marrow_wash_breakthrough: 20,
  market_identify: 1,
  black_market_entry: 5,
  spirit_field_care: 5,
} as const;

export type QiAction = keyof typeof QI_ACTION_COSTS;

export const QI_RESTORE_TALISMAN_SCENARIOS = {
  qi_restore_small: { amount: 50, label: '短芯香' },
  qi_restore_medium: { amount: 100, label: '续灯香' },
  qi_restore_large: { amount: 200, label: '长明香' },
  qi_restore_fill_to_max: { amount: 'fill_to_max', label: '引灯大香' },
} as const;

export type QiRestoreTalismanScenario =
  keyof typeof QI_RESTORE_TALISMAN_SCENARIOS;

export function isQiAction(value: string): value is QiAction {
  return Object.prototype.hasOwnProperty.call(QI_ACTION_COSTS, value);
}

export function isQiRestoreTalismanScenario(
  value: string,
): value is QiRestoreTalismanScenario {
  return Object.prototype.hasOwnProperty.call(
    QI_RESTORE_TALISMAN_SCENARIOS,
    value,
  );
}

export function getRetreatQiCost(years: number): number {
  return Math.ceil(Math.max(0, years) / 10) * QI_ACTION_COSTS.retreat_10_years;
}

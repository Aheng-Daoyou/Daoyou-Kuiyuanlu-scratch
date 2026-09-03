import {
  getBreakthroughPenaltyPercent,
  getPillToxicityRecoveryMultiplier,
  getPillToxicityStage,
} from '@shared/lib/condition';
import { evaluateFateContext } from '@shared/lib/fates';
import { getConditionStatusTemplate } from '@shared/lib/conditionStatusRegistry';
import {
  CULTIVATION_BOOST_STATUS_KEY,
  getCultivationBoostDisplayText,
} from '@shared/lib/cultivationBoost';
import {
  BREAKTHROUGH_FOCUS_STATUS_KEY,
  CLEAR_MIND_STATUS_KEY,
  getBreakthroughFocusBonus,
  getProtectMeridiansReductionPercent,
  PROTECT_MERIDIANS_STATUS_KEY,
} from '@shared/lib/pillEffectScaling';
import type {
  ConditionStatusInstance,
  CultivatorCondition,
} from '@shared/types/condition';
import type { PreHeavenFate } from '@shared/types/cultivator';

export function getStatusEffectDetails(
  status: ConditionStatusInstance,
): string[] {
  const template = getConditionStatusTemplate(status.key);
  const details = [...(template?.effectDetails ?? [])];

  if (status.key === 'weakness') {
    const stacks = Math.max(1, Math.floor(status.stacks || 1));
    const penaltyPercent = Math.round(
      (1 - Math.max(0.5, 1 - stacks * 0.05)) * 100,
    );
    return [
      `当前 ${stacks} 层：灯红、灯锋、梦涎、灯骨、灯影、灯芯降低 ${penaltyPercent}%。`,
      ...details,
    ];
  }

  if (status.key === CULTIVATION_BOOST_STATUS_KEY) {
    return [
      `${getCultivationBoostDisplayText(status)}。`,
      '该香力只影响闭关窥悟获得的灯韵，不影响闭关窥悟。',
      '完成一次闭关窥悟后消耗；尝试突破不会消耗。',
      ...details,
    ];
  }

  if (status.key === BREAKTHROUGH_FOCUS_STATUS_KEY) {
    return [
      `下次突破成功率 +${formatPercent(getBreakthroughFocusBonus(status))}。`,
      `剩余 ${status.usesRemaining ?? 1} 次突破尝试。`,
      ...details,
    ];
  }

  if (status.key === PROTECT_MERIDIANS_STATUS_KEY) {
    return [
      `突破失败时灯韵损失降低 ${formatPercent(
        getProtectMeridiansReductionPercent(status),
      )}。`,
      `剩余 ${status.usesRemaining ?? 1} 次突破尝试。`,
      ...details,
    ];
  }

  if (status.key === CLEAR_MIND_STATUS_KEY) {
    return [
      '突破失败不会滋生魔障；服用时已清除既有魔障。',
      `剩余 ${status.usesRemaining ?? 1} 次突破尝试。`,
      ...details,
    ];
  }

  return details;
}

function formatPercent(value: number): string {
  const percent = Number((value * 100).toFixed(1));
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent}%`;
}

export function getPillToxicityEffectDetails(
  conditionInput: CultivatorCondition | undefined,
  fates: PreHeavenFate[] = [],
): string[] {
  const fateContext = evaluateFateContext(fates);
  const recoveryEfficiency = Math.round(
    getPillToxicityRecoveryMultiplier(
      conditionInput,
      fateContext.toxicityPenaltyMultiplier,
    ) * 100,
  );
  const breakthroughPenalty = getBreakthroughPenaltyPercent(
    conditionInput,
    fateContext.toxicityPenaltyMultiplier,
  );
  const stage = getPillToxicityStage(conditionInput).label;
  const currentToxicity = Math.max(0, conditionInput?.gauges.pillToxicity ?? 0);

  return [
    `当前香毒阶段：${stage}。`,
    `当前香毒值为 ${currentToxicity}，会把基础自然恢复效率压到 ${recoveryEfficiency}%。`,
    `香毒也会压制突破成功率，当前额外降低 ${breakthroughPenalty}%。`,
    currentToxicity > 0
      ? '香毒不会随自然恢复自行消退，需要靠解毒类香品或其他专门手段化解。'
      : '当前无明显香毒压制。服丹累积后，恢复与突破都会受影响。',
  ];
}

import { getPillAppearanceLabel } from '@shared/lib/pillAppearance';
import type {
  AlchemyBatchDisplayProfile,
  FormulaAnalysisResult,
  PillAppearanceGrade,
} from '@shared/types/consumable';

export function describeFireState({
  preview,
  blockingReason,
  canAfford,
}: {
  preview: AlchemyBatchDisplayProfile | null;
  blockingReason?: string;
  canAfford: boolean;
}): { label: string; description: string; tone: 'normal' | 'attention' } {
  if (!canAfford)
    return {
      label: '阵纹熄灭',
      description: '驱动地火的灯油券不足，火路亮起后又迅速暗了下去。',
      tone: 'attention',
    };
  if (blockingReason)
    return {
      label: '炉势失衡',
      description: blockingReason,
      tone: 'attention',
    };
  if (!preview)
    return {
      label: '尚无预览',
      description: '选择材料后才能生成炼制预览。',
      tone: 'normal',
    };
  return {
    label: '炉火正稳',
    description: '当前材料可以炼制，请查看预览并决定是否继续。',
    tone: 'normal',
  };
}

export function describeEssenceState(
  preview: AlchemyBatchDisplayProfile | null,
): {
  label: string;
  description: string;
} {
  if (!preview)
    return { label: '未显', description: '投入灯材后，方能察看这一炉的香蕴。' };
  const max = preview.totalQuantityRange.max;
  const label =
    max >= 12 ? '充盈' : max >= 7 ? '丰沛' : max >= 4 ? '可用' : '微薄';
  return {
    label,
    description: `预计足以凝成 ${preview.totalQuantityRange.min}～${preview.totalQuantityRange.max} 枚香品，香蕴损耗约 ${Math.round(preview.essenceLossRatioRange.min * 100)}%～${Math.round(preview.essenceLossRatioRange.max * 100)}%。`,
  };
}

export function describeBatchOmen(
  preview: AlchemyBatchDisplayProfile | null,
): {
  primary: string;
  secondary: string;
} {
  if (!preview)
    return {
      primary: '火心尚无香光凝聚。',
      secondary: '外围药气也还没有形成批次征兆。',
    };
  const range = preview.primaryQualityRange;
  const primary =
    range.min === range.max
      ? `火心处已有一缕${range.max}香光凝聚。`
      : `火心香光在${range.min}至${range.max}之间游移。`;
  const secondaryQualities = preview.possibleQualities.filter(
    (quality) => quality !== range.max,
  );
  return {
    primary,
    secondary: secondaryQualities.length
      ? `外围药气仍可能结成${secondaryQualities.slice(0, 3).join('、')}副香。`
      : '外围药气大多正向主香收束，副香征兆并不明显。',
  };
}

export function describeAppearanceTendency(
  hints: AlchemyBatchDisplayProfile['appearanceHints'] | undefined,
): string {
  if (!hints) return '香纹尚未定形。';
  const labels = Object.entries(hints)
    .filter(([, weight]) => (weight ?? 0) > 0)
    .sort(([, left], [, right]) => (right ?? 0) - (left ?? 0))
    .slice(0, 2)
    .map(([appearance]) =>
      getPillAppearanceLabel(appearance as PillAppearanceGrade),
    );
  return labels.length
    ? `${labels.join('、')}的迹象最为明显。`
    : '香纹尚未定形。';
}

export function describeFormulaObservation(
  analysis: FormulaAnalysisResult | null,
): string | null {
  if (!analysis) return null;
  if (analysis.conclusion?.trim()) return analysis.conclusion.trim();
  if (analysis.fitBand === 'aligned')
    return '香方火纹与炉中药气彼此咬合，香路已经完全显明。';
  if (analysis.fitBand === 'degraded')
    return '香路尚能循方而行，但有一部分香蕴会在收束时散失。';
  return '当前材料与香方差异较大，继续炼制仍可能成香，但结果可能不理想。';
}

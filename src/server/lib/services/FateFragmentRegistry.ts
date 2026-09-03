import type {
  FateEffectEntry,
  FateEffectPolarity,
  FateEffectType,
} from '@shared/types/cultivator';
import type { Quality } from '@shared/types/constants';
import { QUALITY_ORDER } from '@shared/types/constants';
import {
  FATE_QUALITY_SCALE,
  FATE_ROLL_VERSION,
} from './FateConfig';

type FateValueKind =
  | 'multiplier_up'
  | 'multiplier_down'
  | 'bonus_up'
  | 'bonus_down';

export type FateEffectFamily =
  | 'retreat_exp'
  | 'retreat_insight'
  | 'breakthrough'
  | 'natural_recovery'
  | 'toxicity_penalty'
  | 'spirit_stone_cost'
  | 'market_purchase'
  | 'enlightenment_cost'
  | 'inn_loss';

export interface FateEffectDefinition {
  id: string;
  effectType: FateEffectType;
  polarity: FateEffectPolarity;
  family: FateEffectFamily;
  weight: number;
  label: string;
  keywords: string[];
  suffix: '骨' | '台' | '命' | '体' | '心' | '脉';
  valueKind: FateValueKind;
  baseRange: readonly [number, number];
  roundingStep: number;
  buildLabel: (value: number) => string;
  buildDescription: (value: number) => string;
}

export interface FateRolledValue {
  value: number;
  minValue: number;
  maxValue: number;
  rolledPercentile: number;
  roundingStep: number;
}

export interface FateEffectBuildOptions {
  strengthMultiplier?: number;
  varianceRange?: number;
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function formatPercentDelta(delta: number, fractionDigits = 0): string {
  const value = delta * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(fractionDigits)}%`;
}

function formatReduction(multiplier: number): string {
  return `-${((1 - multiplier) * 100).toFixed(0)}%`;
}

function formatIncrease(multiplier: number): string {
  return `+${((multiplier - 1) * 100).toFixed(0)}%`;
}

function applyScaledValue(
  base: number,
  kind: FateValueKind,
  quality: Quality,
): number {
  const scale = FATE_QUALITY_SCALE[quality];

  switch (kind) {
    case 'multiplier_up':
      return 1 + base * scale;
    case 'multiplier_down':
      return 1 - base * scale;
    case 'bonus_up':
      return base * scale;
    case 'bonus_down':
      return -base * scale;
  }
}

function getNeutralValue(kind: FateValueKind): number {
  return kind.startsWith('multiplier') ? 1 : 0;
}

function applyStrengthMultiplier(
  value: number,
  kind: FateValueKind,
  multiplier: number,
): number {
  const neutralValue = getNeutralValue(kind);
  return neutralValue + (value - neutralValue) * multiplier;
}

function rollValue(
  definition: FateEffectDefinition,
  quality: Quality,
  rng: () => number,
): FateRolledValue {
  const [baseMin, baseMax] = definition.baseRange;
  const rawMin = applyScaledValue(baseMin, definition.valueKind, quality);
  const rawMax = applyScaledValue(baseMax, definition.valueKind, quality);
  const minValue = Math.min(rawMin, rawMax);
  const maxValue = Math.max(rawMin, rawMax);
  const rolledPercentile = rng();
  const rolledValue = minValue + (maxValue - minValue) * rolledPercentile;
  const value = roundToStep(rolledValue, definition.roundingStep);

  return {
    value,
    minValue: roundToStep(minValue, definition.roundingStep),
    maxValue: roundToStep(maxValue, definition.roundingStep),
    rolledPercentile,
    roundingStep: definition.roundingStep,
  };
}

function defineEffect(
  definition: FateEffectDefinition,
): FateEffectDefinition {
  return definition;
}

const POSITIVE_EFFECTS = [
  defineEffect({
    id: 'retreat-exp-gain',
    effectType: 'retreat_exp_multiplier',
    polarity: 'boon',
    family: 'retreat_exp',
    weight: 1,
    label: '闭关灯韵获取提升',
    keywords: ['闭关', '苦修', '根基', '稳扎', '灯韵'],
    suffix: '骨',
    valueKind: 'multiplier_up',
    baseRange: [0.03, 0.06],
    roundingStep: 0.01,
    buildLabel: (value) => `闭关灯韵获取 ${formatPercentDelta(value - 1)}`,
    buildDescription: (value) =>
      `此人天生根骨运转更稳，闭关灯韵获取 ${formatPercentDelta(value - 1)}。`,
  }),
  defineEffect({
    id: 'retreat-insight-gain',
    effectType: 'retreat_insight_multiplier',
    polarity: 'boon',
    family: 'retreat_insight',
    weight: 1,
    label: '闭关窥悟获取提升',
    keywords: ['窥悟', '参悟', '明悟', '闭关', '心神'],
    suffix: '台',
    valueKind: 'multiplier_up',
    baseRange: [0.04, 0.08],
    roundingStep: 0.01,
    buildLabel: (value) => `闭关窥悟获取 ${formatPercentDelta(value - 1)}`,
    buildDescription: (value) =>
      `此人天生心念更易澄明，闭关窥悟获取 ${formatPercentDelta(value - 1)}。`,
  }),
  defineEffect({
    id: 'breakthrough-bonus',
    effectType: 'breakthrough_bonus',
    polarity: 'boon',
    family: 'breakthrough',
    weight: 0.95,
    label: '突破成功率提升',
    keywords: ['突破', '冲关', '瓶颈', '破境', '临门'],
    suffix: '命',
    valueKind: 'bonus_up',
    baseRange: [0.008, 0.015],
    roundingStep: 0.001,
    buildLabel: (value) => `突破成功率 ${formatPercentDelta(value, 1)}`,
    buildDescription: (value) =>
      `此人先天关隘略松，突破成功率 ${formatPercentDelta(value, 1)}。`,
  }),
  defineEffect({
    id: 'natural-recovery',
    effectType: 'natural_recovery_multiplier',
    polarity: 'boon',
    family: 'natural_recovery',
    weight: 1,
    label: '自然恢复效率提升',
    keywords: ['恢复', '调息', '养伤', '体魄', '续战'],
    suffix: '体',
    valueKind: 'multiplier_up',
    baseRange: [0.05, 0.1],
    roundingStep: 0.01,
    buildLabel: (value) => `自然恢复效率 ${formatPercentDelta(value - 1)}`,
    buildDescription: (value) =>
      `此人气血与灯焰回转更快，自然恢复效率 ${formatPercentDelta(value - 1)}。`,
  }),
  defineEffect({
    id: 'toxicity-mitigation',
    effectType: 'toxicity_penalty_multiplier',
    polarity: 'boon',
    family: 'toxicity_penalty',
    weight: 0.9,
    label: '香毒惩罚减轻',
    keywords: ['香毒', '调息', '化香', '香性', '稳息'],
    suffix: '心',
    valueKind: 'multiplier_down',
    baseRange: [0.06, 0.1],
    roundingStep: 0.01,
    buildLabel: (value) => `香毒惩罚 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `此人天生更能化开香力滞涩，香毒惩罚 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'alchemy-cost-reduction',
    effectType: 'alchemy_spirit_stone_multiplier',
    polarity: 'boon',
    family: 'spirit_stone_cost',
    weight: 0.9,
    label: '制香灯油券消耗降低',
    keywords: ['制香', '香炉', '香材', '香道', '火候'],
    suffix: '心',
    valueKind: 'multiplier_down',
    baseRange: [0.04, 0.08],
    roundingStep: 0.01,
    buildLabel: (value) => `制香灯油券消耗 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `此人天生更懂顺势省力，制香灯油券消耗 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'refine-cost-reduction',
    effectType: 'refine_spirit_stone_multiplier',
    polarity: 'boon',
    family: 'spirit_stone_cost',
    weight: 0.86,
    label: '封灵灯油券消耗降低',
    keywords: ['封灵', '铸造', '刻铭', '器胎', '镇语'],
    suffix: '脉',
    valueKind: 'multiplier_down',
    baseRange: [0.03, 0.06],
    roundingStep: 0.01,
    buildLabel: (value) => `封灵灯油券消耗 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `此人封灵器胎时更少走弯路，封灵灯油券消耗 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'market-purchase-discount',
    effectType: 'market_purchase_price_multiplier',
    polarity: 'boon',
    family: 'market_purchase',
    weight: 0.68,
    label: '坊市购买价格降低',
    keywords: ['坊市', '交易', '议价', '买卖', '折价'],
    suffix: '命',
    valueKind: 'multiplier_down',
    baseRange: [0.02, 0.04],
    roundingStep: 0.01,
    buildLabel: (value) => `坊市购买价格 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `此人天生善察市价起落，坊市购买价格 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'enlightenment-insight-reduction',
    effectType: 'enlightenment_insight_multiplier',
    polarity: 'boon',
    family: 'enlightenment_cost',
    weight: 0.92,
    label: '参悟窥悟消耗降低',
    keywords: ['参悟', '功法', '神通', '典籍', '悟道'],
    suffix: '台',
    valueKind: 'multiplier_down',
    baseRange: [0.04, 0.08],
    roundingStep: 0.01,
    buildLabel: (value) => `参悟窥悟消耗 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `此人观理更易入门，功法与神通参悟消耗 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'inn-loss-reduction',
    effectType: 'inn_cultivation_loss_multiplier',
    polarity: 'boon',
    family: 'inn_loss',
    weight: 0.75,
    label: '灯泉疗伤灯韵损耗降低',
    keywords: ['灯泉', '疗伤', '养伤', '静养', '灯韵'],
    suffix: '脉',
    valueKind: 'multiplier_down',
    baseRange: [0.08, 0.15],
    roundingStep: 0.01,
    buildLabel: (value) => `灯泉疗伤灯韵损耗 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `此人灯体更易借灯泉稳住散乱真气，疗伤灯韵损耗 ${formatReduction(value)}。`,
  }),
] as const satisfies readonly FateEffectDefinition[];

const NEGATIVE_EFFECTS = [
  defineEffect({
    id: 'retreat-exp-drag',
    effectType: 'retreat_exp_multiplier',
    polarity: 'burden',
    family: 'retreat_exp',
    weight: 1,
    label: '闭关灯韵获取下降',
    keywords: ['闭关', '滞涩', '拖慢'],
    suffix: '骨',
    valueKind: 'multiplier_down',
    baseRange: [0.02, 0.05],
    roundingStep: 0.01,
    buildLabel: (value) => `闭关灯韵获取 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `只是这道气数牵扯运转节奏，闭关灯韵获取 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'breakthrough-stumble',
    effectType: 'breakthrough_bonus',
    polarity: 'burden',
    family: 'breakthrough',
    weight: 0.95,
    label: '突破成功率下降',
    keywords: ['冲关', '失衡', '关隘'],
    suffix: '命',
    valueKind: 'bonus_down',
    baseRange: [0.005, 0.01],
    roundingStep: 0.001,
    buildLabel: (value) => `突破成功率 ${formatPercentDelta(value, 1)}`,
    buildDescription: (value) =>
      `只是临门一脚时常被气数扯偏，突破成功率 ${formatPercentDelta(value, 1)}。`,
  }),
  defineEffect({
    id: 'natural-recovery-drag',
    effectType: 'natural_recovery_multiplier',
    polarity: 'burden',
    family: 'natural_recovery',
    weight: 1,
    label: '自然恢复效率下降',
    keywords: ['养伤', '恢复', '迟缓'],
    suffix: '体',
    valueKind: 'multiplier_down',
    baseRange: [0.04, 0.08],
    roundingStep: 0.01,
    buildLabel: (value) => `自然恢复效率 ${formatReduction(value)}`,
    buildDescription: (value) =>
      `只是气血回转偏慢，自然恢复效率 ${formatReduction(value)}。`,
  }),
  defineEffect({
    id: 'toxicity-burden',
    effectType: 'toxicity_penalty_multiplier',
    polarity: 'burden',
    family: 'toxicity_penalty',
    weight: 0.9,
    label: '香毒惩罚加深',
    keywords: ['香毒', '香性', '反噬'],
    suffix: '心',
    valueKind: 'multiplier_up',
    baseRange: [0.05, 0.1],
    roundingStep: 0.01,
    buildLabel: (value) => `香毒惩罚 ${formatIncrease(value)}`,
    buildDescription: (value) =>
      `只是香力滞涩更易沉积，香毒惩罚 ${formatIncrease(value)}。`,
  }),
  defineEffect({
    id: 'system-spirit-stone-surcharge',
    effectType: 'system_spirit_stone_multiplier',
    polarity: 'burden',
    family: 'spirit_stone_cost',
    weight: 0.88,
    label: '系统养成灯油券消耗上升',
    keywords: ['耗费', '破财', '费石'],
    suffix: '脉',
    valueKind: 'multiplier_up',
    baseRange: [0.04, 0.08],
    roundingStep: 0.01,
    buildLabel: (value) => `系统养成灯油券消耗 ${formatIncrease(value)}`,
    buildDescription: (value) =>
      `只是每逢祭炼与调养总要多费灯油券，系统养成灯油券消耗 ${formatIncrease(value)}。`,
  }),
] as const satisfies readonly FateEffectDefinition[];

export function getPositiveFateEffects(): FateEffectDefinition[] {
  return [...POSITIVE_EFFECTS];
}

export function getNegativeFateEffects(): FateEffectDefinition[] {
  return [...NEGATIVE_EFFECTS];
}

export function buildFateEffectEntry(
  definition: FateEffectDefinition,
  quality: Quality,
  rng: () => number,
  options: FateEffectBuildOptions = {},
): FateEffectEntry {
  const rolled = rollValue(definition, quality, rng);
  const strengthMultiplier = options.strengthMultiplier ?? 1;
  const varianceRange = options.varianceRange ?? 0.2;
  const variancePercentile = rng();
  const varianceMultiplier =
    1 + (variancePercentile * 2 - 1) * varianceRange;
  const combinedMultiplier = strengthMultiplier * varianceMultiplier;
  const adjustedValue = roundToStep(
    applyStrengthMultiplier(
      rolled.value,
      definition.valueKind,
      combinedMultiplier,
    ),
    rolled.roundingStep,
  );
  const adjustedRangeValues = [
    rolled.minValue,
    rolled.maxValue,
  ].flatMap((value) => [
    roundToStep(
      applyStrengthMultiplier(
        value,
        definition.valueKind,
        strengthMultiplier * (1 - varianceRange),
      ),
      rolled.roundingStep,
    ),
    roundToStep(
      applyStrengthMultiplier(
        value,
        definition.valueKind,
        strengthMultiplier * (1 + varianceRange),
      ),
      rolled.roundingStep,
    ),
  ]);

  return {
    id: [
      definition.id,
      quality,
      rolled.rolledPercentile.toFixed(6),
      variancePercentile.toFixed(6),
    ].join(':'),
    effectId: definition.id,
    scope: definition.polarity === 'boon' ? 'daily' : 'drawback',
    polarity: definition.polarity,
    effectType: definition.effectType,
    value: adjustedValue,
    label: definition.buildLabel(adjustedValue),
    description: definition.buildDescription(adjustedValue),
    rollMeta: {
      qualityAnchor: quality,
      minValue: Math.min(...adjustedRangeValues),
      maxValue: Math.max(...adjustedRangeValues),
      rolledPercentile: rolled.rolledPercentile,
      roundingStep: rolled.roundingStep,
      variancePercentile,
      varianceMultiplier,
      strengthMultiplier,
    },
  };
}

export interface FateTextPreset {
  name: string;
  descriptionTemplate: string;
}

export type FateTextPresetRegistry = Record<
  string,
  Record<Quality, FateTextPreset>
>;

export const FATE_TEXT_PRESETS: FateTextPresetRegistry = {
  'retreat-exp-gain': {
    凡品: { name: '灯下坐', descriptionTemplate: '此人与灯有缘，灯下打坐时梦涎入体格外听话，虽无大进境，日复一日也能积出厚底子。' },
    灵品: { name: '守灯骨', descriptionTemplate: '心灯天生比旁人稳当，导引梦涎时很少走岔，长夜枯坐也不易被低语扰了心神。' },
    玄品: { name: '纳秽不惊', descriptionTemplate: '旁人纳秽如饮鸩，此人却像早就习惯，梦涎入体只添灯韵、少添杂念。' },
    真品: { name: '沉灯体', descriptionTemplate: '肉身心灯互为炉膛，静坐时如灯芯浸油，吐纳间灯韵涨得又稳又沉。' },
    地品: { name: '灯髓之躯', descriptionTemplate: '骨血似有灯髓流转，梦涎一经入体便被蒸炼成灯韵，苦修半程便抵旁人全程。' },
    天品: { name: '引灯命', descriptionTemplate: '天生是盏好灯，梦涎近身便自行归入灯芯，寻常闭关也如添油，进境常令人疑心。' },
    仙品: { name: '心灯不灭体', descriptionTemplate: '体内似藏一盏长明灯，万般梦涎入身皆归灯焰，苦修之路越走越亮，几无旁门可扰。' },
    神品: { name: '守灯真形', descriptionTemplate: '此身已非寻常灯盏，而是天翁梦里的半截灯芯投生，闭关所得厚重得如同在替谁守夜。' },
  },
  'retreat-insight-gain': {
    凡品: { name: '夜半耳明', descriptionTemplate: '夜半枯坐时，此人常能听见旁人听不见的细响；未必是吉兆，却总能在参悟时点醒半句。' },
    灵品: { name: '窥雾眼', descriptionTemplate: '看过的经文像浸在雾里，平时未必清晰，闭关时却总能翻出一点旁人忽略的旧理。' },
    玄品: { name: '雾中识路', descriptionTemplate: '面对晦涩法理时，此人像提前看过半张旧图，未必全会，却能更快摸到门径。' },
    真品: { name: '照影心', descriptionTemplate: '心如灯下明镜，能照见法理中旁人看不见的暗纹，参悟时常从无声处生出。' },
    地品: { name: '窥渊眼', descriptionTemplate: '与深渊天然相亲，法理不再隔着重雾，参悟时有如俯身看井，越看越清。' },
    天品: { name: '梦涎之智', descriptionTemplate: '心海似被梦涎浸润过，疑难落入心中，常会自行显出旁人看不懂的脉络。' },
    仙品: { name: '窥渊真瞳', descriptionTemplate: '一眼可见法理骨架，一念能明神通关节，闭关所得窥悟远非寻常悟性可比。' },
    神品: { name: '灯外之见', descriptionTemplate: '此人能看见灯外一角，万事万理一看便明，一学便精，悟道如饮自己碗里的水。' },
  },
  'breakthrough-bonus': {
    凡品: { name: '临灯有回旋', descriptionTemplate: '命里像有人替他在灯下留了半条退路，关口虽硬，临门时仍有一点回旋。' },
    灵品: { name: '渡口灯明', descriptionTemplate: '每到心灯劫前，此人眼前总像亮着一盏灯，再险的关口也能照出一条小路。' },
    玄品: { name: '劫外一线', descriptionTemplate: '破境仍要看本事，但命数像早替他备好一根细绳，险处也能多摸到一线生机。' },
    真品: { name: '灯芯命', descriptionTemplate: '身负灯芯之相，每逢绝境总有一线火苗递到手边，渡心灯劫时尤其明显。' },
    地品: { name: '守灯逢劫不灭', descriptionTemplate: '此命与灯同生共灭，诸劫虽险，却难完全压住他向上之势。' },
    天品: { name: '灯翁眷顾', descriptionTemplate: '得天翁余烬独钟，为这场梦所偏爱，破境时劫难常会先让三分。' },
    仙品: { name: '续灯之资', descriptionTemplate: '一缕守灯之基护住命关，冲击大境时仿佛手握那盏灯默许的通行。' },
    神品: { name: '灯主命格', descriptionTemplate: '此命已非顺应灯意，而是自为灯主；关隘当前，也要被其强行烙出通路。' },
  },
  'natural-recovery': {
    凡品: { name: '灯下回息', descriptionTemplate: '灯下小憩片刻，气血便肯慢慢回暖，虽不惊人却很实用。' },
    灵品: { name: '睡一更便好', descriptionTemplate: '口头禅是睡一更便好，气血也确实给面子，寻常损耗很难久拖不复。' },
    玄品: { name: '暗火养伤', descriptionTemplate: '受创后不急不躁，像有一簇暗火在体内慢慢煨着，过一阵再看亏空已补回不少。' },
    真品: { name: '灯油不涸体', descriptionTemplate: '筋骨带灯油般的绵劲，伤势落身后难以深扎，气血也更容易重新鼓荡。' },
    地品: { name: '长明之躯', descriptionTemplate: '肉身有长明灯般的绵长，越是重伤，越能看出深处生机不熄。' },
    天品: { name: '灯焰重燃体', descriptionTemplate: '衰败之中自含重燃之机，气血与灯焰常能从低谷处重新生发。' },
    仙品: { name: '不灭灯身', descriptionTemplate: '身中似有近乎长明的生机流转，伤势难以长久截断其恢复。' },
    神品: { name: '续灯轮回体', descriptionTemplate: '掌一线续灯之意，败落可返盛，枯竭可回春，恢复之势近乎为谁续命。' },
  },
  'toxicity-mitigation': {
    凡品: { name: '淡香入体', descriptionTemplate: '燃香时懂得点到即止，香性入口先打个折，沉毒牵缠也随之少些。' },
    灵品: { name: '余香化浊', descriptionTemplate: '身上常有余香，身体习惯慢慢化浊，香毒入体后也不易赖着不走。' },
    玄品: { name: '香灰自清', descriptionTemplate: '香毒虽烈，也会被慢慢滤净，像炉中香灰日日清，从不积成沉疴。' },
    真品: { name: '灯照香清', descriptionTemplate: '心如灯焰照见香性清浊，清者留，浊者散，烈香入体也难深伤根基。' },
    地品: { name: '净灯体', descriptionTemplate: '体内灯焰能重整香性，毒与香之间不再全由香力摆布。' },
    天品: { name: '万香不侵体', descriptionTemplate: '万般香毒难侵其身，反可被炼作资粮，香毒落入体内也多半成不了大患。' },
    仙品: { name: '灯净香清体', descriptionTemplate: '灯焰清而浊自分，香毒入身如污水入灯油，终会被蒸散。' },
    神品: { name: '守灯香胎', descriptionTemplate: '体内自孕守灯之机，香毒尚未成患，便被改易成可承受的余韵。' },
  },
  'alchemy-cost-reduction': {
    凡品: { name: '省油香师', descriptionTemplate: '制香时懂得惜油省火，几枚灯油券也要花在真正该花的火候上。' },
    灵品: { name: '余香不费', descriptionTemplate: '边角香材也能蹭出几分香意，制香时少走许多白白耗费的弯路。' },
    玄品: { name: '香火低耗', descriptionTemplate: '与香火相性极佳，炉火一起像入了低耗，灯油券消耗自然轻了许多。' },
    真品: { name: '灯焰香心', descriptionTemplate: '灯焰入命，善炼万香，炉中香力更听驱使，不必靠堆砌灯油券强催。' },
    地品: { name: '制香有缘', descriptionTemplate: '命中与香道有缘，香材、火候、灯油券三者常能合在最省力的位置。' },
    天品: { name: '无垢香心', descriptionTemplate: '香心无垢，杂火杂念皆少，灯油券多化为香力，少化为虚烟。' },
    仙品: { name: '守灯香体', descriptionTemplate: '香道气象近于守灯本源，炉火一起便归灯焰，炼成一炉香所需耗费大减。' },
    神品: { name: '续灯香胎', descriptionTemplate: '身如续灯香胎，万香入炉皆能顺势成形，制香几乎不需用灯油券硬推。' },
  },
  'refine-cost-reduction': {
    凡品: { name: '省料封灵', descriptionTemplate: '刻铭看似朴拙，实则每一凿都像在算预算，封灵时常能省下一些无谓火耗。' },
    灵品: { name: '胎名早成', descriptionTemplate: '别人开炉先烧灯油券，此人先把器胎的胎名摸顺，哪里该受力往往能早一步察觉。' },
    玄品: { name: '镇语自明', descriptionTemplate: '器胎到手像被镇语点过，边角玄铁也能派上用场，灯油券不必浪费在反复校正上。' },
    真品: { name: '藏锋封灵', descriptionTemplate: '懂得藏锋，不把灯油券浪费在声势上，只送入器胎真正要害。' },
    地品: { name: '封灵之相', descriptionTemplate: '身具封灵之相，刻铭时镇语与器胎更易相合，成器代价自然降低。' },
    天品: { name: '灯焰器骨', descriptionTemplate: '骨中灯焰气厚重，最善承载封灵法则，铸炼时少有无谓损耗。' },
    仙品: { name: '守灯铸身', descriptionTemplate: '一身守灯气象可化万器之基，封灵时火、金、铭三者皆更容易归位。' },
    神品: { name: '灯外器胎', descriptionTemplate: '灯外之物可演万器，器胎落到手里便像找到了源头，所需灯油券大幅减少。' },
  },
  'market-purchase-discount': {
    凡品: { name: '夜市值价', descriptionTemplate: '摊前一句“道友再让半分”，常能听出价钱虚实，不至被掌柜随口抬价。' },
    灵品: { name: '识货眼', descriptionTemplate: '买物时眼光清亮，哪里能省下一枚灯油券，总能比旁人多看出一层。' },
    玄品: { name: '问价三回', descriptionTemplate: '天生会在夜市里等到合适货色，也懂挑时辰、还价钱，真正值钱的东西更易低价入手。' },
    真品: { name: '灯下聚财', descriptionTemplate: '财气聚而不滞，入夜市时常能碰见合适货色，也能谈出合适价钱。' },
    地品: { name: '灯油不缺命', descriptionTemplate: '灯焰余辉照入财帛，商贩见之也愿让利三分，买物少费灯油券。' },
    天品: { name: '点金慧眸', descriptionTemplate: '慧眸能看穿货价浮沫，不被虚价遮眼，灯油券自然少花在虚处。' },
    仙品: { name: '袖里灯油', descriptionTemplate: '袖中似另有账本，珍货当前，也常能把价钱谈回命数认可的分寸。' },
    神品: { name: '无灯巷熟客', descriptionTemplate: '财运近乎自成一条暗路，连无灯巷的交易也会被轻轻推向对他有利的一端。' },
  },
  'enlightenment-insight-reduction': {
    凡品: { name: '点灯入门', descriptionTemplate: '法诀刚看完便能理出重点，虽称不上大悟，参悟时却少费许多涂改心力。' },
    灵品: { name: '旧卷熟读', descriptionTemplate: '看过的经文不易散失，参悟前像翻过前人旧注，反复检索的心力自然少些。' },
    玄品: { name: '灯下一悟', descriptionTemplate: '慧根自生，功法神通的门径对他不算全然隐晦，常像跳过入门般先摸到门槛。' },
    真品: { name: '照影灯心', descriptionTemplate: '心有照影之相，能把繁复法理拆成可循的细线，参悟时少走死路。' },
    地品: { name: '近灯之体', descriptionTemplate: '与灯焰相亲，功法未尽开而理已先露，许多消耗都省在入门之前。' },
    天品: { name: '重瞳照影', descriptionTemplate: '重瞳炽盛，可洞悉本源，法诀破绽与关窍在眼中纤毫毕现。' },
    仙品: { name: '灯心通明', descriptionTemplate: '任何功法一眼可见脉络，任何神通一念能明关窍，参悟成本自然远低于常人。' },
    神品: { name: '灯主亲传', descriptionTemplate: '口含灯令，字句近乎灯律；参悟法门时，法理反像主动顺从其意。' },
  },
  'inn-loss-reduction': {
    凡品: { name: '残灯不熄', descriptionTemplate: '疗伤时能强撑一口灯焰，像残灯也不肯熄，不让灯泉把灯韵根底一并冲散。' },
    灵品: { name: '灯油存底', descriptionTemplate: '灯韵像有一层旧日灯油垫底，疗伤的水流过后，仍能留下不少底子。' },
    玄品: { name: '灯下自持', descriptionTemplate: '灯泉再猛也会被自动限量，外力疗伤时先护住自身灯韵，不让进度一口气清空。' },
    真品: { name: '守灯井', descriptionTemplate: '体内仿佛有一口守灯深井，灯泉冲刷时，散去的元气常会绕回井中。' },
    地品: { name: '长明无疆', descriptionTemplate: '与灯同在，与夜长存，疗伤虽借外力，却不轻易损及灯油般的根基。' },
    天品: { name: '不漏灯身', descriptionTemplate: '衰败与创伤难以真正夺走其根本，灯泉疗伤时灯韵流失也被压到更低。' },
    仙品: { name: '灯焰回藏', descriptionTemplate: '灯焰之意护住盛衰转换，疗伤带走的灯韵常会在体内转圜而回。' },
    神品: { name: '不灭灯基', descriptionTemplate: '体内有近乎不灭的灯基镇守，灯泉可洗伤，却难洗走真正属于他的灯韵。' },
  },
  'retreat-exp-drag': {
    凡品: { name: '灯下走神', descriptionTemplate: '闭关没多久就想去看看灯焰、翻翻旧卷，气息能走，却总差一点清爽。' },
    灵品: { name: '纳秽滞涩', descriptionTemplate: '炉中有火也有冷灰，梦涎走到半路像忽然凝住，苦修所得常被那层冷灰压慢。' },
    玄品: { name: '灯油见底', descriptionTemplate: '才运转几周天，心灯便像要熄了，灯韵进境也被挡住一截。' },
    真品: { name: '绝窍', descriptionTemplate: '梦涎近身时常被无形隔开，闭关虽能前行，却比旁人更费时日。' },
    地品: { name: '灯影缠身', descriptionTemplate: '总有影子盘踞体内，梦涎入身先被它分去三分，灯韵增长因此受阻。' },
    天品: { name: '闭灯之体', descriptionTemplate: '此体似被灯外之物盯上，梦涎入身常被它截走，闭关进境被自身格局拖慢。' },
    仙品: { name: '漏灯体', descriptionTemplate: '身与灯外过近，梦涎入体后容易漏入暗处，苦修所得难以完全留存。' },
    神品: { name: '孤灯绝命', descriptionTemplate: '命犯孤煞，连梦涎也不愿久伴身侧，闭关所得常被孤煞之气削去一截。' },
  },
  'breakthrough-stumble': {
    凡品: { name: '渡口灯灭', descriptionTemplate: '命路上总有暗处绊脚，平时无碍，临门渡渊时却像灯忽然被吹灭。' },
    灵品: { name: '劫前失神', descriptionTemplate: '关前多雾，明明心法都懂，关键时刻心神却像被谁叫走，容易错失时机。' },
    玄品: { name: '灯芯将折', descriptionTemplate: '能见渡口，却常在登舟时灯芯将折，冲关像临门一脚踩进冷灰。' },
    真品: { name: '灯影夺命', descriptionTemplate: '此为命中的灯影之变，善吸附、渗透，也最易在关口处把原本走势扯向暗处。' },
    地品: { name: '孤煞灯劫', descriptionTemplate: '孤煞入命，越是临近大关，越容易因灯影牵扯而生出额外阻力。' },
    天品: { name: '灯外窥关', descriptionTemplate: '体内似有灯外之物在关口窥伺，稍有不慎，便从助力化作关隘。' },
    仙品: { name: '逆灯劫', descriptionTemplate: '命数与灯焰相冲，破境不像顺流而上，更像强行从灯外夺回一线天机。' },
    神品: { name: '灯油反噬', descriptionTemplate: '灯油太盛而自生反噬，每逢大关，那盏灯都要先向此人讨回一笔旧账。' },
  },
  'natural-recovery-drag': {
    凡品: { name: '灯焰迟暖', descriptionTemplate: '气血表面像覆着薄霜，伤后能回暖，只是灯焰燃得慢得让人心焦。' },
    灵品: { name: '灯油难续', descriptionTemplate: '睡前说醒来就好，醒来却发现灯油仍在半路，恢复还在半途。' },
    玄品: { name: '余烬不温', descriptionTemplate: '恢复像余烬将熄，明明会好，却总要多等一会儿。' },
    真品: { name: '霜灯体', descriptionTemplate: '霜气镇住气血，也镇住生机，伤势恢复往往比旁人迟缓。' },
    地品: { name: '冷灰寒身', descriptionTemplate: '冷灰气息压住复苏之机，越是伤重，越难立刻唤醒生机。' },
    天品: { name: '灯熄体', descriptionTemplate: '此体近熄而不熄，却也常在将熄的暗处久留，恢复起来并不轻快。' },
    仙品: { name: '灯焰迟转', descriptionTemplate: '盛衰转换被灯焰拖慢，伤后明明能复原，却总要多绕一圈。' },
    神品: { name: '不灭冻灯', descriptionTemplate: '不灭之意化作冻灯封住肉身，生机尚在，却很难迅速破冰而出。' },
  },
  'toxicity-burden': {
    凡品: { name: '香入即缠', descriptionTemplate: '香入口中先说没事，转头异香上头，入体后也容易留下不肯散的余毒。' },
    灵品: { name: '闻香则染', descriptionTemplate: '闻见好香就想试试，香性越多，浊味越不容易洗净。' },
    玄品: { name: '叠香成疾', descriptionTemplate: '香力越杂，越可能在灯脉里留下暗刺；好处没攒明白，香毒先叠出了层数。' },
    真品: { name: '万香侵胎', descriptionTemplate: '万香皆可入身，却未必都能为己所用；香越烈，反噬越深。' },
    地品: { name: '灯外香身', descriptionTemplate: '灯外之物善藏沉毒，香力入体后常往暗处沉积，久了便成深患。' },
    天品: { name: '吞香之体', descriptionTemplate: '吞噬之力不分清浊，香力与香毒一并卷入体内，反使毒性更难排出。' },
    仙品: { name: '灯暗香胎', descriptionTemplate: '香毒入体后被暗处养得更深，短时不显，爆发时却更难收拾。' },
    神品: { name: '饮鸩灯命', descriptionTemplate: '得力越快，反噬越狠；此命纳香极深，也纳毒极深。' },
  },
  'system-spirit-stone-surcharge': {
    凡品: { name: '灯油漏盏', descriptionTemplate: '灯油券刚到手，修行账单就像自动扣款，途中总会多漏几枚。' },
    灵品: { name: '灯油难攒', descriptionTemplate: '每次都说这次省着点，结果调养祭炼一开炉，额外耗费又把灯油漏空。' },
    玄品: { name: '灯下破财', descriptionTemplate: '明明只是正常养成，却总被命数加购一份灯油券消耗，看起来像漏了油。' },
    真品: { name: '漏灯命格', descriptionTemplate: '修行像背着一盏漏油的灯，凡需灯油券处，总要多漏一点给命数。' },
    地品: { name: '耗油命格', descriptionTemplate: '此格善吸附与转化，连投入养成的灯油券也容易被旁支细节吸走。' },
    天品: { name: '吞油之体', descriptionTemplate: '吞噬之力索求无度，祭炼、调养、参悟皆要先被它分去一份灯油券。' },
    仙品: { name: '灯影索油', descriptionTemplate: '灯影之体清贵难养，借外物成事时，代价往往比旁人更重。' },
    神品: { name: '灯油黑洞', descriptionTemplate: '命中似有无底黑洞，投向修行系统的灯油券，总要先被气运吞去一口。' },
  },
} as const satisfies FateTextPresetRegistry;

export function getFateTextPreset(
  definition: FateEffectDefinition,
  quality: Quality,
): FateTextPreset {
  return (
    FATE_TEXT_PRESETS[definition.id]?.[quality] ?? {
      name: '未明命格',
      descriptionTemplate: '{effectDescription}。',
    }
  );
}

export function buildFallbackFateName(
  definition: FateEffectDefinition,
  quality: Quality,
): string {
  return getFateTextPreset(definition, quality).name;
}

export function buildFallbackFateDescription(
  effects: FateEffectEntry[],
): string {
  const [primary, burden] = effects;
  if (!primary) {
    return '此人命数未明，气机流转尚无定性。';
  }
  void burden;
  return primary.description;
}

export function buildPresetFateDescription(
  definition: FateEffectDefinition,
  quality: Quality,
  primaryEffect: FateEffectEntry,
): string {
  const template = getFateTextPreset(definition, quality).descriptionTemplate;
  if (!template.includes('{effectDescription}')) {
    return template;
  }
  return template.replace(
    '{effectDescription}',
    primaryEffect.description.replace(/。$/, ''),
  );
}

export function summarizeFateAura(effects: FateEffectEntry[]): string {
  const positives = effects
    .filter((effect) => effect.polarity === 'boon')
    .map((effect) => effect.label);
  const burdens = effects
    .filter((effect) => effect.polarity === 'burden')
    .map((effect) => effect.label);

  return [
    positives.length > 0 ? `顺势：${positives.join('，')}` : undefined,
    burdens.length > 0 ? `代价：${burdens.join('，')}` : undefined,
  ]
    .filter(Boolean)
    .join('；');
}

export function isHighQualityFate(quality: Quality): boolean {
  return QUALITY_ORDER[quality] >= QUALITY_ORDER['天品'];
}

export function getFateRollVersion(): string {
  return FATE_ROLL_VERSION;
}

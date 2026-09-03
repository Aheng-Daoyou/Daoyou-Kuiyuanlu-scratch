import type { Quality } from '@shared/types/constants';
import type { RolledAffix } from '../types';

/**
 * 器灵叙事数据层（封灵器 · 器灵）。
 *
 * 换骨边界：纯叙事数据，不参与任何引擎数值/逻辑判别。
 * 「器灵」源自 product-naming.md 的既有世界观铺垫（器灵初醒/器灵低语），
 * 本模块为封灵器补上结构化的器灵信息，随 productModel.metadata 一起落库，
 * 由展示层（productShowcase）读出并呈现——「引擎管对错，AI 管味道」。
 */

/** 器灵低语倾向（影响低语片段选材）。 */
export type SpiritWhisperKind =
  | 'hunger' // 饥饿贪求
  | 'vigil' // 警醒守望
  | 'murmur' // 无意义絮语
  | 'longing' // 归途渴念
  | 'omen' // 凶兆低语
  | 'bloom'; // 初醒欢欣

/** 器灵的结构化叙事信息。 */
export interface ArtifactSpiritInfo {
  /** 器灵名字（如「灯下伏藏」「贪夜之灵」）。 */
  name: string;
  /** 性格/气质一句话（如「沉静而多疑，惯于窥探持灯者的心意」）。 */
  disposition: string;
  /** 器灵低语片段（初醒时说的第一句话，白描克苏鲁味）。 */
  whisper: string;
  /** 低语倾向标签，供后续扩展（如更丰富的低语池）。 */
  whisperKind: SpiritWhisperKind;
  /** 初醒时刻（ISO）。 */
  awakenedAt: string;
  /** 品质印记（如「玄品封灵」），用于展示层级。 */
  sealTier?: string;
}

/* ------------------------------------------------------------------ *
 * 器灵名池
 * ------------------------------------------------------------------ */

const SPIRIT_NAME_POOL = [
  '灯下伏藏',
  '贪夜之灵',
  '沉渊目',
  '驻烛客',
  '叩门者',
  '无睑之瞳',
  '耳后低语',
  '守隙人',
  '衔梦虫',
  '哑火精',
  '盘根傀',
  '寄影',
] as const;

/* ------------------------------------------------------------------ *
 * 气质池（按低语倾向细分）
 * ------------------------------------------------------------------ */

const DISPOSITION_BY_KIND: Record<SpiritWhisperKind, string[]> = {
  hunger: [
    '贪而警觉，总在灯影边缘窥探持灯者的欲望',
    '饿意深藏，越是温养越是贪求，如一孔无底的井',
  ],
  vigil: [
    '沉静而多疑，惯于彻夜守望封灵之器的裂隙',
    '警觉如守夜人，任何靠近者都会被它悄悄打量',
  ],
  murmur: [
    '神智昏沉，翻来覆去只念叨同一段不成句的呓语',
    '絮语不休，仿佛体内住着许多个声音在轮流开口',
  ],
  longing: [
    '隐约记得旧主的轮廓，却始终想不起归途',
    '带着一种近乎哀伤的执念，反复舔舐封灵之痕',
  ],
  omen: [
    '言辞阴冷，出口多是凶兆，让人脊背发凉',
    '惯于在持灯者临事之前，先一步道破不祥',
  ],
  bloom: [
    '初醒尚带着一丝欢欣，如久蛰之物乍见天光',
    '明净而好奇，尚未学会克苏鲁式的迂回与隐瞒',
  ],
};

/* ------------------------------------------------------------------ *
 * 低语池（按倾向细分）
 * ------------------------------------------------------------------ */

const WHISPER_BY_KIND: Record<SpiritWhisperKind, string[]> = {
  hunger: [
    '「你身上……有灯油的味道。给我尝一口，只一口。」',
    '「温养我的人越多，我便越是饿。这很公平，对吧？」',
  ],
  vigil: [
    '「来了个生面孔。要我替你盯着他吗？我盯着呢。」',
    '「别熄那盏灯。灯一灭，它们就都醒了。」',
  ],
  murmur: [
    '「……归，归，归，归。谁在喊归？是我吗？不是。」',
    '「潮水涨了三次，第四次的时候，门开了条缝。」',
  ],
  longing: [
    '「旧主也这样看我。后来他……他不见了。」',
    '「这条路我走过。可我忘了，是往前，还是往回。」',
  ],
  omen: [
    '「你今夜要做一个决定。无论选哪边，都要付灯油。」',
    '「小心那道影子。它比你更早看见明天的你。」',
  ],
  bloom: [
    '「啊，亮了。原来外面的光，是暖的。」',
    '「我第一次睁眼，就瞧见了你的灯。真好看。」',
  ],
};

/* ------------------------------------------------------------------ *
 * 倾向判定：由词缀性质与品质决定
 * ------------------------------------------------------------------ */

const AFFIX_KIND_HINTS: Array<{
  hint: RegExp;
  kind: SpiritWhisperKind;
}> = [
  { hint: /吸|夺|噬|侵|腐|劫|榨/i, kind: 'hunger' },
  { hint: /御|守|护|镇|封|守|摄/i, kind: 'vigil' },
  { hint: /惑|乱|妄|魇|沉|疯|谵/i, kind: 'murmur' },
  { hint: /返|归|溯|忆|旧|昔/i, kind: 'longing' },
  { hint: /兆|厄|凶|劫|灭|渊/i, kind: 'omen' },
];

/** 依据词缀名/标签/品质，确定器灵的低语倾向。 */
export function inferSpiritWhisperKind(
  affixes: RolledAffix[],
  quality: Quality,
): SpiritWhisperKind {
  const pool = affixes.flatMap((affix) => [
    affix.name ?? '',
    affix.description ?? '',
    ...(affix.tags ?? []),
  ]);
  const text = pool.join(' ');

  for (const { hint, kind } of AFFIX_KIND_HINTS) {
    if (hint.test(text)) return kind;
  }

  // 高品级无倾向词缀时偏向「初醒欢欣」，低品级偏向「絮语/凶兆」。
  const order = ['凡品', '灵品', '玄品', '真品', '地品', '天品', '仙品', '神品'];
  const idx = order.indexOf(quality);
  if (idx >= 4) return 'bloom';
  if (idx <= 1) return 'murmur';
  return 'vigil';
}

/** 简单确定性 hash，用于在同倾向池内稳定取选。 */
function hashText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(pool: readonly T[], seed: number): T {
  return pool[seed % pool.length];
}

/** 封灵器封印印记文案。 */
const SEAL_TIER_TEXT: Record<Quality, string> = {
  凡品: '凡品',
  灵品: '灵品',
  玄品: '玄品',
  真品: '真品',
  地品: '地品',
  天品: '天品',
  仙品: '仙品',
  神品: '神品',
};

/**
 * 为一件封灵器生成器灵叙事信息。
 *
 * @param artifactName 封灵器名（决定器灵名时注入味道）。
 * @param quality 数值投影品质。
 * @param affixes 已 roll 的词缀（决定低语倾向与名字意象）。
 * @param seededAt 确定性种子（通常传 craftedAt 或 affix 指纹）。
 */
export function buildArtifactSpirit(
  artifactName: string,
  quality: Quality,
  affixes: RolledAffix[],
  seededAt: string,
): ArtifactSpiritInfo {
  const kind = inferSpiritWhisperKind(affixes, quality);
  const seed = hashText(`${artifactName}|${seededAt}`);
  const nameSeed = hashText(artifactName + affixes.map((a) => a.id).join(''));
  const dispositionSeed = seed + 7;
  const whisperSeed = seed + 13;
  const spiritName = pick(SPIRIT_NAME_POOL, nameSeed);
  const disposition = pick(DISPOSITION_BY_KIND[kind], dispositionSeed);
  const whisper = pick(WHISPER_BY_KIND[kind], whisperSeed);

  return {
    name: spiritName,
    disposition,
    whisper,
    whisperKind: kind,
    awakenedAt: seededAt,
    sealTier: `${SEAL_TIER_TEXT[quality]}器灵`,
  };
}

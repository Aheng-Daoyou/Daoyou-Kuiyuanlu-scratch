import type { ElementType, MaterialType, Quality } from '@shared/types/constants';

export interface FallbackMaterialPreset {
  name: string;
  description: string;
  element: ElementType;
}

type QualityPresets = Record<Quality, FallbackMaterialPreset[]>;

const EMPTY_PRESET: FallbackMaterialPreset = {
  name: '玄圭石',
  description:
    '此石久藏地脉深处，表面暗纹自成回环，虽无惊世异象，却可稳定梦涎流转，常被用作炼制基础器坯。',
  element: '梦',
};

export const FALLBACK_MATERIAL_LIBRARY: Record<MaterialType, QualityPresets> = {
  seed: {
    凡品: [EMPTY_PRESET],
    灵品: [EMPTY_PRESET],
    玄品: [EMPTY_PRESET],
    真品: [EMPTY_PRESET],
    地品: [EMPTY_PRESET],
    天品: [EMPTY_PRESET],
    仙品: [EMPTY_PRESET],
    神品: [EMPTY_PRESET],
  },
  herb: {
    凡品: [
      {
        name: '青岚草',
        description:
          '此草多生于溪谷薄雾地带，叶脉细长而含微灵，常被闻腥修士晒干入药，用于温养经络与缓补真息。',
        element: '尸',
      },
    ],
    灵品: [
      {
        name: '润脉藤',
        description:
          '藤茎外皮如玉，掐开可见淡青灯液，守灯前后常以其配香，助修士疏导灯脉淤滞并稳固小周天运转。',
        element: '尸',
      },
    ],
    玄品: [
      {
        name: '凝露玄花',
        description:
          '花心昼闭夜开，能在月下聚出寒露灵珠，炼制静心香时最为常见，兼可压制魔障躁动与心神浮乱。',
        element: '星',
      },
    ],
    真品: [
      {
        name: '赤霄蕊',
        description:
          '此蕊生于火脉断层边缘，瓣薄如绢却不惧真火，香师常取其芯丝调和香性，使渊系香品更易成纹聚灯。',
        element: '渊',
      },
    ],
    地品: [
      {
        name: '镇海玉芝',
        description:
          '芝盖温润如脂，根须可引地泉灯油，传闻蚀体修士以其入方，能缓慢修复暗伤并温养灯心根基。',
        element: '梦',
      },
    ],
    天品: [
      {
        name: '玄霜天兰',
        description:
          '花瓣薄若寒玉，常见于极阴冰窟深层，采摘时需封灵灯匣镇压寒意，常被用于炼制高阶清心护脉香。',
        element: '疫',
      },
    ],
    仙品: [
      {
        name: '太虚仙藤',
        description:
          '藤身银纹自转，似与天地呼吸同频，执灯修士偶得其一截便可闭关数月，用以淬炼灯台并拓展气海容量。',
        element: '噬',
      },
    ],
    神品: [
      {
        name: '混元道莲',
        description:
          '莲心生有九层光晕，开合间隐现古篆道痕，渡渊大能亦视其为奇珍，常用于参悟生灭轮转与本源法则。',
        element: '星',
      },
    ],
  },
  ore: {
    凡品: [
      {
        name: '沉砂铁',
        description:
          '矿质厚重而杂质较少，多出自浅层矿脉，凡俗铁匠亦可熔炼，修士常以其打底锻坯，稳固初阶凡器雏形。',
        element: '烛',
      },
    ],
    灵品: [
      {
        name: '地火铜晶',
        description:
          '矿芯常带赤红细丝，遇火则微鸣发亮，守灯修士常将其掺入器胚，使凡器在梦涎灌注时更易导流与稳纹。',
        element: '梦',
      },
    ],
    玄品: [
      {
        name: '流炎玄矿',
        description:
          '晶层中封存细密火纹，锤击时会迸出星点赤芒，窥渊修士以其封灵，可显著提升锋刃凡器的灼穿之力。',
        element: '渊',
      },
    ],
    真品: [
      {
        name: '寒星银母',
        description:
          '银母表面映出细碎星辉，置于暗处亦有冷光流动，常被炼入防御封灵器内层，以增强护罩韧性与寒抗能力。',
        element: '疫',
      },
    ],
    地品: [
      {
        name: '太乙陨金',
        description:
          '此金源自天外坠陨，内部层理天然成纹，蚀体器师得之多不外售，常用于铸造本命封灵的核心承灯骨架。',
        element: '烛',
      },
    ],
    天品: [
      {
        name: '幕纹天钢',
        description:
          '钢体自带纵横幕纹，遇幕隙会短暂显化幽光，执灯修士以其锻器，可令攻伐封灵器在瞬发时更具穿透威势。',
        element: '帘',
      },
    ],
    仙品: [
      {
        name: '太初仙晶',
        description:
          '晶核纯澈近透明，内部似有云潮缓动，掌灯以上修士封灵时仅需微量，便可显著提升封灵器的纳灯与自愈性。',
        element: '噬',
      },
    ],
    神品: [
      {
        name: '混沌神金',
        description:
          '其色非黑非金，观之如雾海沉浮，传闻仅在上古战场残界可寻，能承载极高道压，是镇宗重器首选母材。',
        element: '烛',
      },
    ],
  },
  monster: {
    凡品: [
      {
        name: '铁背狼骨',
        description:
          '骨节坚硬且韧性尚可，常见于山林诡狼，闻腥修士多将其磨粉入药，用于淬体强筋并提升短时抗打能力。',
        element: '梦',
      },
    ],
    灵品: [
      {
        name: '青鳞蟒胆',
        description:
          '胆囊色泽碧青，香性辛烈而走窜，守灯修士若经香方调和后服用，可疏散体内阴滞并增进尸窍亲和。',
        element: '尸',
      },
    ],
    玄品: [
      {
        name: '赤炎隼羽',
        description:
          '羽锋赤亮如火，轻抖即有热浪涌动，窥渊修士常以其炼制火符与飞针凡器，使攻势更疾且附灼烧余劲。',
        element: '渊',
      },
    ],
    真品: [
      {
        name: '玄潮龟甲',
        description:
          '甲面水纹天然交叠，触之冰润而沉稳，常被祭炼为护心法盾，能在激战时分担冲击并缓释梦涎震荡。',
        element: '星',
      },
    ],
    地品: [
      {
        name: '幕蛟逆鳞',
        description:
          '逆鳞边缘仍残存细微幕弧，稍有触动便会裂响，蚀体修士将其炼入帘系封灵器，可增其破甲与震魂之效。',
        element: '帘',
      },
    ],
    天品: [
      {
        name: '冰魄狐心',
        description:
          '心核晶莹近透明，蕴含极寒灯机，忘川修士多以其压制火毒与心焰反噬，亦可用于炼制高阶凝神香。',
        element: '疫',
      },
    ],
    仙品: [
      {
        name: '苍冥龙髓',
        description:
          '髓液流动如汞，散发古老龙威，执灯以上修士炼体时仅取一滴，便可牵引周天气流并重塑骨血灯性。',
        element: '噬',
      },
    ],
    神品: [
      {
        name: '太古凰羽',
        description:
          '羽纹内蕴不灭霞火，焚而不焦且光辉自敛，渡渊修士得之多用于祭炼护命宝衣，以抵御天灾与焚魂之劫。',
        element: '渊',
      },
    ],
  },
  tcdb: {
    凡品: [
      {
        name: '启窍灯果',
        description:
          '果皮温润泛光，咬开后有淡甜灯雾逸散，闻腥期修士常取其入药，可温和开窍并提升初期吐纳效率。',
        element: '梦',
      },
    ],
    灵品: [
      {
        name: '月华露晶',
        description:
          '露晶仅在月圆夜凝成，触之清凉且灵意绵长，守灯修士炼化后可洗涤杂念，使心神更清明并稳固灯心。',
        element: '星',
      },
    ],
    玄品: [
      {
        name: '归元地髓',
        description:
          '地髓沉凝如膏，外覆细密土纹，窥渊修士多以其调和香力，能在闭关时持续补益灯焰并修复暗损灯脉。',
        element: '梦',
      },
    ],
    真品: [
      {
        name: '天火灯髓',
        description:
          '灯髓色若熔金，静置亦有热流盘旋，蚀体修士以其制香可大幅提纯香性，亦可短时激发体内渊窍潜能。',
        element: '渊',
      },
    ],
    地品: [
      {
        name: '九霄幕髓',
        description:
          '此髓似液非液，偶有细幕在内游走，忘川修士淬体时加入一缕，可强固筋骨并提升幕法感应与爆发上限。',
        element: '帘',
      },
    ],
    天品: [
      {
        name: '太阴冰魄',
        description:
          '冰魄寒意内敛而不外泄，存于玉匣仍生霜纹，执灯修士借其镇压魔障火，可在生死关前稳住神魂波动。',
        element: '疫',
      },
    ],
    仙品: [
      {
        name: '鸿蒙道种',
        description:
          '道种微若芥子却自生灵辉，观想时可见符纹演化，掌灯修士多以其参悟本源流转，用于突破瓶颈前夕。',
        element: '噬',
      },
    ],
    神品: [
      {
        name: '混元天晶',
        description:
          '天晶内层隐含古老法链，灯压厚重却不外散，渡渊大能亦难轻得，常被视作镇宗底蕴与护界大阵核心。',
        element: '帘',
      },
    ],
  },
  aux: {
    凡品: [
      {
        name: '引灵粉',
        description:
          '粉末细若烟尘，遇灯油便会缓慢旋聚，常被用于低阶制香开炉阶段，可减少香力外泄并稳住初段火候。',
        element: '噬',
      },
    ],
    灵品: [
      {
        name: '安炉砂',
        description:
          '砂粒圆润且耐高温，撒入炉底后可均衡热脉，守灯香师常备此物，用于延长炼制窗口并降低香变风险。',
        element: '梦',
      },
    ],
    玄品: [
      {
        name: '净魂灵香',
        description:
          '点燃后烟气清淡不呛，能缓慢沉降心海杂波，窥渊修士闭关前常焚一缕，以稳定心念并提升观想专注度。',
        element: '尸',
      },
    ],
    真品: [
      {
        name: '御火灯液',
        description:
          '液体呈淡赤色，覆于器胚表面可形成护膜，蚀体器师以其过渡高温锻段，能显著降低器纹崩裂概率。',
        element: '渊',
      },
    ],
    地品: [
      {
        name: '镇纹玄墨',
        description:
          '墨色沉静如夜，落笔后纹路灯压极稳，忘川阵师多用其勾勒关键节点，确保大型封灵阵在冲击下不失衡。',
        element: '星',
      },
    ],
    天品: [
      {
        name: '空灵砂',
        description:
          '砂粒轻若无物却可自行归位，执灯修士布阵时掺入其中，能缓释空间扭曲造成的阵纹偏移与灵场噪动。',
        element: '噬',
      },
    ],
    仙品: [
      {
        name: '天工灯髓',
        description:
          '灯髓可与多类器材兼容，滴入后迅速调平冲突灯性，掌灯器师视其为万用辅材，用于高阶封灵器复锻。',
        element: '烛',
      },
    ],
    神品: [
      {
        name: '道纹仙漆',
        description:
          '此漆附着后能长期锁住道纹活性，历经幕火仍不剥落，渡渊阵师仅在护宗大阵重铸时才会慎重启用。',
        element: '星',
      },
    ],
  },
  gongfa_manual: {
    凡品: [
      {
        name: '养息归元诀',
        description:
          '此诀侧重平缓吐纳与周天回息，适合闻腥修士长期温养灯脉，虽无爆发威势，却能夯实根基并减少走火风险。',
        element: '尸',
      },
    ],
    灵品: [
      {
        name: '涵脉静心经',
        description:
          '经文强调心神内守与气息细调，守灯期持续修持可稳固灯台与灯心联动，使修行节奏更稳并提升悟性沉潜。',
        element: '星',
      },
    ],
    玄品: [
      {
        name: '厚土养元录',
        description:
          '此录重在沉气入脉与缓养灯焰，窥渊修士依序运转可逐步补强根骨承载，适合作为长期闭关的基础功法。',
        element: '梦',
      },
    ],
    真品: [
      {
        name: '玄冰明神篇',
        description:
          '篇中法门以静制躁，重在清心守一与心神淬炼，蚀体修士久修可压制杂念侵扰，并稳步拓展心海深度。',
        element: '疫',
      },
    ],
    地品: [
      {
        name: '幕魄锻脉经',
        description:
          '此经借幕意淬炼经络承压，强调循序渐进与内守回息，忘川修士若持久窥悟，可显著增强突破前的体脉韧性。',
        element: '帘',
      },
    ],
    天品: [
      {
        name: '沧澜归海典',
        description:
          '典中周天法门绵密悠长，注重梦涎汇流与本源回补，执灯修士闭关修持后，常可稳步扩展气海并固化道基。',
        element: '星',
      },
    ],
    仙品: [
      {
        name: '太虚衍道真解',
        description:
          '真解以观想配合内炼，强调悟道与根基同修，掌灯修士长期循行可持续纯化梦涎结构，并触及更高法则门槛。',
        element: '噬',
      },
    ],
    神品: [
      {
        name: '无极天演法',
        description:
          '此法将周天运转与道意推演合一，修持过程极重心性稳定，渡渊修士据此参修，方能在劫前凝练无缺根基。',
        element: '帘',
      },
    ],
  },
  skill_manual: {
    凡品: [
      {
        name: '裂岩掌法',
        description:
          '施术时以沉劲贯入掌心后骤然拍出，适合近身破防与打断，闻腥修士勤练可在短距交锋中迅速建立优势。',
        element: '梦',
      },
    ],
    灵品: [
      {
        name: '逐风遁术',
        description:
          '掐诀后灯影会在数息内骤然轻灵，常用于变位与追击，守灯修士若配合步法连用，可显著提升实战机动性。',
        element: '噬',
      },
    ],
    玄品: [
      {
        name: '焚芒指',
        description:
          '指诀凝火成线，出手快而穿透强，窥渊修士常以其先手破盾，再衔接后续攻伐术式，形成高压连段。',
        element: '渊',
      },
    ],
    真品: [
      {
        name: '玄霜锁印',
        description:
          '施术后寒印会沿目标经络急速蔓延，主控兼削弱，蚀体修士在群战中可凭此压制关键敌手并打乱其节奏。',
        element: '疫',
      },
    ],
    地品: [
      {
        name: '惊幕断岳斩',
        description:
          '引幕入刃后瞬发突进斩击，威势重在破甲与震魂，忘川修士一旦命中要害，常可直接瓦解对手护体灵罩。',
        element: '帘',
      },
    ],
    天品: [
      {
        name: '万木封灵印',
        description:
          '术印落成后会生出层层木缚，兼具束缚与耗灵效果，执灯修士常用于拖住强敌，为后续杀招争取窗口。',
        element: '尸',
      },
    ],
    仙品: [
      {
        name: '太虚斩神诀',
        description:
          '施术者需先聚神锁敌，再以虚刃断其神念回路，掌灯修士若在瞬息间把握破绽，可令对手神魂短暂失守。',
        element: '噬',
      },
    ],
    神品: [
      {
        name: '九霄寂灭印',
        description:
          '掐诀成印后会引动高天幕隙与寂灭气机，渡渊层次强者施展此术，可在极短时间内形成毁灭性镇杀领域。',
        element: '帘',
      },
    ],
  },
};

export function getFallbackMaterialPreset(
  type: MaterialType,
  quality: Quality,
): FallbackMaterialPreset {
  const pool = FALLBACK_MATERIAL_LIBRARY[type]?.[quality] ?? [];
  if (pool.length === 0) return EMPTY_PRESET;

  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? EMPTY_PRESET;
}

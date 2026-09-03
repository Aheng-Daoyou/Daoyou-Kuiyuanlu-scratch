import {
  AttributeType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import type { SectDefinitionWithoutPaths } from '../../core';
import {
  TIANYAN_DERIVATION,
  TIANYAN_HETU_PATH_ID,
  TIANYAN_LUOSHU_PATH_ID,
  TIANYAN_SECT_ID,
} from './ids';

const effects = { damage: 0.16, heal: 0.16, shield: 0.16, status: 0.18 };
const durationMilestones = [
  { level: 60, bonus: 1 },
  { level: 120, bonus: 2 },
];

export const TIANYAN_BASE_DEFINITION: SectDefinitionWithoutPaths = {
  id: TIANYAN_SECT_ID,
  name: '观星台',
  description:
    '隐世学者执《守灯》第六章，以星象推演前后命数的观星之地。门人知道得最多，疯得也最彻底；胜负不在单法强弱，而在每一次观星之后如何落下下一子。',
  raceIds: ['human'],
  configVersion: 1,
  foundationPassiveId: 'tianyan-runtime',
  combatResource: {
    id: TIANYAN_DERIVATION,
    name: '星衍',
    icon: '✨',
    max: 3,
  },
  methods: [
    {
      id: 'tianyan-canon',
      slot: 1,
      name: '《观星太初经》',
      isPrimary: true,
      description:
        '以太初为纸，以星象为字。经中不求写尽命数，只教门人辨明一着落下之后仍有多少去处。',
      growthProfile: { curve: 'balanced', effects, durationMilestones },
    },
    {
      id: 'wood-vitality',
      slot: 2,
      name: '《岁星生华录》',
      description:
        '岁星主生，荣枯并非两事；生机藏在未尽之处，也藏在愿意重新起卦的一息里。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAX_HP,
        type: ModifierType.ADD,
        maxValue: 0.12,
      } },
    },
    {
      id: 'fire-illumination',
      slot: 3,
      name: '《荧惑流火章》',
      description:
        '荧惑照见，也能焚去。持火者先辨所燃为何，方知余烬应当归向何处。',
      growthProfile: {
        curve: 'balanced', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAGIC_ATK,
        type: ModifierType.ADD,
        maxValue: 0.18,
      } },
    },
    {
      id: 'earth-bearing',
      slot: 4,
      name: '《镇星载物篇》',
      description:
        '镇星不与群星争先，却承受每一次落下的重量；能载其重，才能改其势。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAGIC_DEF,
        type: ModifierType.ADD,
        maxValue: 0.14,
      } },
    },
    {
      id: 'metal-severing',
      slot: 5,
      name: '《烛火辨真诀》',
      description:
        '烛光不只照形，也照去遮蔽与虚妄。焰芒所至，应先知道何物不必留下。',
      growthProfile: {
        curve: 'late', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAGIC_PENETRATION,
        type: ModifierType.FIXED,
        maxValue: 0.08,
      } },
    },
    {
      id: 'water-flowing',
      slot: 6,
      name: '《辰星行川法》',
      description: '辰星无常位，不与一宫相争。去路既改，仍能在落子间守住归处。',
      growthProfile: {
        curve: 'balanced', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAX_MP,
        type: ModifierType.ADD,
        maxValue: 0.18,
      } },
    },
  ],
  abilities: [
    {
      id: 'primordial-ray',
      kind: 'default',
      baseName: '太初玄光',
      description:
        '太初梦涎无色无形，不入五窍。指间玄光只问命中，不替之后的变化作答。',
      role: 'generator',
      unlock: { type: 'method', methodId: 'tianyan-canon', level: 1 },
      mpCost: 0,
      cooldown: 0,
    },
    {
      id: 'verdant-pulse',
      kind: 'active',
      baseName: '岁华生脉',
      description: '岁星循息而生，一端缠住敌势，一端牵回施术者尚未断绝的生机。',
      role: 'generator',
      unlock: { type: 'method', methodId: 'wood-vitality', level: 1 },
      mpCost: 80,
      cooldown: 0,
    },
    {
      id: 'myriad-wood-renewal',
      kind: 'active',
      baseName: '岁华回春',
      description:
        '不催枯枝强生新叶，只把散落的生机逐寸引回，使该续的一息重新接上。',
      role: 'defensive',
      unlock: { type: 'method', methodId: 'wood-vitality', level: 5 },
      mpCost: 180,
      cooldown: 4,
    },
    {
      id: 'flowing-flame',
      kind: 'active',
      baseName: '荧惑流照',
      description:
        '荧惑不作一瞬暴烈，沿息机流照而过；光所及处，余焰仍在暗中寻找可燃之物。',
      role: 'combo',
      unlock: { type: 'method', methodId: 'fire-illumination', level: 1 },
      mpCost: 100,
      cooldown: 0,
    },
    {
      id: 'lotus-in-fire',
      kind: 'active',
      baseName: '火里种莲',
      description: '借一线心火焚去附骨之秽，又在余烬中留下一点不肯熄灭的明光。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'fire-illumination', level: 5 },
      costs: [
        {
          resource: 'hp',
          mode: 'current_hp_ratio',
          ratio: 0.05,
          minimum: 1,
          retain: 1,
        },
      ],
      cooldown: 4,
    },
    {
      id: 'earth-bearing-seal',
      kind: 'active',
      baseName: '镇星镇形',
      description:
        '镇星之气落下，不急于压碎敌形，先在施术者身前立住一座可承来力的星岳。',
      role: 'defensive',
      unlock: { type: 'method', methodId: 'earth-bearing', level: 1 },
      mpCost: 100,
      cooldown: 0,
    },
    {
      id: 'boundless-earth',
      kind: 'active',
      baseName: '地载无疆',
      description:
        '地不拒轻重，也不问来处。法域展开之时，落在其中的每一道力量都先由厚土承接。',
      role: 'defensive',
      unlock: { type: 'method', methodId: 'earth-bearing', level: 5 },
      mpCost: 200,
      cooldown: 5,
    },
    {
      id: 'metal-cloud-cutter',
      kind: 'active',
      baseName: '太白裁云',
      description: '太白凝成一线，所裁并非云气，而是藏在云后的护持与虚势。',
      role: 'finisher',
      unlock: { type: 'method', methodId: 'metal-severing', level: 1 },
      mpCost: 120,
      cooldown: 0,
    },
    {
      id: 'white-star-breaker',
      kind: 'active',
      baseName: '太白破阵',
      description:
        '太白一线照入阵眼，先去遮蔽，再断灯机；锋芒不求伤重，只求所见再无虚假。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'metal-severing', level: 5 },
      mpCost: 160,
      cooldown: 2,
    },
    {
      id: 'dark-water-return',
      kind: 'active',
      baseName: '辰星回澜',
      description:
        '辰星不与来势正争，只在回澜时带走立足之力，使快者迟、满者退。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'water-flowing', level: 1 },
      mpCost: 100,
      cooldown: 0,
    },
    {
      id: 'heavenly-river-cleansing',
      kind: 'active',
      baseName: '辰星洗心',
      description:
        '引辰星过心窍，不洗记忆，也不洗选择，只带走此刻不应继续停留的浊意。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'water-flowing', level: 5 },
      mpCost: 180,
      cooldown: 4,
    },
    {
      id: 'shift-palace',
      kind: 'active',
      baseName: '移宫换宿',
      description:
        '星宿未移，观测之宫先改。法印沿相生次序转过一位，原本无路的下一法便有了新的去处。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'tianyan-canon', level: 5 },
      mpCost: 120,
      cooldown: 2,
    },
    {
      id: 'five-qi-repository',
      kind: 'active',
      baseName: '五曜归藏',
      description:
        '推演不必每次走到尽头。将尚未用尽的法印收回太初，余势仍可归为护身、养气与下一法的凭依。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'tianyan-canon', level: 10 },
      mpCost: 160,
      cooldown: 4,
    },
    {
      id: 'tianyan-runtime',
      kind: 'passive',
      baseName: '太初衍脉',
      description:
        '太初梦涎本无定色。天衍神通不受异窍失配影响；与本命窍相同的灯律仍可获得窍共鸣。',
      role: 'combo',
      unlock: { type: 'always' },
      visibility: 'internal',
    },
    {
      id: 'hetu-runtime',
      kind: 'passive',
      baseName: '河图周天',
      description: '三数成图，令伤势、气血与灯焰在同一轮转中续接。',
      role: 'combo',
      unlock: { type: 'active_path', pathId: TIANYAN_HETU_PATH_ID },
      visibility: 'internal',
    },
    {
      id: 'luoshu-runtime',
      kind: 'passive',
      baseName: '洛书断局',
      description: '三数定局，在敌势成形之前追加一次无属性断击。',
      role: 'finisher',
      unlock: { type: 'active_path', pathId: TIANYAN_LUOSHU_PATH_ID },
      visibility: 'internal',
    },
  ],
  onboarding: {
    initialContribution: 30,
    initialMethods: {
      'tianyan-canon': 5,
      'wood-vitality': 1,
      'fire-illumination': 1,
      'earth-bearing': 1,
      'metal-severing': 1,
      'water-flowing': 1,
    },
    initialAbilityLoadout: [
      'verdant-pulse',
      'flowing-flame',
      'dark-water-return',
      'shift-palace',
    ],
  },
};

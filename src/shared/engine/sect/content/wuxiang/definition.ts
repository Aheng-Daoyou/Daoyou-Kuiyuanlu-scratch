import {
  AttributeType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import type { SectDefinitionWithoutPaths } from '../../core';
import {
  WUXIANG_DEMON_PATH_ID,
  WUXIANG_MIRROR_PATH_ID,
  WUXIANG_SECT_ID,
  WUXIANG_WAR_INTENT,
} from './ids';

const effects = { damage: 0.12, heal: 0.2, shield: 0.2, status: 0.18 };
const durationMilestones = [
  { level: 60, bonus: 1 },
  { level: 120, bonus: 2 },
];

export const WUXIANG_BASE_DEFINITION: SectDefinitionWithoutPaths = {
  id: WUXIANG_SECT_ID,
  name: '白莲乳母教',
  description:
    '邪教，信奉「乳母」，执《守灯》第五章（残）。此教收容乱世孤女，它作恶，但它收容的人确实无处可去；门人以皮囊为道场，以气血燃莲灯，在胎相、血相、莲相三相中自证哺身。',
  raceIds: ['human'],
  configVersion: 2,
  foundationPassiveId: 'wuxiang-runtime',
  combatResource: {
    id: WUXIANG_WAR_INTENT,
    name: '莲念',
    icon: '👹',
    max: 6,
  },
  methods: [
    {
      id: 'wuxiang-canon',
      slot: 1,
      name: '《乳母哺真解》',
      isPrimary: true,
      description: '观色身如皮囊，胎藏乳母之念；于一念之间容胎、容血，亦容莲。',
      growthProfile: { curve: 'balanced', effects, durationMilestones },
    },
    {
      id: 'blood-lotus',
      slot: 2,
      name: '《血渊生莲》',
      description: '血渊不净，莲亦由此而生；知其污浊，方能借之渡身。',
      growthProfile: {
        curve: 'balanced', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAX_HP,
        type: ModifierType.ADD,
        maxValue: 0.2,
      } },
    },
    {
      id: 'white-bone',
      slot: 3,
      name: '《皮囊照身》',
      description: '去皮肉浮相，见皮囊本真；以朽坏之身承受来力。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.DEF,
        type: ModifierType.ADD,
        maxValue: 0.16,
      } },
    },
    {
      id: 'wrathful-ming',
      slot: 4,
      name: '《嗔王显相》',
      description: '嗔王怒目，不为嗔心，只借烈相斩断迟疑。',
      growthProfile: {
        curve: 'late', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.ATK,
        type: ModifierType.ADD,
        maxValue: 0.14,
      } },
    },
    {
      id: 'six-senses',
      slot: 5,
      name: '《六感守胎》',
      description: '声色香味触法皆至于前，胎识自守，不随外境转移。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.CONTROL_RESISTANCE,
        type: ModifierType.FIXED,
        maxValue: 0.1,
      } },
    },
    {
      id: 'reed-crossing-method',
      slot: 6,
      name: '《一苇渡苦》',
      description: '苦海无边，轻身不待舟楫；一苇所向，只问彼岸。',
      growthProfile: {
        curve: 'balanced', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAGIC_DEF,
        type: ModifierType.ADD,
        maxValue: 0.12,
      } },
    },
  ],
  abilities: [
    {
      id: 'flower-heart',
      kind: 'default',
      baseName: '拈莲叩心',
      description:
        '指间拈莲，叩问的却是敌我同一颗心。胎相立其因，血相照其果，莲相令因果同现。',
      role: 'generator',
      unlock: { type: 'method', methodId: 'wuxiang-canon', level: 1 },
      cooldown: 0,
    },
    {
      id: 'blood-tide',
      kind: 'active',
      baseName: '血莲听潮',
      description:
        '不拒血莲来潮，先听清每一道苦声从何处生，再于回澜时借势渡身。',
      role: 'defensive',
      unlock: { type: 'method', methodId: 'blood-lotus', level: 1 },
      cooldown: 3,
    },
    {
      id: 'three-knocks',
      kind: 'active',
      baseName: '三叩莲门',
      description: '一叩问因，二叩问果，三叩之后，门内门外皆由一念开合。',
      role: 'combo',
      unlock: { type: 'method', methodId: 'white-bone', level: 3 },
      cooldown: 2,
    },
    {
      id: 'observe-calamity',
      kind: 'active',
      baseName: '闭目观劫',
      description: '闭目并非不见，而是不被劫相夺去心神；开眼之时，劫已照明。',
      role: 'defensive',
      unlock: { type: 'method', methodId: 'wrathful-ming', level: 3 },
      cooldown: 4,
    },
    {
      id: 'five-skandhas',
      kind: 'active',
      baseName: '照见胎蕴',
      description:
        '色受想行识逐一照破。胎相辨其虚实，血相借火自渡，莲相令诸蕴俱空。',
      role: 'utility',
      unlock: { type: 'method', methodId: 'six-senses', level: 3 },
      cooldown: 3,
    },
    {
      id: 'reed-crossing',
      kind: 'active',
      baseName: '一苇横江',
      description:
        '江阔浪急，脚下只留一苇；胎相守住此岸，血相强渡彼岸，莲相则知两岸非岸。',
      role: 'defensive',
      unlock: { type: 'method', methodId: 'reed-crossing-method', level: 3 },
      cooldown: 5,
    },
    {
      id: 'turn-form',
      kind: 'active',
      baseName: '一念生莲',
      description:
        '莲念未足时，一念尚伏于心；莲念既成，胎、血与莲只在翻掌之间。',
      role: 'finisher',
      unlock: { type: 'method', methodId: 'wuxiang-canon', level: 5 },
      cooldown: 0,
    },
    {
      id: 'wuxiang-runtime',
      kind: 'passive',
      baseName: '不坏皮囊',
      description:
        '皮囊即是道场：最大气血提高，身陷危境时更能承受迎面而来的伤害。',
      role: 'defensive',
      unlock: { type: 'always' },
      visibility: 'internal',
    },
    {
      id: 'mirror-core',
      kind: 'passive',
      baseName: '莲镜照业',
      description: '来力皆留其痕，因满果熟时照还来处。',
      role: 'defensive',
      unlock: { type: 'active_path', pathId: WUXIANG_MIRROR_PATH_ID },
      visibility: 'internal',
    },
    {
      id: 'demon-core',
      kind: 'passive',
      baseName: '哺心渡厄',
      description: '以气血作舟、莲念作楫，于一息将尽之际横渡生死。',
      role: 'combo',
      unlock: { type: 'active_path', pathId: WUXIANG_DEMON_PATH_ID },
      visibility: 'internal',
    },
  ],
  onboarding: {
    initialContribution: 30,
    initialMethods: {
      'wuxiang-canon': 5,
      'blood-lotus': 3,
      'white-bone': 3,
      'wrathful-ming': 3,
      'six-senses': 3,
      'reed-crossing-method': 3,
    },
    initialAbilityLoadout: [
      'turn-form',
      'blood-tide',
      'three-knocks',
      'observe-calamity',
    ],
  },
};

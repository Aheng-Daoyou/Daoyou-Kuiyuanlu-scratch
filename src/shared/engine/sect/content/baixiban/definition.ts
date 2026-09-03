import {
  AttributeType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import type { SectDefinitionWithoutPaths } from '../../core';
import { HEAVY_SWORD_PATH_ID, BAIXIBAN_SECT_ID } from './ids';

const effects = { damage: 0.17, heal: 0.12, shield: 0.17, status: 0.12 };
const durationMilestones = [
  { level: 60, bonus: 1 },
  { level: 120, bonus: 2 },
];

export const BAIXIBAN_BASE_DEFINITION: SectDefinitionWithoutPaths = {
  id: BAIXIBAN_SECT_ID,
  name: '百戏班',
  description:
    '江湖艺人巡游天下，执《守灯》第三章，是封灵器铸造世家与情报网，也是散修之家。门人凭一身戏念行走江湖，在照影游尘与守拙藏锋二道中自定戏途。',
  raceIds: ['human'],
  configVersion: 4,
  foundationPassiveId: 'baixiban-runtime',
  combatResource: {
    id: 'sect.baixiban.stage-grace',
    name: '戏念',
    icon: '🎭',
    max: 6,
  },
  methods: [
    {
      id: 'baixiban-canon',
      slot: 1,
      name: '《百戏谱》',
      isPrimary: true,
      description:
        '历代门人将一生所见与问戏所得录入其中。此录不定身段，只论器从何起、当向何处。',
      growthProfile: { curve: 'balanced', effects, durationMilestones },
    },
    {
      id: 'sword-guidance',
      slot: 3,
      name: '《走场歌》',
      description: '以气驭器，使锋芒连绵不绝；戏气养于胸臆，动时如长风振野。',
      growthProfile: {
        curve: 'balanced', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.ATK,
        type: ModifierType.ADD,
        maxValue: 0.22,
      } },
    },
    {
      id: 'void-step',
      slot: 4,
      name: '《圆场步》',
      description: '御气踏虚，身随器走；方寸之间腾挪换位，不使自身困于敌势。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.EVASION_RATE,
        type: ModifierType.FIXED,
        maxValue: 0.05,
      } },
    },
    {
      id: 'edge-cleansing',
      slot: 2,
      name: '《观微戏意》',
      description: '静观一息之变，明察毫厘之机；敌势未成，破绽已映于戏心。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        countMilestones: [
          { level: 60, bonus: 1 },
          { level: 120, bonus: 2 },
          { level: 180, bonus: 3 },
        ],
        panelModifier: {
        attrType: AttributeType.ACCURACY,
        type: ModifierType.FIXED,
        maxValue: 0.06,
      } },
    },
    {
      id: 'origin-returning',
      slot: 5,
      name: '《澄心戏诀》',
      description: '收束心神，使戏念澄明；外法虽变化万端，不能动摇持器之念。',
      growthProfile: {
        curve: 'early', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.MAGIC_DEF,
        type: ModifierType.ADD,
        maxValue: 0.1,
      } },
    },
    {
      id: 'sword-nurturing',
      slot: 6,
      name: '《不灭戏骨》',
      description: '以身作器，以骨为脊，经千锤百炼而锋芒不折、形神不摧。',
      growthProfile: {
        curve: 'late', effects, durationMilestones,
        panelModifier: {
        attrType: AttributeType.DEF,
        type: ModifierType.ADD,
        maxValue: 0.14,
      } },
    },
  ],
  abilities: [
    {
      id: 'plain-sword',
      kind: 'default',
      baseName: '亮相',
      description:
        '百戏班入门第一式。招式简明，不求出奇，重在出手之前先明来意。',
      unlock: { type: 'method', methodId: 'baixiban-canon', level: 1 },
      role: 'generator',
      mpCost: 0,
      cooldown: 0,
    },
    {
      id: 'sect-ultimate',
      kind: 'active',
      baseName: '谢幕',
      description: '戏念至极，平生所见皆归于一台。此戏不借天威，只决眼前之局。',
      unlock: { type: 'method', methodId: 'baixiban-canon', level: 10 },
      role: 'finisher',
      mpCost: 200,
      cooldown: 4,
    },
    {
      id: 'guiding-sword',
      kind: 'active',
      baseName: '起势',
      description: '戏念初动，如沧海生澜；一势既起，后招便随之而来。',
      unlock: { type: 'method', methodId: 'sword-guidance', level: 1 },
      role: 'generator',
      mpCost: 80,
      cooldown: 0,
    },
    {
      id: 'linked-edge',
      kind: 'active',
      baseName: '走场',
      description: '器锋纵横，数势相连；前器未尽，后器已越其锋。',
      unlock: { type: 'method', methodId: 'sword-guidance', level: 5 },
      role: 'combo',
      mpCost: 140,
      cooldown: 2,
    },
    {
      id: 'turning-body',
      kind: 'active',
      baseName: '压轴',
      description: '收器藏势，静候敌招；待来势真正落下，再以后发之器应之。',
      unlock: { type: 'method', methodId: 'void-step', level: 3 },
      role: 'defensive',
      mpCost: 160,
      cooldown: 3,
    },
    {
      id: 'shadow-step',
      kind: 'active',
      baseName: '圆场',
      description: '身随器行，进退不滞；器光掠过之后，唯余风雪未定。',
      unlock: { type: 'method', methodId: 'void-step', level: 5 },
      role: 'generator',
      mpCost: 120,
      cooldown: 4,
    },
    {
      id: 'breaking-edge',
      kind: 'active',
      baseName: '破台',
      description: '戏念照见虚实，以锋芒截断敌方变化，使诸般护持无所藏形。',
      unlock: { type: 'method', methodId: 'edge-cleansing', level: 3 },
      role: 'utility',
      mpCost: 160,
      cooldown: 3,
    },
    {
      id: 'sword-aegis',
      kind: 'active',
      baseName: '心戏通明',
      description: '心念澄澈，戏念自明；外法临身，只见其变，不为其所动。',
      unlock: { type: 'method', methodId: 'origin-returning', level: 3 },
      role: 'defensive',
      mpCost: 180,
      cooldown: 5,
    },
    {
      id: 'nurturing-sword',
      kind: 'active',
      baseName: '人戏合一',
      description: '气随意转，意随器行；持器之人与手中之器再无迟滞。',
      unlock: { type: 'method', methodId: 'sword-nurturing', level: 3 },
      role: 'defensive',
      mpCost: 180,
      cooldown: 5,
    },
    {
      id: 'baixiban-runtime',
      kind: 'passive',
      baseName: '炉火铸骨',
      description:
        '以炉火淬炼筋骨、以戏台护持身形。常驻提高最大气血、物理防御与控制抗性；受击时蓄集戏念，炉火越旺，百戏班越是沉稳。',
      role: 'defensive',
      unlock: { type: 'always' },
      visibility: 'internal',
    },
    {
      id: 'heavy-shield-momentum',
      kind: 'passive',
      baseName: '台柱不摇',
      description: '护盾吸收直接伤害后，每回合获得一点戏念。',
      role: 'defensive',
      unlock: { type: 'active_path', pathId: HEAVY_SWORD_PATH_ID },
      visibility: 'internal',
    },
  ],
  onboarding: {
    initialContribution: 30,
    initialMethods: {
      'baixiban-canon': 5,
      'sword-guidance': 1,
      'void-step': 1,
      'edge-cleansing': 1,
      'origin-returning': 1,
      'sword-nurturing': 1,
    },
    initialAbilityLoadout: ['guiding-sword', null, null, null],
  },
};

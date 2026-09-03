import {
  AttributeType,
  ModifierType,
} from '@shared/engine/battle-v5/core/types';
import type { SectDefinitionWithoutPaths } from '../../core';
import { HEAVY_SWORD_PATH_ID, LINGXIAO_SECT_ID } from './ids';

const effects = { damage: 0.17, heal: 0.12, shield: 0.17, status: 0.12 };
const durationMilestones = [
  { level: 60, bonus: 1 },
  { level: 120, bonus: 2 },
];

export const LINGXIAO_BASE_DEFINITION: SectDefinitionWithoutPaths = {
  id: LINGXIAO_SECT_ID,
  name: '太乙清都观',
  description:
    '天下正道之首，执《守灯》第二章。门人燃心灯、炼香火，在照影游尘与守拙藏锋二道中自定守灯之途。',
  raceIds: ['human'],
  configVersion: 4,
  foundationPassiveId: 'lingxiao-runtime',
  combatResource: {
    id: 'sect.lingxiao.sword-momentum',
    name: '香火',
    icon: '🏮',
    max: 6,
  },
  methods: [
    {
      id: 'lingxiao-canon',
      slot: 1,
      name: '《守灯录》',
      isPrimary: true,
      description:
        '历代门人将一生所见与点灯所得录入其中。此录不定灯式，只论灯从何起、当向何处照。',
      growthProfile: { curve: 'balanced', effects, durationMilestones },
    },
    {
      id: 'sword-guidance',
      slot: 3,
      name: '《香火长歌》',
      description: '以香驭灯，使灯火连绵不绝；香火养于胸臆，动时如长风振野。',
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
      name: '《照影步》',
      description: '御气踏影，身随灯走；方寸之间腾挪换位，不使自身困于敌势。',
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
      name: '《观微灯意》',
      description: '静观一息之变，明察毫厘之机；敌势未成，破绽已映于灯心。',
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
      name: '《澄心灯诀》',
      description: '收束心神，使灯意澄明；外法虽变化万端，不能动摇持灯之念。',
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
      name: '《不灭灯体》',
      description: '以身作灯，以骨为芯，经千锤百炼而灯焰不折、形神不摧。',
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
      baseName: '燃灯式',
      description:
        '太乙清都观入门第一式。招式简明，不求出奇，重在点灯之前先明来意。',
      unlock: { type: 'method', methodId: 'lingxiao-canon', level: 1 },
      role: 'generator',
      mpCost: 0,
      cooldown: 0,
    },
    {
      id: 'sect-ultimate',
      kind: 'active',
      baseName: '照灯平生',
      description: '灯意至极，平生所见皆归于一焰。此灯不借天威，只决眼前之局。',
      unlock: { type: 'method', methodId: 'lingxiao-canon', level: 10 },
      role: 'finisher',
      mpCost: 200,
      cooldown: 4,
    },
    {
      id: 'guiding-sword',
      kind: 'active',
      baseName: '灯起沧澜',
      description: '灯意初动，如沧海生澜；一势既起，后招便随之而来。',
      unlock: { type: 'method', methodId: 'sword-guidance', level: 1 },
      role: 'generator',
      mpCost: 80,
      cooldown: 0,
    },
    {
      id: 'linked-edge',
      kind: 'active',
      baseName: '灯荡山河',
      description: '灯焰纵横，数势相连；前灯未尽，后灯已越其焰。',
      unlock: { type: 'method', methodId: 'sword-guidance', level: 5 },
      role: 'combo',
      mpCost: 140,
      cooldown: 2,
    },
    {
      id: 'turning-body',
      kind: 'active',
      baseName: '守灯听漏',
      description: '守灯藏势，静候敌招；待来势真正落下，再以后发之灯应之。',
      unlock: { type: 'method', methodId: 'void-step', level: 3 },
      role: 'defensive',
      mpCost: 160,
      cooldown: 3,
    },
    {
      id: 'shadow-step',
      kind: 'active',
      baseName: '踏影无痕',
      description: '身随灯行，进退不滞；灯影掠过之后，唯余灯辉未定。',
      unlock: { type: 'method', methodId: 'void-step', level: 5 },
      role: 'generator',
      mpCost: 120,
      cooldown: 4,
    },
    {
      id: 'breaking-edge',
      kind: 'active',
      baseName: '一灯破妄',
      description: '灯意照见虚实，以灯焰截断敌方变化，使诸般护持无所藏形。',
      unlock: { type: 'method', methodId: 'edge-cleansing', level: 3 },
      role: 'utility',
      mpCost: 160,
      cooldown: 3,
    },
    {
      id: 'sword-aegis',
      kind: 'active',
      baseName: '灯心通明',
      description: '心念澄澈，灯意自明；外法临身，只见其变，不为其所动。',
      unlock: { type: 'method', methodId: 'origin-returning', level: 3 },
      role: 'defensive',
      mpCost: 180,
      cooldown: 5,
    },
    {
      id: 'nurturing-sword',
      kind: 'active',
      baseName: '人灯合一',
      description: '气随意转，意随灯行；持灯之人与手中之焰再无迟滞。',
      unlock: { type: 'method', methodId: 'sword-nurturing', level: 3 },
      role: 'defensive',
      mpCost: 180,
      cooldown: 5,
    },
    {
      id: 'lingxiao-runtime',
      kind: 'passive',
      baseName: '灯骨淬心',
      description: '以灯意淬炼筋骨，常驻提高暴击率与物理穿透。',
      role: 'combo',
      unlock: { type: 'always' },
      visibility: 'internal',
    },
    {
      id: 'heavy-shield-momentum',
      kind: 'passive',
      baseName: '殿柱如山',
      description: '护盾吸收直接伤害后，每回合获得一点香火。',
      role: 'defensive',
      unlock: { type: 'active_path', pathId: HEAVY_SWORD_PATH_ID },
      visibility: 'internal',
    },
  ],
  onboarding: {
    initialContribution: 30,
    initialMethods: {
      'lingxiao-canon': 5,
      'sword-guidance': 1,
      'void-step': 1,
      'edge-cleansing': 1,
      'origin-returning': 1,
      'sword-nurturing': 1,
    },
    initialAbilityLoadout: ['guiding-sword', null, null, null],
  },
};

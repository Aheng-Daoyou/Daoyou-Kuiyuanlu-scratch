import { CreationTags } from '@shared/engine/shared/tag-domain';
import type { EnemyClan } from '@shared/types/constants';
import type { EnemyClanProfile } from './types';

// 敌人三族属性倾向（窥渊录唯一敌人分类）
//  - 腌物：被梦涎腌坏的凡人与尸体，保留生前执念；最常见野怪，执念即弱点。
//  - 遗种：泡影之夜幸存的旧纪元残留物；自带规则特性，中型 BOSS。
//  - 投影：天翁梦中渗出的「影子」；不可杀，只能封印/驱逐/交易。
export const ENEMY_CLAN_PROFILES: Record<EnemyClan, EnemyClanProfile> = {
  腌物: {
    attributeWeights: {
      vitality: 1.1,
      strength: 1.05,
      spirit: 0.85,
      endurance: 1.1,
      speed: 0.9,
      willpower: 0.9,
    },
    elementPool: ['尸', '噬', '疫', '梦'],
    narrativeTags: ['执念', '腌化', '成群'],
    slotPriority: ['weapon', 'armor', 'accessory'],
    techniqueTags: [CreationTags.MATERIAL.SEMANTIC_BLOOD, CreationTags.MATERIAL.SEMANTIC_BONE],
    skillTags: [CreationTags.MATERIAL.SEMANTIC_BLADE, CreationTags.MATERIAL.SEMANTIC_BURST],
    artifactTags: [CreationTags.MATERIAL.SEMANTIC_BONE, CreationTags.MATERIAL.SEMANTIC_GUARD],
  },
  遗种: {
    attributeWeights: {
      vitality: 0.9,
      strength: 1.15,
      spirit: 1.2,
      endurance: 1.0,
      speed: 0.9,
      willpower: 1.15,
    },
    elementPool: ['渊', '星', '帘', '疫'],
    narrativeTags: ['规则', '旧纪元', '不可名状'],
    slotPriority: ['weapon', 'accessory', 'armor'],
    techniqueTags: [CreationTags.MATERIAL.SEMANTIC_FORMATION, CreationTags.MATERIAL.SEMANTIC_ILLUSION],
    skillTags: [CreationTags.MATERIAL.SEMANTIC_FREEZE, CreationTags.MATERIAL.SEMANTIC_ILLUSION],
    artifactTags: [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_GUARD],
  },
  投影: {
    attributeWeights: {
      vitality: 0.8,
      strength: 0.75,
      spirit: 1.35,
      endurance: 0.8,
      speed: 1.1,
      willpower: 1.35,
    },
    elementPool: ['梦', '渊', '帘', '星'],
    narrativeTags: ['倒影', '注视', '不可杀'],
    slotPriority: ['accessory', 'weapon', 'armor'],
    techniqueTags: [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_SPIRIT],
    skillTags: [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_FREEZE],
    artifactTags: [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_SPIRIT],
  },
};

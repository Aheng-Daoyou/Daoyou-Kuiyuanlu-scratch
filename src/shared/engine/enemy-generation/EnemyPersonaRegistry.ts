import type { EnemyClan, EquipmentSlot } from '@shared/types/constants';
import type {
  EnemyArtifactRole,
  EnemyPersonaArtifactPlan,
  EnemyPersonaDefinition,
  EnemyPersonaSkillPlan,
  EnemyPersonaTechniquePlan,
  EnemySkillRole,
} from './types';

function technique(
  archetypeIds: string[],
  narrativeTags: string[],
  tagOverlays: string[] = [],
): EnemyPersonaTechniquePlan {
  return {
    role: 'technique',
    archetypeIds,
    narrativeTags,
    tagOverlays,
  };
}

function skill(
  role: EnemySkillRole,
  archetypeIds: string[],
  narrativeTags: string[],
  tagOverlays: string[] = [],
): EnemyPersonaSkillPlan {
  return {
    role,
    archetypeIds,
    narrativeTags,
    tagOverlays,
  };
}

function artifact(
  slot: EquipmentSlot,
  role: EnemyArtifactRole,
  archetypeIds: string[],
  narrativeTags: string[],
  tagOverlays: string[] = [],
): EnemyPersonaArtifactPlan {
  return {
    slot,
    role,
    archetypeIds,
    narrativeTags,
    tagOverlays,
  };
}

export const ENEMY_PERSONAS: Record<EnemyClan, EnemyPersonaDefinition[]> = {
  腌物: [
    {
      id: 'yanwu-clinger',
      label: '执念腌物',
      narrativeTags: ['执念', '成群'],
      technique: technique(['yanwu-technique-taint'], ['腌化'], ['梦涎']),
      skills: [
        skill('offense', ['yanwu-skill-rend', 'yanwu-skill-bind'], ['撕扯'], ['流血']),
        skill('control', ['yanwu-skill-bind', 'yanwu-skill-rend'], ['涎缚'], ['迟滞']),
        skill('guard', ['yanwu-skill-shroud', 'yanwu-skill-regress'], ['腌躯'], ['护体']),
        skill('sustain', ['yanwu-skill-regress', 'yanwu-skill-shroud'], ['吞涎'], ['回生']),
      ],
      artifacts: {
        weapon: artifact('weapon', 'weapon', ['yanwu-artifact-weapon'], ['腌骨'], ['撕裂']),
        armor: artifact('armor', 'armor', ['yanwu-artifact-armor'], ['腌躯'], ['护体']),
        accessory: artifact('accessory', 'accessory', ['yanwu-artifact-accessory'], ['执念'], ['锁念']),
      },
      accentSkillRole: 'control',
      accentArtifactSlot: 'weapon',
    },
    {
      id: 'yanwu-horde',
      label: '腌群之首',
      narrativeTags: ['成群', '压迫'],
      technique: technique(['yanwu-technique-taint'], ['腌潮'], ['群相']),
      skills: [
        skill('guard', ['yanwu-skill-shroud', 'yanwu-skill-regress'], ['硬扛'], ['腌躯']),
        skill('sustain', ['yanwu-skill-regress', 'yanwu-skill-shroud'], ['回涌'], ['续命']),
        skill('offense', ['yanwu-skill-rend', 'yanwu-skill-bind'], ['撕杀'], ['扑袭']),
        skill('control', ['yanwu-skill-bind', 'yanwu-skill-rend'], ['缠斗'], ['压迫']),
      ],
      artifacts: {
        weapon: artifact('weapon', 'weapon', ['yanwu-artifact-weapon'], ['利爪'], ['骨刃']),
        armor: artifact('armor', 'armor', ['yanwu-artifact-armor'], ['抗打'], ['腌护']),
        accessory: artifact('accessory', 'accessory', ['yanwu-artifact-accessory'], ['群念'], ['执潮']),
      },
      accentSkillRole: 'offense',
      accentArtifactSlot: 'armor',
    },
  ],
  遗种: [
    {
      id: 'yizhong-relic',
      label: '旧纪遗种',
      narrativeTags: ['规则', '旧纪元'],
      technique: technique(['yizhong-technique-taint'], ['残则'], ['旧纪']),
      skills: [
        skill('control', ['yizhong-skill-bind', 'yizhong-skill-whisper'], ['规则'], ['定身']),
        skill('offense', ['yizhong-skill-whisper', 'yizhong-skill-bind'], ['低语'], ['蚀神']),
        skill('guard', ['yizhong-skill-wall', 'yizhong-skill-regress'], ['纪元壁'], ['护体']),
        skill('sustain', ['yizhong-skill-regress', 'yizhong-skill-wall'], ['残纪'], ['回生']),
      ],
      artifacts: {
        weapon: artifact('weapon', 'weapon', ['yizhong-artifact-weapon'], ['旧则'], ['凶锋']),
        armor: artifact('armor', 'armor', ['yizhong-artifact-armor'], ['残纪'], ['护躯']),
        accessory: artifact('accessory', 'accessory', ['yizhong-artifact-accessory'], ['规则'], ['锁则']),
      },
      accentSkillRole: 'offense',
      accentArtifactSlot: 'accessory',
    },
    {
      id: 'yizhong-warden',
      label: '守则遗种',
      narrativeTags: ['守则', '拖战'],
      technique: technique(['yizhong-technique-taint'], ['守则'], ['旧律']),
      skills: [
        skill('guard', ['yizhong-skill-wall', 'yizhong-skill-regress'], ['壁障'], ['护体']),
        skill('sustain', ['yizhong-skill-regress', 'yizhong-skill-wall'], ['修补'], ['回生']),
        skill('control', ['yizhong-skill-bind', 'yizhong-skill-whisper'], ['锁则'], ['迟滞']),
        skill('offense', ['yizhong-skill-whisper', 'yizhong-skill-bind'], ['蚀神'], ['低语']),
      ],
      artifacts: {
        weapon: artifact('weapon', 'weapon', ['yizhong-artifact-weapon'], ['旧锋'], ['凶威']),
        armor: artifact('armor', 'armor', ['yizhong-artifact-armor'], ['残纪'], ['缓冲']),
        accessory: artifact('accessory', 'accessory', ['yizhong-artifact-accessory'], ['守则'], ['旧律']),
      },
      accentSkillRole: 'control',
      accentArtifactSlot: 'armor',
    },
  ],
  投影: [
    {
      id: 'guixi-whisperer',
      label: '低语蚀心',
      narrativeTags: ['低语', '蚀神'],
      technique: technique(['guixi-technique-taint'], ['浸染'], ['梦涎']),
      skills: [
        skill('control', ['guixi-skill-whisper', 'guixi-skill-bind'], ['蚀神'], ['低语']),
        skill('offense', ['guixi-skill-whisper', 'guixi-skill-bind'], ['凝视'], ['乱神']),
        skill('guard', ['guixi-skill-shroud', 'guixi-skill-regress'], ['梦涎'], ['护体']),
        skill('sustain', ['guixi-skill-regress', 'guixi-skill-shroud'], ['异化'], ['回生']),
      ],
      artifacts: {
        weapon: artifact('weapon', 'weapon', ['guixi-artifact-weapon'], ['梦涎'], ['钩蚀']),
        armor: artifact('armor', 'armor', ['guixi-artifact-armor'], ['腌躯'], ['护体']),
        accessory: artifact('accessory', 'accessory', ['guixi-artifact-accessory'], ['投影'], ['诡饰']),
      },
      accentSkillRole: 'control',
      accentArtifactSlot: 'accessory',
    },
    {
      id: 'guixi-stalker',
      label: '无面跟随',
      narrativeTags: ['跟随', '凝视'],
      technique: technique(['guixi-technique-taint'], ['潜随'], ['投影']),
      skills: [
        skill('control', ['guixi-skill-bind', 'guixi-skill-whisper'], ['凝视'], ['定身']),
        skill('offense', ['guixi-skill-whisper', 'guixi-skill-bind'], ['蚀神'], ['低语']),
        skill('guard', ['guixi-skill-shroud', 'guixi-skill-regress'], ['梦涎'], ['裹躯']),
        skill('sustain', ['guixi-skill-regress', 'guixi-skill-shroud'], ['吞涎'], ['回生']),
      ],
      artifacts: {
        weapon: artifact('weapon', 'weapon', ['guixi-artifact-weapon'], ['影钩'], ['诡刃']),
        armor: artifact('armor', 'armor', ['guixi-artifact-armor'], ['腌皮'], ['护体']),
        accessory: artifact('accessory', 'accessory', ['guixi-artifact-accessory'], ['影坠'], ['投影']),
      },
      accentSkillRole: 'offense',
      accentArtifactSlot: 'weapon',
    },
  ],
};

export function getEnemyPersonas(clan: EnemyClan): EnemyPersonaDefinition[] {
  return ENEMY_PERSONAS[clan];
}

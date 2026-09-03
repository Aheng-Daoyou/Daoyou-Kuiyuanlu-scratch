import { CreationTags } from '@shared/engine/shared/tag-domain';
import type { EnemyClan, EquipmentSlot } from '@shared/types/constants';
import type { EnemyArchetypeDefinition } from './types';

const bias = (tag: string, weight: number = 0.8) => ({ tag, weight });

function slotArtifact(
  id: string,
  slot: EquipmentSlot,
  label: string,
  fallbackSuffix: string,
  dominantTags: string[],
  fallbackDescription: string,
  options: Partial<EnemyArchetypeDefinition> = {},
): EnemyArchetypeDefinition {
  return {
    id,
    productType: 'artifact',
    label,
    slot,
    elementMode: slot === 'armor' ? 'secondary' : 'primary',
    dominantTags,
    fallbackSuffix,
    fallbackDescription,
    ...options,
  };
}

export const ENEMY_ARCHETYPES: Record<
  EnemyClan,
  {
    technique: EnemyArchetypeDefinition[];
    skills: EnemyArchetypeDefinition[];
    artifacts: EnemyArchetypeDefinition[];
  }
> = {
  腌物: {
    technique: [
      {
        id: 'yanwu-technique-taint',
        productType: 'gongfa',
        label: '腌化心法',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_BLOOD,
          CreationTags.MATERIAL.SEMANTIC_BONE,
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
        ],
        positiveTagBiases: [bias(CreationTags.MATERIAL.SEMANTIC_BLOOD)],
        fallbackSuffix: '腌化录',
        fallbackDescription: '以梦涎腌坏残躯、借生前执念续命的诡异法门。',
      },
    ],
    skills: [
      {
        id: 'yanwu-skill-rend',
        productType: 'skill',
        label: '执念撕扯',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_BLADE,
          CreationTags.MATERIAL.SEMANTIC_BURST,
        ],
        targetPolicy: { team: 'enemy', scope: 'single' },
        fallbackSuffix: '执念爪',
        fallbackDescription: '以生前执念凝成的利爪，疯狂撕扯近身者。',
      },
      {
        id: 'yanwu-skill-bind',
        productType: 'skill',
        label: '涎缚迟滞',
        elementMode: 'secondary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
        ],
        positiveTagBiases: [bias(CreationTags.MATERIAL.SEMANTIC_FREEZE)],
        targetPolicy: { team: 'enemy', scope: 'single' },
        fallbackSuffix: '涎缚术',
        fallbackDescription: '甩出浓稠梦涎缠住敌身，拖慢其节奏。',
      },
      {
        id: 'yanwu-skill-shroud',
        productType: 'skill',
        label: '腌躯护体',
        elementMode: 'secondary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_GUARD,
          CreationTags.MATERIAL.SEMANTIC_BONE,
        ],
        targetPolicy: { team: 'self', scope: 'single' },
        fallbackSuffix: '腌躯障',
        fallbackDescription: '以腌化残躯硬扛缠斗，护住要害。',
      },
      {
        id: 'yanwu-skill-regress',
        productType: 'skill',
        label: '吞涎回生',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_SUSTAIN,
          CreationTags.MATERIAL.SEMANTIC_BLOOD,
        ],
        targetPolicy: { team: 'self', scope: 'single' },
        fallbackSuffix: '吞涎息',
        fallbackDescription: '吞食梦涎修补破损的腌化之躯。',
      },
    ],
    artifacts: [
      slotArtifact(
        'yanwu-artifact-weapon',
        'weapon',
        '腌骨凶器',
        '腌骨爪',
        [CreationTags.MATERIAL.SEMANTIC_BONE, CreationTags.MATERIAL.SEMANTIC_BLADE],
        '以腌骨祭炼的攻伐封灵器。',
      ),
      slotArtifact(
        'yanwu-artifact-armor',
        'armor',
        '腌躯护器',
        '腌皮甲',
        [CreationTags.MATERIAL.SEMANTIC_GUARD, CreationTags.MATERIAL.SEMANTIC_BONE],
        '以腌化残躯织成的护体诡器。',
      ),
      slotArtifact(
        'yanwu-artifact-accessory',
        'accessory',
        '执念佩饰',
        '执念佩',
        [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_SPIRIT],
        '锁住生前执念的随身诡饰。',
      ),
    ],
  },
  遗种: {
    technique: [
      {
        id: 'yizhong-technique-taint',
        productType: 'gongfa',
        label: '旧纪心法',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_FORMATION,
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
        ],
        positiveTagBiases: [bias(CreationTags.MATERIAL.SEMANTIC_FORMATION)],
        fallbackSuffix: '旧纪典',
        fallbackDescription: '以泡影之夜幸存的旧纪元规则碾压众生的法门。',
      },
    ],
    skills: [
      {
        id: 'yizhong-skill-whisper',
        productType: 'skill',
        label: '旧则低语',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
        ],
        targetPolicy: { team: 'enemy', scope: 'single' },
        fallbackSuffix: '旧则咒',
        fallbackDescription: '以被遗忘的旧法则低语灼烧心神。',
      },
      {
        id: 'yizhong-skill-bind',
        productType: 'skill',
        label: '规则定身',
        elementMode: 'secondary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
        ],
        targetPolicy: { team: 'enemy', scope: 'single' },
        fallbackSuffix: '规则缚',
        fallbackDescription: '以残存规则之力封住敌身，寸步难行。',
      },
      {
        id: 'yizhong-skill-wall',
        productType: 'skill',
        label: '纪元壁障',
        elementMode: 'earth',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_GUARD,
          CreationTags.MATERIAL.SEMANTIC_FORMATION,
        ],
        targetPolicy: { team: 'self', scope: 'single' },
        fallbackSuffix: '纪元壁',
        fallbackDescription: '唤起旧纪元残壁，顶住反扑。',
      },
      {
        id: 'yizhong-skill-regress',
        productType: 'skill',
        label: '残纪回生',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_SUSTAIN,
          CreationTags.MATERIAL.SEMANTIC_FORMATION,
        ],
        targetPolicy: { team: 'self', scope: 'single' },
        fallbackSuffix: '残纪息',
        fallbackDescription: '以残存规则修补自身破损的诡异之躯。',
      },
    ],
    artifacts: [
      slotArtifact(
        'yizhong-artifact-weapon',
        'weapon',
        '旧纪凶器',
        '旧则刃',
        [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_FORMATION],
        '承载旧纪元规则的攻伐封灵器。',
      ),
      slotArtifact(
        'yizhong-artifact-armor',
        'armor',
        '纪元护器',
        '残纪甲',
        [CreationTags.MATERIAL.SEMANTIC_GUARD, CreationTags.MATERIAL.SEMANTIC_FORMATION],
        '偏向硬守与保命的旧纪元护器。',
      ),
      slotArtifact(
        'yizhong-artifact-accessory',
        'accessory',
        '规则佩饰',
        '旧则佩',
        [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_SPIRIT],
        '凝聚残存规则的贴身诡饰。',
      ),
    ],
  },
  投影: {
    technique: [
      {
        id: 'guixi-technique-taint',
        productType: 'gongfa',
        label: '浸染心法',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
          CreationTags.MATERIAL.SEMANTIC_SPIRIT,
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
        ],
        positiveTagBiases: [bias(CreationTags.MATERIAL.SEMANTIC_ILLUSION)],
        fallbackSuffix: '浸染录',
        fallbackDescription: '以梦涎浸染心神、蚀人神智的诡异法门。',
      },
    ],
    skills: [
      {
        id: 'guixi-skill-whisper',
        productType: 'skill',
        label: '低语蚀神',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
        ],
        targetPolicy: { team: 'enemy', scope: 'single' },
        fallbackSuffix: '低语咒',
        fallbackDescription: '以不可名状的低语灼烧心神、乱其神智。',
      },
      {
        id: 'guixi-skill-bind',
        productType: 'skill',
        label: '凝视定身',
        elementMode: 'secondary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_ILLUSION,
          CreationTags.MATERIAL.SEMANTIC_FREEZE,
        ],
        targetPolicy: { team: 'enemy', scope: 'single' },
        fallbackSuffix: '凝视术',
        fallbackDescription: '被它凝视者如坠冰窖，寸步难行。',
      },
      {
        id: 'guixi-skill-shroud',
        productType: 'skill',
        label: '梦涎护体',
        elementMode: 'secondary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_GUARD,
          CreationTags.MATERIAL.SEMANTIC_SPIRIT,
        ],
        targetPolicy: { team: 'self', scope: 'single' },
        fallbackSuffix: '梦涎障',
        fallbackDescription: '以浓稠梦涎裹住本体，侵蚀近身者。',
      },
      {
        id: 'guixi-skill-regress',
        productType: 'skill',
        label: '异化回生',
        elementMode: 'primary',
        dominantTags: [
          CreationTags.MATERIAL.SEMANTIC_SUSTAIN,
          CreationTags.MATERIAL.SEMANTIC_SPIRIT,
        ],
        targetPolicy: { team: 'self', scope: 'single' },
        fallbackSuffix: '异化息',
        fallbackDescription: '吞食梦涎修补破损的诡异之躯。',
      },
    ],
    artifacts: [
      slotArtifact(
        'guixi-artifact-weapon',
        'weapon',
        '梦涎凶器',
        '梦涎钩',
        [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_FREEZE],
        '以梦涎凝成的诡谲凶器。',
      ),
      slotArtifact(
        'guixi-artifact-armor',
        'armor',
        '腌躯护器',
        '腌皮甲',
        [CreationTags.MATERIAL.SEMANTIC_GUARD, CreationTags.MATERIAL.SEMANTIC_SPIRIT],
        '以腌化残躯织成的护体诡器。',
      ),
      slotArtifact(
        'guixi-artifact-accessory',
        'accessory',
        '投影佩饰',
        '影坠',
        [CreationTags.MATERIAL.SEMANTIC_ILLUSION, CreationTags.MATERIAL.SEMANTIC_SPIRIT],
        '天翁梦影凝成的贴身诡饰。',
      ),
    ],
  },
};

export const ENEMY_ARCHETYPE_INDEX = new Map(
  Object.values(ENEMY_ARCHETYPES)
    .flatMap((registry) => [
      ...registry.technique,
      ...registry.skills,
      ...registry.artifacts,
    ])
    .map((archetype) => [archetype.id, archetype] as const),
);

export function getEnemyArchetype(id: string): EnemyArchetypeDefinition {
  const archetype = ENEMY_ARCHETYPE_INDEX.get(id);
  if (!archetype) {
    throw new Error(`Unknown enemy archetype: ${id}`);
  }
  return archetype;
}

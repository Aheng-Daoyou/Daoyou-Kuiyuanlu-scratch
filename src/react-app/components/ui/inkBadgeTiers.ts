import {
  Quality,
  RealmType,
  SkillGrade,
  SpiritualRootGrade,
} from '@shared/types/constants';
import type { DungeonDifficultyTier } from '@shared/lib/game/mapSystem';

/**
 * 品阶类型：品质、窍等级、技能等级、境界
 */
export type Tier = Quality | SpiritualRootGrade | SkillGrade | RealmType;

/**
 * 品阶到 Tailwind 颜色类的映射
 */
export const tierColorMap: Record<Tier, string> = {
  凡品: 'text-tier-fan',
  灵品: 'text-tier-ling',
  玄品: 'text-tier-xuan',
  真品: 'text-tier-zhen',
  地品: 'text-tier-di',
  天品: 'text-tier-tian',
  仙品: 'text-tier-xian',
  神品: 'text-tier-shen',
  天窍: 'text-tier-tian',
  真窍: 'text-tier-zhen',
  伪窍: 'text-tier-fan',
  变异窍: 'text-tier-shen',
  天阶上品: 'text-tier-shen',
  天阶中品: 'text-tier-xian',
  天阶下品: 'text-tier-xian',
  地阶上品: 'text-tier-di',
  地阶中品: 'text-tier-di',
  地阶下品: 'text-tier-di',
  玄阶上品: 'text-tier-xuan',
  玄阶中品: 'text-tier-xuan',
  玄阶下品: 'text-tier-xuan',
  黄阶上品: 'text-tier-ling',
  黄阶中品: 'text-tier-ling',
  黄阶下品: 'text-tier-ling',
  闻腥: 'text-tier-fan',
  守灯: 'text-tier-ling',
  窥渊: 'text-tier-xuan',
  蚀体: 'text-tier-zhen',
  忘川: 'text-tier-shen',
  执灯: 'text-tier-di',
  掌灯: 'text-tier-tian',
  近神: 'text-tier-xian',
  渡渊: 'text-tier-shen',
};

export const dungeonDifficultyColorMap: Record<DungeonDifficultyTier, string> =
  {
    easy: 'text-tier-fan',
    normal: 'text-tier-ling',
    hard: 'text-tier-xuan',
    elite: 'text-tier-zhen',
    boss: 'text-tier-shen',
  };

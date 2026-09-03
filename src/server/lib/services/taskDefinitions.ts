import { EnemyGenerator } from '@shared/engine/enemyGenerator';
import type { EnemyClan } from '@shared/types/constants';
import type { CultivatorCombatInput } from '@shared/engine/battle-v5/adapters/CultivatorCombatAdapter';
import { buildPresetArtifact } from '@shared/engine/cultivator/creation/presetProducts';
import { hasActiveConditionStatus } from '@shared/lib/condition';
import type {
  TaskDefinition,
  TaskInstanceMetadata,
  TaskStageDefinition,
} from '@shared/types/task';
import { ServerEnemyCopyProvider } from '@server/lib/services/ServerEnemyCopyProvider';

const challengeEnemyGenerator = new EnemyGenerator({
  copyProvider: new ServerEnemyCopyProvider({
    enabled: process.env.NODE_ENV !== 'test',
  }),
});

const noviceGuardArtifact = buildPresetArtifact({
  name: '入门护身玉佩',
  slot: 'accessory',
  element: '尸',
  description: '宗门交给新入道者的护身小器，灯辉不盛，却足以挡住初次云游的几分凶险。',
  affixIds: ['artifact-panel-accessory-utility', 'artifact-panel-vitality'],
  realm: '闻腥',
  realmStage: '初期',
});

const noviceWeaponArtifact = buildPresetArtifact({
  name: '入门青灯竹杖',
  slot: 'weapon',
  element: '尸',
  description: '以青竹淬灯制成的入门灯杖，锋芒不躁，适合新入道者熟悉斗法节奏。',
  affixIds: ['artifact-panel-weapon-dual-atk', 'artifact-panel-atk'],
  realm: '闻腥',
  realmStage: '初期',
});

const noviceArmorArtifact = buildPresetArtifact({
  name: '入门护身布甲',
  slot: 'armor',
  element: '梦',
  description: '缀有护身符线的粗布灯甲，可缓冲初次探秘里的冲撞与余波。',
  affixIds: ['artifact-panel-armor-dual-def', 'artifact-panel-def'],
  realm: '闻腥',
  realmStage: '初期',
});

type TaskLinkKind =
  | 'alchemy'
  | 'cultivator'
  | 'dungeon'
  | 'inn'
  | 'inventory'
  | 'market'
  | 'retreat'
  | 'challenge'
  | 'tasks'
  | 'training'
  | 'ranking';

export interface TaskStageTemplate extends TaskStageDefinition {
  links: Array<{
    label: string;
    kind: TaskLinkKind;
  }>;
}

export interface BreakthroughTaskDefinition
  extends Omit<TaskDefinition, 'stages' | 'category' | 'fromRealm' | 'toRealm'> {
  category: 'breakthrough_major';
  fromRealm: NonNullable<TaskDefinition['fromRealm']>;
  toRealm: NonNullable<TaskDefinition['toRealm']>;
  taskTheme: TaskInstanceMetadata['taskTheme'];
  stages: TaskStageTemplate[];
}

export interface TutorialTaskDefinition
  extends Omit<TaskDefinition, 'stages' | 'category'> {
  category: 'tutorial';
  rewardCultivationExp: number;
  rewardAttachments: NonNullable<TaskDefinition['rewardAttachments']>;
  stages: TaskStageTemplate[];
}

export type RuntimeTaskDefinition =
  | BreakthroughTaskDefinition
  | TutorialTaskDefinition;

export interface TaskChallengeProfile {
  id: string;
  title: string;
  stateStrategy: 'persistent_world';
  enemyDifficulty?: number;
  buildOpponent: (
    cultivator: CultivatorCombatInput,
  ) => CultivatorCombatInput | Promise<CultivatorCombatInput>;
}

function cloneMirrorOpponent(
  cultivator: CultivatorCombatInput,
  options: {
    name: string;
    attributeMultiplier: number;
    bonusWillpower?: number;
    bonusSpeed?: number;
  },
): CultivatorCombatInput {
  const multiplier = options.attributeMultiplier;

  return {
    ...structuredClone(cultivator),
    id:
      globalThis.crypto?.randomUUID?.() ??
      `mirror-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: options.name,
    attributes: {
      vitality: Math.max(1, Math.floor(cultivator.attributes.vitality * multiplier)),
      strength: Math.max(1, Math.floor(cultivator.attributes.strength * multiplier)),
      spirit: Math.max(1, Math.floor(cultivator.attributes.spirit * multiplier)),
      endurance: Math.max(1, Math.floor(cultivator.attributes.endurance * multiplier)),
      speed: Math.max(
        1,
        Math.floor(cultivator.attributes.speed * multiplier) + (options.bonusSpeed ?? 0),
      ),
      willpower: Math.max(
        1,
        Math.floor(cultivator.attributes.willpower * multiplier) +
          (options.bonusWillpower ?? 0),
      ),
    },
  };
}

async function buildGeneratedChallengeOpponent(
  cultivator: CultivatorCombatInput,
  options: {
    name: string;
    /** 敌人三族：腌物 / 遗种 / 投影。 */
    clan: EnemyClan;
    enemyDifficulty: number;
    narrativeHint: string;
  },
): Promise<CultivatorCombatInput> {
  const draft = challengeEnemyGenerator.buildDraft({
    realm: cultivator.realm,
    realmStage: cultivator.realm_stage,
    clan: options.clan,
    difficulty: options.enemyDifficulty,
    isBoss: true,
    name: options.name,
    background: options.narrativeHint,
    description: `${options.name}杀机炽盛，专为破境试炼而来。`,
  });
  const enriched = await challengeEnemyGenerator.enrichNarrative(draft);
  return enriched.cultivator;
}

const BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY = {
  tribulationDeity: 65,
  lawInsightVoid: 75,
  tribulationBody: 90,
  heavenlyTribulationFinal: 100,
} as const;

const challengeProfiles: TaskChallengeProfile[] = [
  {
    id: 'heart_demon_nascent',
    title: '心灯劫',
    stateStrategy: 'persistent_world',
    buildOpponent: (cultivator) =>
      cloneMirrorOpponent(
        cultivator,
        hasActiveConditionStatus(cultivator.condition, 'clear_mind')
          ? {
              name: '魔障化身',
              attributeMultiplier: 1,
            }
          : {
              name: '魔障化身',
              attributeMultiplier: 1.08,
              bonusWillpower: 6,
              bonusSpeed: 4,
            },
      ),
  },
  {
    id: 'tribulation_deity',
    title: '忘川之扰',
    stateStrategy: 'persistent_world',
    enemyDifficulty: BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.tribulationDeity,
    buildOpponent: (cultivator) =>
      buildGeneratedChallengeOpponent(cultivator, {
        name: '忘川劫影',
        clan: '投影',
        enemyDifficulty: BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.tribulationDeity,
        narrativeHint: '心灯劫降临时凝成的诡异投影，通体幽蓝灯焰流转，奉渊的意志阻断渡渊之路，它记得每一张渡渊者的脸。',
      }),
  },
  {
    id: 'law_insight_void',
    title: '法则试锋',
    stateStrategy: 'persistent_world',
    enemyDifficulty: BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.lawInsightVoid,
    buildOpponent: (cultivator) =>
      buildGeneratedChallengeOpponent(cultivator, {
        name: '法则残影',
        clan: '遗种',
        enemyDifficulty: BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.lawInsightVoid,
        narrativeHint: '法则碎片凝化的诡异残影，举手投足间隐现天地规则之力，它的执念是「被遗忘的第七条规则」。',
      }),
  },
  {
    id: 'tribulation_body',
    title: '灯劫淬体',
    stateStrategy: 'persistent_world',
    enemyDifficulty: BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.tribulationBody,
    buildOpponent: (cultivator) =>
      buildGeneratedChallengeOpponent(cultivator, {
        name: '灯劫化身',
        clan: '遗种',
        enemyDifficulty: BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.tribulationBody,
        narrativeHint: '灯劫凝形的太古兽体，浑身幽蓝灯弧缠绕，以燎原之势淬炼渡渊者的灯体根基。',
      }),
  },
  {
    id: 'inner_demon_grand',
    title: '大执念劫',
    stateStrategy: 'persistent_world',
    buildOpponent: (cultivator) =>
      cloneMirrorOpponent(cultivator, {
        name: '执念化身',
        attributeMultiplier: 1.12,
        bonusWillpower: 12,
        bonusSpeed: 6,
      }),
  },
  {
    id: 'heavenly_tribulation_final',
    title: '灯劫前奏',
    stateStrategy: 'persistent_world',
    enemyDifficulty:
      BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.heavenlyTribulationFinal,
    buildOpponent: (cultivator) =>
      buildGeneratedChallengeOpponent(cultivator, {
        name: '心灯劫影',
        clan: '遗种',
        enemyDifficulty:
          BREAKTHROUGH_CHALLENGE_ENEMY_DIFFICULTY.heavenlyTribulationFinal,
        narrativeHint: '天道意志所化的终极劫影，承载末法时代最后一缕天威，誓要将不配渡渊者碾为齑粉。',
      }),
  },
];

const breakthroughDefinitions: BreakthroughTaskDefinition[] = [
  {
    id: 'major_breakthrough_闻腥_守灯',
    category: 'breakthrough_major',
    title: '守灯前引',
    summary: '先获得「破境凝神」状态，稳住根基，便可回静室冲击守灯。',
    fromRealm: '闻腥',
    toRealm: '守灯',
    taskTheme: 'foundation',
    stages: [
      {
        id: 'foundation-pill',
        title: '凝破境意',
        description: '守灯前先服下守灯香，获得「破境凝神」状态。守灯香可在闻香房用温稳灯材配合“冲关蓄势、辅助守灯”之类香意炼制，也可去灯下坊市寻访成香。',
        completionText: '破境凝神已成，香力可引灯油归府。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
          { label: '看任务中心', kind: 'tasks' },
        ],
        objectives: [
          {
            id: 'breakthrough-focus',
            kind: 'status_active',
            title: '具备「破境凝神」',
            description: '服用守灯香或（任何含有「破境凝神」效果的香品）获得',
            statusKey: 'breakthrough_focus',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_守灯_窥渊',
    category: 'breakthrough_major',
    title: '凝香之机',
    summary: '香品只是外力，先让功法与香意都够得上，再去试炼阵中凝气成香。',
    fromRealm: '守灯',
    toRealm: '窥渊',
    taskTheme: 'core',
    stages: [
      {
        id: 'core-prep',
        title: '香法并备',
        description: '窥渊前需借降尘香压住灯心火候，再以玄品功法稳住成香根基。降尘香可在闻香房以“窥渊、凝香、冲关蓄势”之类香意炼制，也可去灯下坊市寻访。',
        completionText: '破境凝神与功法已备，凝香条件已成。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
          { label: '看所修功法', kind: 'tasks' },
        ],
        objectives: [
          {
            id: 'breakthrough-focus',
            kind: 'status_active',
            title: '具备「破境凝神」',
            description: '服用降尘香或（任何含有「破境凝神」效果的香品）获得',
            statusKey: 'breakthrough_focus',
          },
          {
            id: 'quality-threshold',
            kind: 'technique_quality_at_least',
            title: '功法至少达玄品',
            description: '窥渊更看道基深浅，所修最高功法需达到玄品。',
            threshold: '玄品',
          },
        ],
      },
      {
        id: 'core-trial',
        title: '过旧署试炼阵',
        description: '前往烛京旧署试炼场，以试炼阵压缩梦涎，提前适应凝香之势。',
        completionText: '试炼阵已过，灯心已能承压。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '返回静室', kind: 'retreat' },
        ],
        objectives: [
          {
            id: 'clear-trial',
            kind: 'complete_dungeon',
            title: '通过烛京旧署试炼场',
            description: '完成一次窥渊前试炼，验证功法与香意能否并行。',
            mapNodeId: 'SAT_TN_04',
            mapNodeName: '烛京·旧署试炼场',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_窥渊_蚀体',
    category: 'breakthrough_major',
    title: '婴劫问心',
    summary: '蚀体之前，最难过的不是碎灯，而是先稳住灯心、渡过魔障。',
    fromRealm: '窥渊',
    toRealm: '蚀体',
    taskTheme: 'heart_demon',
    stages: [
      {
        id: 'nascent-mind',
        title: '先清心',
        description: '蚀体问心之前，先用清心香洗去心海杂念。清心香可在闻香房以“清心、定神、魔障”之类香意炼制，也可去灯下坊市碰碰机缘。',
        completionText: '心海已稳，杂念稍歇。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
          { label: '看任务中心', kind: 'tasks' },
        ],
        objectives: [
          {
            id: 'clear-mind',
            kind: 'status_active',
            title: '具备「清心」',
            description: '可服用含有「清心」效果的香品获得',
            statusKey: 'clear_mind',
          },
        ],
      },
      {
        id: 'nascent-heart-demon',
        title: '渡心灯劫',
        description: '进入心海深处，与魔障化身正面一战，胜则蚀体可期。',
        completionText: '魔障已斩，灯心尚存。',
        links: [
          { label: '进入试炼', kind: 'challenge' },
          { label: '返回静室', kind: 'retreat' },
        ],
        objectives: [
          {
            id: 'win-heart-demon',
            kind: 'win_task_challenge',
            title: '战胜魔障化身',
            description: '赢下这一战，才能真正获得冲击蚀体的资格。',
            challengeId: 'heart_demon_nascent',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_蚀体_忘川',
    category: 'breakthrough_major',
    title: '斩执念，叩忘川',
    summary: '忘川之前，要先备护脉与清心，再去旧址断执，最后直面灯劫投影。',
    fromRealm: '蚀体',
    toRealm: '忘川',
    taskTheme: 'tribulation',
    stages: [
      {
        id: 'deity-prep',
        title: '护脉清心',
        description: '忘川前反噬极重，灯脉与心海都要提前安顿。护脉香、清心香可在闻香房按“护脉、清心、忘川反噬”之类香意炼制，也可去灯下坊市寻访。',
        completionText: '灯体与心海都已做足准备。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
          { label: '返回静室', kind: 'retreat' },
        ],
        objectives: [
          {
            id: 'protect-meridians',
            kind: 'status_active',
            title: '具备「护脉」',
            description: '可服用含有「护脉」效果的香品获得',
            statusKey: 'protect_meridians',
          },
          {
            id: 'clear-mind',
            kind: 'status_active',
            title: '具备「清心」',
            description: '可服用含有「清心」效果的香品获得',
            statusKey: 'clear_mind',
          },
        ],
      },
      {
        id: 'deity-trial',
        title: '断旧执',
        description: '去班底庄百戏机关楼看破旧念，以戏本与星象印证自己的道途。',
        completionText: '旧执已断，道念更明。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '进入试炼', kind: 'challenge' },
        ],
        objectives: [
          {
            id: 'clear-archive',
            kind: 'complete_dungeon',
            title: '通过百戏机关楼',
            description: '完成一次机关楼历练，以断执念、稳灯心。',
            mapNodeId: 'SAT_DJ_07',
            mapNodeName: '班底庄·百戏机关楼',
          },
          {
            id: 'win-tribulation',
            kind: 'win_task_challenge',
            title: '战胜灯劫投影',
            description: '正面扛过忘川前的灯劫投影，方可回静室正式冲关。',
            challengeId: 'tribulation_deity',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_忘川_执灯',
    category: 'breakthrough_major',
    title: '法则初窥',
    summary: '想破入执灯，先把窥悟推高，再去险地印证法则，最后战胜法则残影。',
    fromRealm: '忘川',
    toRealm: '执灯',
    taskTheme: 'law_insight',
    stages: [
      {
        id: 'void-insight',
        title: '补足窥悟',
        description: '法则门槛极高，没有足够窥悟便看不见执灯门槛。',
        completionText: '窥悟已足，可试着碰触法则边缘。',
        links: [
          { label: '返回静室', kind: 'retreat' },
          { label: '看任务中心', kind: 'tasks' },
        ],
        objectives: [
          {
            id: 'insight',
            kind: 'insight_at_least',
            title: '窥悟达到 70',
            description: '先把窥悟积累到足够高，再谈执灯。',
            threshold: 70,
          },
        ],
      },
      {
        id: 'void-trial',
        title: '入旧纪元祭坛群',
        description: '在旧纪元祭坛群中正视混乱法则，再与法则残影交手。',
        completionText: '祭坛群与法则残影都已渡过。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '进入试炼', kind: 'challenge' },
        ],
        objectives: [
          {
            id: 'clear-altar',
            kind: 'complete_dungeon',
            title: '通过旧纪元祭坛群',
            description: '完成一次高危法则历练。',
            mapNodeId: 'SAT_TN_06',
            mapNodeName: '天裂口·旧纪元祭坛群',
          },
          {
            id: 'win-law-challenge',
            kind: 'win_task_challenge',
            title: '战胜法则残影',
            description: '只有在正面对抗中稳住法则，才算真正摸到执灯门槛。',
            challengeId: 'law_insight_void',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_执灯_掌灯',
    category: 'breakthrough_major',
    title: '灯劫淬体',
    summary: '执灯之后，灯体先承劫，再谈掌灯。准备、试炼与灯劫都不可省。',
    fromRealm: '执灯',
    toRealm: '掌灯',
    taskTheme: 'tribulation',
    stages: [
      {
        id: 'body-prep',
        title: '稳灯体',
        description: '掌灯前要先让灯体能承住灯劫余威。护脉香可在闻香房按“护脉、稳固灯体、承劫”之类香意炼制，也可去灯下坊市寻访。',
        completionText: '灯体准备已足，足可尝试承劫。',
        links: [
          { label: '返回静室', kind: 'retreat' },
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
        ],
        objectives: [
          {
            id: 'insight',
            kind: 'insight_at_least',
            title: '窥悟达到 75',
            description: '更高层次的窥悟能稳住心神与灯体。',
            threshold: 75,
          },
          {
            id: 'protect-meridians',
            kind: 'status_active',
            title: '具备「护脉」',
            description: '可服用含有「护脉」效果的香品获得',
            statusKey: 'protect_meridians',
          },
        ],
      },
      {
        id: 'body-trial',
        title: '入封星古塔',
        description: '先过封星古塔，再与灯劫化身交锋，验证灯体是否真能承压。',
        completionText: '古塔与灯劫都已承住。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '进入试炼', kind: 'challenge' },
        ],
        objectives: [
          {
            id: 'clear-tower',
            kind: 'complete_dungeon',
            title: '通过封星古塔',
            description: '借塔灵与封印反噬打磨灯体。',
            mapNodeId: 'SAT_DJ_06',
            mapNodeName: '倒悬观星台·封星古塔',
          },
          {
            id: 'win-body-challenge',
            kind: 'win_task_challenge',
            title: '战胜灯劫化身',
            description: '在灯劫压身之下仍能胜出，才配迈入掌灯。',
            challengeId: 'tribulation_body',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_掌灯_近神',
    category: 'breakthrough_major',
    title: '大执念关',
    summary: '越往后越不是梦涎之争，而是执念与灯心之争。',
    fromRealm: '掌灯',
    toRealm: '近神',
    taskTheme: 'heart_demon',
    stages: [
      {
        id: 'grand-prep',
        title: '先稳心神',
        description: '近神门前最怕执念反噬，先以清心香稳住心神。清心香可在闻香房按“清心、定神、斩执念”之类香意炼制，也可去灯下坊市寻访。',
        completionText: '心神已定，可入更深层试炼。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
          { label: '返回静室', kind: 'retreat' },
        ],
        objectives: [
          {
            id: 'insight',
            kind: 'insight_at_least',
            title: '窥悟达到 80',
            description: '更深的窥悟能削弱执念纠缠。',
            threshold: 80,
          },
          {
            id: 'clear-mind',
            kind: 'status_active',
            title: '具备「清心」',
            description: '可服用含有「清心」效果的香品获得',
            statusKey: 'clear_mind',
          },
        ],
      },
      {
        id: 'grand-trial',
        title: '闯渊壁祭坛',
        description: '先过渊壁祭坛，再斩执念化身，方能真正逼近近神门槛。',
        completionText: '逆鳞与执念都已越过。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '进入试炼', kind: 'challenge' },
        ],
        objectives: [
          {
            id: 'clear-altar',
            kind: 'complete_dungeon',
            title: '通过渊壁祭坛',
            description: '以旧纪元甲片磨炼灯心与意志。',
            mapNodeId: 'SAT_DJ_02',
            mapNodeName: '无昼渊·渊壁祭坛',
          },
          {
            id: 'win-grand-challenge',
            kind: 'win_task_challenge',
            title: '战胜执念化身',
            description: '若连自身执念都压不下，近神只会是一句空谈。',
            challengeId: 'inner_demon_grand',
          },
        ],
      },
    ],
  },
  {
    id: 'major_breakthrough_近神_渡渊',
    category: 'breakthrough_major',
    title: '渡渊前奏',
    summary: '真正踏入渡渊前，要先承住前奏，确认自己没有被天道一击抹去。',
    fromRealm: '近神',
    toRealm: '渡渊',
    taskTheme: 'tribulation',
    stages: [
      {
        id: 'tribulation-prep',
        title: '备渡渊身',
        description: '渡渊前要同时稳住灯体与心海。护脉香、清心香可在闻香房按“护脉、清心、渡渊”之类香意炼制，也可去灯下坊市寻访。',
        completionText: '形神两端都已尽量稳住。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '去灯下坊市', kind: 'market' },
          { label: '返回静室', kind: 'retreat' },
        ],
        objectives: [
          {
            id: 'insight',
            kind: 'insight_at_least',
            title: '窥悟达到 85',
            description: '先让窥悟足够深，再去摸渡渊门槛。',
            threshold: 85,
          },
          {
            id: 'protect-meridians',
            kind: 'status_active',
            title: '具备「护脉」',
            description: '可服用含有「护脉」效果的香品获得',
            statusKey: 'protect_meridians',
          },
          {
            id: 'clear-mind',
            kind: 'status_active',
            title: '具备「清心」',
            description: '可服用含有「清心」效果的香品获得',
            statusKey: 'clear_mind',
          },
        ],
      },
      {
        id: 'tribulation-trial',
        title: '入沉灯神殿',
        description: '先穿沉灯神殿，再直面心灯劫影，证明自己不会在第一重灯焰下碎灭。',
        completionText: '神殿与心灯劫影都已压过去。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '进入试炼', kind: 'challenge' },
        ],
        objectives: [
          {
            id: 'clear-temple',
            kind: 'complete_dungeon',
            title: '通过沉灯神殿',
            description: '在川底神殿中验证自己是否真能承住天威。',
            mapNodeId: 'SAT_DJ_03',
            mapNodeName: '忘川渡·沉灯神殿',
          },
          {
            id: 'win-final-challenge',
            kind: 'win_task_challenge',
            title: '战胜心灯劫影',
            description: '若连灯劫前奏都扛不住，便还不到正式渡渊的时候。',
            challengeId: 'heavenly_tribulation_final',
          },
        ],
      },
    ],
  },
];

const tutorialDefinitions: TutorialTaskDefinition[] = [
  {
    id: 'tutorial_starter_supply',
    category: 'tutorial',
    title: '入门供给',
    summary: '先领一份灯宅供给，备好第一炉香、第一次探秘和一整套入门装备。',
    rewardCultivationExp: 40,
    rewardAttachments: [
      {
        type: 'spirit_stones',
        name: '灯油券',
        quantity: 5000,
      },
      {
        type: 'material',
        name: '青露草',
        quantity: 3,
        data: {
          name: '青露草',
          type: 'herb',
          rank: '凡品',
          element: '尸',
          description: '叶尖含露，香性温和，适合作为第一炉疗伤香的主材。',
          quantity: 3,
        },
      },
      {
        type: 'material',
        name: '凝水花',
        quantity: 2,
        data: {
          name: '凝水花',
          type: 'herb',
          rank: '凡品',
          element: '星',
          description: '花瓣凝水成珠，能缓和炉火躁性，常用于回元与疗伤。',
          quantity: 2,
        },
      },
      {
        type: 'artifact',
        name: noviceWeaponArtifact.name,
        quantity: 1,
        data: noviceWeaponArtifact,
      },
      {
        type: 'artifact',
        name: noviceArmorArtifact.name,
        quantity: 1,
        data: noviceArmorArtifact,
      },
      {
        type: 'artifact',
        name: noviceGuardArtifact.name,
        quantity: 1,
        data: noviceGuardArtifact,
      },
    ],
    stages: [
      {
        id: 'starter-supply',
        title: '领取供给',
        description: '先把入门供给收入囊中。入门武器、护甲与玉佩建议尽早穿戴；第一炉香与低危探秘可按卷宗继续推进。',
        completionText: '供给已备，可以开始熟悉灯宅里的修行循环。',
        links: [
          { label: '看道身状态', kind: 'cultivator' },
          { label: '去储物袋', kind: 'inventory' },
        ],
        objectives: [
          {
            id: 'starter-supply-ready',
            kind: 'auto_complete',
            title: '供给已备',
            description: '入门供给已经备好，领取后会获得灯韵、灯油券、灯材与一整套入门装备。',
          },
        ],
      },
    ],
  },
  {
    id: 'tutorial_first_alchemy',
    category: 'tutorial',
    title: '第一炉疗伤香',
    summary: '用温和灯草开一次炉，学会材料、香意、消耗和成香结果之间的关系。',
    rewardCultivationExp: 40,
    rewardAttachments: [
      {
        type: 'spirit_stones',
        name: '灯油券',
        quantity: 3000,
      },
      {
        type: 'material',
        name: '赤芽果',
        quantity: 2,
        data: {
          name: '赤芽果',
          type: 'herb',
          rank: '凡品',
          element: '渊',
          description: '香力较活，少量投入可提振香势，过量则容易使炉火躁烈。',
          quantity: 2,
        },
      },
    ],
    stages: [
      {
        id: 'first-alchemy',
        title: '开炉一次',
        description: '去闻香房选择青露草、凝水花一类温和灯材，香意可写“疗伤回元，香性温和”。',
        completionText: '第一炉已成，你已经知道制香要先看材料香性与香意方向。',
        links: [
          { label: '去闻香房', kind: 'alchemy' },
          { label: '查看储物袋', kind: 'inventory' },
        ],
        objectives: [
          {
            id: 'first-alchemy-crafted',
            kind: 'event_count',
            title: '完成 1 次制香',
            description: '成功开炉一次即可完成，不要求香品品阶。',
            event: 'alchemy_crafted',
            threshold: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'tutorial_first_dungeon',
    category: 'tutorial',
    title: '第一次低危探秘',
    summary: '满状态再进低危秘境，学会查探、撤退、结算和战后恢复。',
    rewardCultivationExp: 50,
    rewardAttachments: [
      {
        type: 'spirit_stones',
        name: '灯油券',
        quantity: 5000,
      },
      {
        type: 'material',
        name: '铁木枝',
        quantity: 2,
        data: {
          name: '铁木枝',
          type: 'aux',
          rank: '凡品',
          element: '尸',
          description: '木质坚韧，可作封灵辅材，也能在制香时稳住香路。',
          quantity: 2,
        },
      },
      {
        type: 'material',
        name: '青纹回元草',
        quantity: 1,
        data: {
          name: '青纹回元草',
          type: 'herb',
          rank: '凡品',
          element: '尸',
          description: '木气温润的灯草，可调和炉势并稳住香力。',
          quantity: 1,
        },
      },
    ],
    stages: [
      {
        id: 'first-dungeon',
        title: '完成一次探秘结算',
        description: '进入云游探秘前先确认气血与灯焰，遇敌时先查探，危险就撤退。',
        completionText: '第一次探秘已结算，你已经走完窥悟、准备、探索、恢复的基础循环，也带回了一份入门材料。',
        links: [
          { label: '去云游探秘', kind: 'dungeon' },
          { label: '去灵眼之泉', kind: 'inn' },
          { label: '去练功房', kind: 'training' },
        ],
        objectives: [
          {
            id: 'first-dungeon-completed',
            kind: 'event_count',
            title: '完成 1 次探秘',
            description: '完成一次云游探秘结算即可，成功撤退也能学到风险判断。',
            event: 'dungeon_completed',
            threshold: 1,
          },
        ],
      },
    ],
  },
];

const definitions: RuntimeTaskDefinition[] = [
  ...tutorialDefinitions,
  ...breakthroughDefinitions,
];

const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]));
const challengeProfileMap = new Map(
  challengeProfiles.map((profile) => [profile.id, profile]),
);

export function getTaskDefinition(definitionId: string) {
  return definitionMap.get(definitionId) ?? null;
}

export function getBreakthroughTaskDefinition(definitionId: string) {
  const definition = definitionMap.get(definitionId);
  return definition?.category === 'breakthrough_major' ? definition : null;
}

export function getBreakthroughTaskDefinitionByTransition(
  fromRealm: BreakthroughTaskDefinition['fromRealm'],
  toRealm: BreakthroughTaskDefinition['toRealm'],
) {
  return (
    breakthroughDefinitions.find(
      (definition) =>
        definition.fromRealm === fromRealm && definition.toRealm === toRealm,
    ) ?? null
  );
}

export function getTutorialTaskDefinitions() {
  return tutorialDefinitions;
}

export function getTaskChallengeProfile(challengeId: string) {
  return challengeProfileMap.get(challengeId) ?? null;
}

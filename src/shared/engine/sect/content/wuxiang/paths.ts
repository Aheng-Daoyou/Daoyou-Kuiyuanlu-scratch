import {
  BaseSectPathModule,
  STANDARD_PATH_LAYERS,
  type SectBuildBuilder,
  type SectPathCompileContext,
  type SectPathDefinitionWithoutNodes,
  type SectTacticId,
} from '../../core';
import { WUXIANG_DEMON_PATH_ID, WUXIANG_MIRROR_PATH_ID } from './ids';
import { WUXIANG_DEMON_NODES } from './paths/demon/nodes';
import { WUXIANG_MIRROR_NODES } from './paths/mirror/nodes';
import {
  createWuxiangBuildSettings,
  DEMON_BUILD_FACADE,
  DemonBuildFacade,
  MIRROR_BUILD_FACADE,
  MirrorBuildFacade,
} from './shared/buildFacades';
import { compileWuxiangPath } from './shared/compiler';
import {
  WuxiangDemonSelectionStrategy,
  WuxiangMirrorSelectionStrategy,
} from './strategy';

const mirrorDefinition: SectPathDefinitionWithoutNodes = {
  id: WUXIANG_MIRROR_PATH_ID,
  name: '莲镜照业',
  description:
    '以承受制造因，以血相兑现果。来力不急于拒绝，只把每一道因果留在镜中；胎相立因，血相现报，莲相令因果同时照见。',
  minRealm: '守灯',
  minRealmStage: '中期',
  layers: [...STANDARD_PATH_LAYERS],
  defaultTacticId: 'guard',
  tactics: [
    {
      id: 'guard',
      name: '守镜',
      description:
        '优先保持3层莲印与防守状态；3层莲印且达到3点莲念，或达到5点莲念后入血，优先使用防御神通维持血线。',
    },
    {
      id: 'present',
      name: '现报',
      description:
        '至少1层莲印且达到3点莲念便入血，优先使用可即时消费莲印的攻击神通。',
    },
    {
      id: 'formless',
      name: '莲相',
      description:
        '原则上积满6点莲念再显莲相；低于35%气血且已有3点莲念时允许提前入血自救。',
    },
  ],
  presentation: {
    highlights: [
      {
        name: '受击留业',
        description: '胎相承受敌方直接伤害，积累莲印并即时返还部分来力。',
      },
      {
        name: '逐层现报',
        description:
          '胎相奠定招式根基；显化血相时照见现报，显化莲相时再现最终变化。',
      },
      {
        name: '一念两照',
        description:
          '显化莲相时，同一门神通会兼具胎相本式、血相变化与莲相变化。',
      },
    ],
    abilityChanges: {
      'flower-heart':
        '胎相伤敌并留下哺心戒；血相借莲印问罪追击、封住敌招；莲相再发一击，并为自身留下莲印。',
      'blood-tide':
        '胎相提供护盾与听莲减伤；血相消费莲印恢复并登记受击反击；莲相额外加厚护盾。',
      'three-knocks':
        '胎相三击并留下新的莲门；血相借莲印引爆目标原有的莲门；莲相在旧门尽空后再发一击。',
      'observe-calamity':
        '胎相架势抵御一次直接伤害；血相消费莲印令减伤同时反击；莲相将架势扩展为两次。',
      'five-skandhas':
        '胎相伤敌并驱散敌方增益；血相借莲印净化自身；莲相额外伤敌并获得护盾。',
      'reed-crossing':
        '胎相保护下一次直接受击；血相消费莲印令防护触发时反击；莲相额外获得护盾。',
      'turn-form':
        '3～5点莲念可使之后两门神通显化血相；6点莲念可使下一门神通显化莲相。',
    },
  },
};

const demonDefinition: SectPathDefinitionWithoutNodes = {
  id: WUXIANG_DEMON_PATH_ID,
  name: '哺心渡厄',
  description:
    '以胎相主动沉血，以血相强渡两息，以莲相令燃血与哺渡同时显化。气血不是怒气的别名，而是每一门神通真正支付的渡河之资。',
  minRealm: '守灯',
  minRealmStage: '中期',
  layers: [...STANDARD_PATH_LAYERS],
  defaultTacticId: 'trial-fire',
  tactics: [
    {
      id: 'trial-fire',
      name: '试火',
      description:
        '达到3点莲念且低于65%气血时入血；危急时先以攻击吸血，再用防御神通稳住血线。',
    },
    {
      id: 'sink-boat',
      name: '沉舟',
      description:
        '尽量积至5点莲念并主动压至50%气血以下，入血后优先连续使用攻击神通收束。',
    },
    {
      id: 'one-thought',
      name: '一念',
      description:
        '优先积满6点莲念使用莲相；低于30%气血时允许以3点莲念提前入血自救。',
    },
  ],
  presentation: {
    highlights: [
      {
        name: '主动沉血',
        description:
          '胎相支付当前气血施展神通，以真实代价换取莲念；防御神通可积蓄更多莲念。',
      },
      {
        name: '两息哺渡',
        description:
          '进入血相后，接下来两门宗门神通都会显现各自的血相变化，并共享减伤、免控与吸血之效。',
      },
      {
        name: '胎血同炉',
        description:
          '显化莲相时，同一门神通会兼具胎相本式、血相变化与莲相变化。',
      },
    ],
    abilityChanges: {
      'flower-heart':
        '胎相伤敌并留下哺隙；血相再发摘心重击并多留一层哺隙；莲相根据目标已损气血收束。',
      'blood-tide':
        '胎相重血换取护盾与下一击强化；血相加厚护盾并令血潮命中回血；莲相立即回生并强化血潮。',
      'three-knocks':
        '胎相三击，并在自身气血较低时强化末击；血相再发一记重击；莲相在濒危时发动必定暴击的无生之击。',
      'observe-calamity':
        '胎相降低下一次直接伤害；血相令承劫后反击；莲相再获得护盾。',
      'five-skandhas':
        '胎相净化并在成功时获得莲念；血相获得护盾与下一击强化；莲相再净化一个减益。',
      'reed-crossing':
        '胎相获得护盾与下一击减伤；血相进一步强化两者；莲相在濒危时恢复气血。',
      'turn-form':
        '3～5点莲念可无额外气血成本进入血相两式并获得哺渡护体与护盾；6点莲念可支付少量气血使下一门神通显化莲相。',
    },
  },
};

class MirrorPathModule extends BaseSectPathModule {
  constructor() {
    super(mirrorDefinition, WUXIANG_MIRROR_NODES);
  }
  protected initializeBuild(
    _context: SectPathCompileContext,
    builder: SectBuildBuilder,
  ): void {
    builder.setExtension(
      MIRROR_BUILD_FACADE,
      new MirrorBuildFacade(createWuxiangBuildSettings()),
    );
  }
  protected finalizeBuild(
    context: SectPathCompileContext,
    builder: SectBuildBuilder,
  ): void {
    const facade = builder.requireExtension<MirrorBuildFacade>(
      MIRROR_BUILD_FACADE,
      '莲镜照业构筑',
    );
    compileWuxiangPath(builder, context.path.pathId, facade.settings);
  }
  createSelectionStrategy(tacticId: SectTacticId) {
    return new WuxiangMirrorSelectionStrategy(tacticId);
  }
}

class DemonPathModule extends BaseSectPathModule {
  constructor() {
    super(demonDefinition, WUXIANG_DEMON_NODES);
  }
  protected initializeBuild(
    _context: SectPathCompileContext,
    builder: SectBuildBuilder,
  ): void {
    builder.setExtension(
      DEMON_BUILD_FACADE,
      new DemonBuildFacade(createWuxiangBuildSettings()),
    );
  }
  protected finalizeBuild(
    context: SectPathCompileContext,
    builder: SectBuildBuilder,
  ): void {
    const facade = builder.requireExtension<DemonBuildFacade>(
      DEMON_BUILD_FACADE,
      '哺心渡厄构筑',
    );
    compileWuxiangPath(builder, context.path.pathId, facade.settings);
  }
  createSelectionStrategy(tacticId: SectTacticId) {
    return new WuxiangDemonSelectionStrategy(tacticId);
  }
}

export const WUXIANG_MIRROR_PATH_MODULE = new MirrorPathModule();
export const WUXIANG_DEMON_PATH_MODULE = new DemonPathModule();

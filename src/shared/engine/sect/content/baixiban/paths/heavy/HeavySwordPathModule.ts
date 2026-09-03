import {
  BaseSectPathModule,
  STANDARD_PATH_LAYERS,
  type SectBuildBuilder,
  type SectPathCompileContext,
  type SectPathDefinitionWithoutNodes,
  type SectTacticId,
} from '../../../../core';
import { HEAVY_SWORD_PATH_ID } from '../../ids';
import {
  heavySwordBuild,
  initializeHeavySwordBuild,
} from './HeavySwordBuildFacade';
import { HEAVY_SWORD_NODES } from './nodes';
import { BaixibanHeavySelectionStrategy } from './strategy';

const HEAVY_SWORD_DEFINITION: SectPathDefinitionWithoutNodes = {
  id: HEAVY_SWORD_PATH_ID,
  name: '守拙藏锋',
  description:
    '重剑藏锋，不争一时之快。以身承势，以守养锋：藏锋时化盾蓄念、稳住自身，开锋时以一剑定局。戏念既成，此器便是谢幕。',
  minRealm: '守灯',
  minRealmStage: '中期',
  layers: [...STANDARD_PATH_LAYERS],
  defaultTacticId: 'heavy-break',
  presentation: {
    highlights: [
      { name: '藏锋蓄势', description: '以护盾吸收伤害并积蓄戏念，锋含未露。' },
      { name: '承势反击', description: '在承受敌势后发动反击，借力还施。' },
      { name: '开锋定局', description: '将戏念汇于高倍率单段重击，一剑决局。' },
    ],
    abilityChanges: {
      'plain-sword': '重剑沉劲，提高基础威力，维持稳定积势。',
      'sect-ultimate': '开锋一击，提高戏念转化倍率，强化单段爆发。',
      'guiding-sword': '重剑引势，提高威力并获得护盾，但增加冷却。',
      'linked-edge':
        '重剑开锋，由三段连击改为单段重击，并获得护盾；冷却增加，但不再进入调息。',
      'turning-body': '藏锋蓄势，保留先守后攻，进一步提高直接伤害减免。',
      'shadow-step': '重剑沉桩，由灯影闪避强化改为护盾、物防与积势。',
      'breaking-edge': '重锋破势，提高攻击威力，保留驱散能力。',
      'sword-aegis': '以重护身，提高灯律防御并降低直接伤害，但不再提供控制抗性。',
      'nurturing-sword': '重剑负岳，降低部分物攻增幅，同时提高物防。',
    },
  },
  tactics: [
    {
      id: 'heavy-break',
      name: '后发',
      description:
        '以守藏锋，优先施展《压轴》蓄势，围绕受到伤害与反击积蓄戏念，达到3点后开锋收束。',
    },
    {
      id: 'heavy-full',
      name: '极势',
      description:
        '藏锋蓄满之势：4点戏念起且裂甲不足2层时，提前准备《压轴》开锋；6点戏念但裂甲仍不足时先补甲，满足后以《谢幕》一剑定局。',
    },
    {
      id: 'heavy-guard',
      name: '守山',
      description:
        '守山如重剑沉肩：无护盾时优先《圆场》稳势；气血低于65%且《心戏通明》缺失时施展戏心固本；戏念达到5点后开锋收束。',
    },
  ],
};

export class HeavySwordPathModule extends BaseSectPathModule {
  constructor() {
    super(HEAVY_SWORD_DEFINITION, HEAVY_SWORD_NODES);
  }

  protected initializeBuild(
    context: SectPathCompileContext,
    builder: SectBuildBuilder,
  ): void {
    initializeHeavySwordBuild(context, builder);
  }

  protected finalizeBuild(
    _context: SectPathCompileContext,
    builder: SectBuildBuilder,
  ): void {
    heavySwordBuild(builder).finalize();
  }

  createSelectionStrategy(tacticId: SectTacticId) {
    return new BaixibanHeavySelectionStrategy(tacticId);
  }
}

export const BAIXIBAN_HEAVY_PATH_MODULE = new HeavySwordPathModule();
export const HEAVY_SWORD_PATH = BAIXIBAN_HEAVY_PATH_MODULE.definition;

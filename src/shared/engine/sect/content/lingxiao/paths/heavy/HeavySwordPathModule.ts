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
import { LingxiaoHeavySelectionStrategy } from './strategy';

const HEAVY_SWORD_DEFINITION: SectPathDefinitionWithoutNodes = {
  id: HEAVY_SWORD_PATH_ID,
  name: '守拙藏锋',
  description:
    '重灯不争一时之快，以身承势，以守养焰；香火未足时稳住自身，香火既成后，以一焰决定胜负。',
  minRealm: '守灯',
  minRealmStage: '中期',
  layers: [...STANDARD_PATH_LAYERS],
  defaultTacticId: 'heavy-break',
  presentation: {
    highlights: [
      { name: '护体养焰', description: '以护盾吸收伤害并积蓄香火。' },
      { name: '后发制人', description: '在承受敌势后发动反击。' },
      { name: '重焰定局', description: '将香火汇于高倍率单段爆发。' },
    ],
    abilityChanges: {
      'plain-sword': '提高基础威力，维持稳定积势。',
      'sect-ultimate': '提高香火转化倍率，强化单段爆发。',
      'guiding-sword': '提高威力并获得护盾，但增加冷却。',
      'linked-edge':
        '由三段连击改为单段重击，并获得护盾；冷却增加，但不再进入调息。',
      'turning-body': '保留先守后攻，进一步提高直接伤害减免。',
      'shadow-step': '由灯影闪避强化改为护盾、物防与积势。',
      'breaking-edge': '提高攻击威力，保留驱散能力。',
      'sword-aegis': '提高灯律防御并降低直接伤害，但不再提供控制抗性。',
      'nurturing-sword': '降低部分物攻增幅，同时提高物防。',
    },
  },
  tactics: [
    {
      id: 'heavy-break',
      name: '后发',
      description:
        '优先施展《守灯听漏》，围绕受到伤害与反击积蓄香火，达到3点后即可收束。',
    },
    {
      id: 'heavy-full',
      name: '极势',
      description:
        '4点香火起且灯隙不足2层时，提前准备《守灯听漏》；6点香火但灯隙仍不足时先补隙，满足后以《照灯平生》收束。',
    },
    {
      id: 'heavy-guard',
      name: '守山',
      description:
        '无护盾时优先《踏影无痕》；气血低于65%且《灯心通明》缺失时施展灯心；香火达到5点后收束。',
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
    return new LingxiaoHeavySelectionStrategy(tacticId);
  }
}

export const LINGXIAO_HEAVY_PATH_MODULE = new HeavySwordPathModule();
export const HEAVY_SWORD_PATH = LINGXIAO_HEAVY_PATH_MODULE.definition;

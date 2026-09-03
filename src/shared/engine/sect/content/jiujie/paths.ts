import { BaseSectPathModule, STANDARD_PATH_LAYERS, type SectBuildBuilder, type SectPathCompileContext, type SectPathDefinitionWithoutNodes, type SectTacticId } from '../../core';
import { compileJiujieBase } from './base/JiujieBaseCompiler';
import { JIUJIE_CONDEMNATION_PATH_ID, JIUJIE_EYE_PATH_ID } from './ids';
import { JIUJIE_EYE_NODES } from './paths/eye/nodes';
import { JIUJIE_CONDEMNATION_NODES } from './paths/condemnation/nodes';
import { CONDEMNATION_BUILD_FACADE, EYE_BUILD_FACADE, JiujieCondemnationBuildFacade, JiujieEyeBuildFacade, createJiujieBuildSettings } from './shared/buildFacade';
import { JiujieCondemnationSelectionStrategy, JiujieEyeSelectionStrategy } from './strategy';

const eyeDefinition: SectPathDefinitionWithoutNodes = { id: JIUJIE_EYE_PATH_ID, name: '灯眼临身', description: '以身为灯眼，将敌人的来力、自己的伤势与灯痕串成因果，再决定反击、护命或重开灯眼。', minRealm: '守灯', minRealmStage: '中期', layers: [...STANDARD_PATH_LAYERS], defaultTacticId: 'bear-and-return', tactics: [{ id: 'bear-and-return', name: '承焰归案', description: '先开启灯眼承受爆发，积满灯焰后立即清算。' }, { id: 'close-the-eye', name: '闭目守灯', description: '低血时借焰护身，其余时间保留灯焰等待清算。' }, { id: 'eye-of-thunder', name: '灯眼照身', description: '开启灯眼后优先落印，持续追问照见者。' }], presentation: { highlights: [{ name: '照见来者', description: '第一次攻击灯眼者会被照见，并受到后续神通追究。' }, { name: '血甲同书', description: '承焰量可从伤势和护盾中积累，并转为伤害、治疗或护盾。' }, { name: '案后再开', description: '清算可以结束一灯，也可以立即开启下一轮承焰。' }], abilityChanges: { 'receive-calamity': '节点改变开眼方式、承焰来源、受击反应与灯眼续期。', 'thunder-prison-question': '节点可追究照见目标并连接承焰循环。', 'borrow-calamity': '节点可延续灯眼或在破盾后回生标痕。', 'nine-sky-settlement': '节点决定承焰量转为真实伤害、治疗、护盾或下一轮灯眼。' } } };
const condemnationDefinition: SectPathDefinitionWithoutNodes = { id: JIUJIE_CONDEMNATION_PATH_ID, name: '灯律加身', description: '观察目标如何行动，在重复主罪、改变罪名与退回照灯指之间立案、追责并终审。', minRealm: '守灯', minRealmStage: '中期', layers: [...STANDARD_PATH_LAYERS], defaultTacticId: 'record-and-judge', tactics: [{ id: 'record-and-judge', name: '记罪清算', description: '先施灯痕，再等待目标重复主罪后清算。' }, { id: 'heavy-statute', name: '重典', description: '优先催审满债目标，再以终式兑现判词。' }, { id: 'listen-to-heaven', name: '灯听', description: '维持灯痕，积累灯焰后执行终审。' }], presentation: { highlights: [{ name: '三类主罪', description: '伤罪、援罪与禁罪各自招致不同惩罚。' }, { name: '变招有责', description: '重复、变罪和连续照灯指都可被不同参悟追究。' }, { name: '九灯判词', description: '终审可以速审、分类判罚，或清算后立即重新立案。' }], abilityChanges: { 'heaven-hearing': '灯痕期间每两次连续照灯指给予1点灯焰；节点可另行立案、延长灯痕或增加案债。', 'calamity-seal': '节点可锁定主罪、追究变罪并加速问行。', 'thunder-prison-question': '节点可取得重犯证据或强制下一次行动候审。', 'nine-sky-settlement': '节点决定速审成本、分类判词、留案与重新立案。' } } };

class EyePathModule extends BaseSectPathModule {
  constructor() { super(eyeDefinition, JIUJIE_EYE_NODES); }
  protected initializeBuild(_context: SectPathCompileContext, builder: SectBuildBuilder): void { builder.setExtension(EYE_BUILD_FACADE, new JiujieEyeBuildFacade(createJiujieBuildSettings(JIUJIE_EYE_PATH_ID))); }
  protected finalizeBuild(context: SectPathCompileContext, builder: SectBuildBuilder): void { compileJiujieBase(context, builder, builder.requireExtension<JiujieEyeBuildFacade>(EYE_BUILD_FACADE, '灯眼临身构筑').settings); }
  createSelectionStrategy(tacticId: SectTacticId) { return new JiujieEyeSelectionStrategy(tacticId); }
}
class CondemnationPathModule extends BaseSectPathModule {
  constructor() { super(condemnationDefinition, JIUJIE_CONDEMNATION_NODES); }
  protected initializeBuild(_context: SectPathCompileContext, builder: SectBuildBuilder): void { builder.setExtension(CONDEMNATION_BUILD_FACADE, new JiujieCondemnationBuildFacade(createJiujieBuildSettings(JIUJIE_CONDEMNATION_PATH_ID))); }
  protected finalizeBuild(context: SectPathCompileContext, builder: SectBuildBuilder): void { compileJiujieBase(context, builder, builder.requireExtension<JiujieCondemnationBuildFacade>(CONDEMNATION_BUILD_FACADE, '灯律加身构筑').settings); }
  createSelectionStrategy(tacticId: SectTacticId) { return new JiujieCondemnationSelectionStrategy(tacticId); }
}
export const JIUJIE_EYE_PATH_MODULE = new EyePathModule();
export const JIUJIE_CONDEMNATION_PATH_MODULE = new CondemnationPathModule();

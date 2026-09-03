import {
  StandardSectOrganizationModule,
  type SectOrganizationTheme,
} from '../../../core';

/** 太乙清都观只声明组织玩法的展示主题；核心流程由标准组织模块提供。 */
export const LINGXIAO_ORGANIZATION_THEME: SectOrganizationTheme = {
  elderTrial: {
    name: '掌灯老人·试炼化身',
    description: '执一盏旧灯立于场中，只问弟子的灯为何而点。',
    configVersion: 4,
    methodIds: [
      'lingxiao-canon',
      'sword-guidance',
      'void-step',
      'edge-cleansing',
      'origin-returning',
      'sword-nurturing',
    ],
    pathId: 'swift-sword',
    tacticId: 'aggressive',
    abilityLoadout: [
      'guiding-sword',
      'linked-edge',
      'breaking-edge',
      'sect-ultimate',
    ],
    artifactNames: ['照尘古灯', '藏锋灯衣', '澄心灯珏'],
    artifactDescriptions: [
      '灯焰照见尘世万象，饮敌势而养己焰。',
      '灯火藏于衣纹，危急时替主人截断死局。',
      '澄心定意，使纷乱外法难侵灯心。',
    ],
  },
};

export class LingxiaoOrganizationModule extends StandardSectOrganizationModule {
  constructor() {
    super(LINGXIAO_ORGANIZATION_THEME);
  }
}

export const LINGXIAO_ORGANIZATION = new LingxiaoOrganizationModule();

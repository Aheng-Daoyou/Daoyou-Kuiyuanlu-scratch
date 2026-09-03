import {
  StandardSectOrganizationModule,
  type SectOrganizationTheme,
} from '../../../core';

/** 百戏班只声明组织玩法的展示主题；核心流程由标准组织模块提供。 */
export const BAIXIBAN_ORGANIZATION_THEME: SectOrganizationTheme = {
  elderTrial: {
    name: '听戏老人·试炼化身',
    description: '执一柄旧器立于场中，只问弟子的器为何而出。',
    configVersion: 4,
    methodIds: [
      'baixiban-canon',
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
    artifactNames: ['照尘古器', '藏锋器衣', '澄心器珏'],
    artifactDescriptions: [
      '器身照见尘世万象，饮敌势而养己锋。',
      '戏气藏于衣纹，危急时替主人截断死局。',
      '澄心定意，使纷乱外法难侵戏心。',
    ],
  },
};

export class BaixibanOrganizationModule extends StandardSectOrganizationModule {
  constructor() {
    super(BAIXIBAN_ORGANIZATION_THEME);
  }
}

export const BAIXIBAN_ORGANIZATION = new BaixibanOrganizationModule();

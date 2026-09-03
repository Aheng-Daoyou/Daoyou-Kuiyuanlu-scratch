import type { SectOrganizationTheme } from '../../core';

export const WUXIANG_ORGANIZATION_THEME: SectOrganizationTheme = {
  elderTrial: {
    name: '空慈乳母·试炼化身',
    description: '胎血二相同现，以色身与莲火检验来者灯心。',
    configVersion: 2,
    methodIds: [
      'wuxiang-canon',
      'blood-lotus',
      'white-bone',
      'wrathful-ming',
      'six-senses',
      'reed-crossing-method',
    ],
    pathId: 'mirror-karma',
    tacticId: 'guard',
    abilityLoadout: [
      'turn-form',
      'blood-tide',
      'three-knocks',
      'observe-calamity',
    ],
    artifactNames: ['哺心杵', '皮囊莲衣', '莲镜心珠'],
    artifactDescriptions: [
      '哺心杵饮下敌势，以胎血二力反照来处。',
      '皮囊与血莲交织成衣，危急时护住色身。',
      '莲镜照业，令侵入心识的诸相无所遁形。',
    ],
  },
  facilityNames: {
    archive: '贝叶藏',
    cultivation_room: '守胎室',
    workshop: '火供院',
  },
};

import {
  ConfiguredSectNodePlugin,
  type SectMeridianNodeDefinition,
} from '../../../../core';
import {
  DEMON_BUILD_FACADE,
  DemonBuildFacade,
} from '../../shared/buildFacades';

function demonNode(
  definition: SectMeridianNodeDefinition,
  apply: (facade: DemonBuildFacade) => void,
): ConfiguredSectNodePlugin {
  return new ConfiguredSectNodePlugin(definition, (_context, builder) => {
    apply(
      builder.requireExtension<DemonBuildFacade>(
        DEMON_BUILD_FACADE,
        '哺心渡厄构筑',
      ),
    );
  });
}

export const WUXIANG_DEMON_NODES = [
  demonNode(
    {
      id: 'demon-blood-oil',
      layerId: '1',
      name: '血作灯油',
      description:
        '所有胎相神通气血成本提高1个百分点；成功施展后获得2%最大气血护盾。',
    },
    (demon) => demon.strengthenBuddhistBody(),
  ),
  demonNode(
    {
      id: 'demon-three-shores',
      layerId: '1',
      name: '三岸留痕',
      description:
        '每场战斗首次因自身神通成本降至35%气血以下时，获得8%最大气血护盾。',
    },
    (demon) => demon.addThresholdShield(),
  ),
  demonNode(
    {
      id: 'demon-bone-tide',
      layerId: '1',
      name: '潮伏骨中',
      description: '血莲听潮获得的基础护盾由10%提高至15%最大气血。',
    },
    (demon) => demon.strengthenTideShield(),
  ),
  demonNode(
    {
      id: 'demon-flower-inward',
      layerId: '2',
      name: '花开向内',
      description: '哺隙令下一次宗门直接伤害提高25%。',
    },
    (demon) => demon.strengthenHeartGap(),
  ),
  demonNode(
    {
      id: 'demon-no-return-tide',
      layerId: '2',
      name: '潮不回头',
      description:
        '血莲听潮生成的下一门宗门直接伤害加成由20%提高至30%；莲相仍以30%为准。',
    },
    (demon) => demon.strengthenTideDamage(),
  ),
  demonNode(
    {
      id: 'demon-third-outside',
      layerId: '2',
      name: '门外三声',
      description: '三叩莲门强化第三击的气血线由45%提高至55%。',
    },
    (demon) => demon.raiseThirdHitThreshold(),
  ),
  demonNode(
    {
      id: 'demon-slow-fire',
      layerId: '3',
      name: '莲火缓行',
      description: '闭目观劫的直接伤害减免由40%提高至50%。',
    },
    (demon) => demon.strengthenObserveGuard(),
  ),
  demonNode(
    {
      id: 'demon-skandhas-fuel',
      layerId: '3',
      name: '胎蕴作薪',
      description:
        '照见胎蕴的胎相净化数量由1提高至2；显化莲相时共净化3个减益。',
    },
    (demon) => demon.addCleanse(),
  ),
  demonNode(
    {
      id: 'demon-short-reed',
      layerId: '3',
      name: '苇短水长',
      description:
        '一苇横江的胎相直接伤害减免由20%提高至30%；血相最终提高到40%。',
    },
    (demon) => demon.strengthenReedGuard(),
  ),
  demonNode(
    {
      id: 'demon-first-thought',
      layerId: '4',
      name: '初哺显化',
      description:
        '进入血相或莲相时获得初哺：下一门攻击神通额外造成0.35倍物攻伤害，防御神通获得5%最大气血护盾。',
    },
    (demon) => demon.grantFirstThought(),
  ),
  demonNode(
    {
      id: 'demon-second-shore',
      layerId: '4',
      name: '第二岸苦',
      description:
        '血相期间每成功施展一门宗门神通，恢复2.5%最大气血；莲相仅触发一次。',
    },
    (demon) => demon.healAfterDemonSkill(),
  ),
  demonNode(
    {
      id: 'demon-two-gates',
      layerId: '4',
      name: '两门同渡',
      description: '进入血相时获得的护盾由6%提高至10%最大气血。',
    },
    (demon) => demon.shieldOnDemonEntry(),
  ),
  demonNode(
    {
      id: 'demon-body-breaks',
      layerId: '5',
      name: '身坏心明',
      description:
        '每场战斗首次因自身神通成本降至30%气血以下时，获得1回合控制免疫。',
    },
    (demon) => demon.grantLowHpControlImmunity(),
  ),
  demonNode(
    {
      id: 'demon-blood-empty',
      layerId: '5',
      name: '血尽潮生',
      description:
        '每场战斗首次因自身神通成本降至25%气血以下时，恢复5%最大气血。',
    },
    (demon) => demon.healAtCriticalHp(),
  ),
  demonNode(
    {
      id: 'demon-leave-boat',
      layerId: '5',
      name: '渡后留舟',
      description: '血相结束时获得6%最大气血护盾；莲相结束不触发。',
    },
    (demon) => demon.shieldOnDemonExit(),
  ),
  demonNode(
    {
      id: 'demon-one-furnace',
      layerId: 'ultimate',
      name: '胎血同炉',
      description:
        '强化六门神通的莲相变化，使收束伤害、恢复、护盾或净化获得提升。',
    },
    (demon) => demon.strengthenFormlessLayers(),
  ),
  demonNode(
    {
      id: 'demon-no-gap',
      layerId: 'ultimate',
      name: '一息无间',
      description:
        '血相与莲相的单行动吸血上限提高至12%最大气血，但哺渡直接伤害减免由20%降低至10%。',
    },
    (demon) => demon.tradeGuardForLifesteal(),
  ),
  demonNode(
    {
      id: 'demon-look-back',
      layerId: 'ultimate',
      name: '回首彼岸',
      description:
        '血相或莲相结束时，若存活且低于20%气血，恢复5%最大气血；每次转相最多一次。',
    },
    (demon) => demon.healAfterCrossing(),
  ),
];

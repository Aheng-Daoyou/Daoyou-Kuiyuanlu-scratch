import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import {
  growthMagnitude,
  growthStatusMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import { heavySwordBuild } from '../HeavySwordBuildFacade';
import {
  HEAVY_CHARGED_GUARD_SHIELD_COEFFICIENT,
  HEAVY_CHARGED_REDUCTION,
  HEAVY_CHARGED_STRIKE_COEFFICIENT,
} from '../variants';

export const HEAVY_LAYER_2_NODES = [
  createBaixibanNode(
    {
      id: 'heavy-triple-ridge',
      layerId: '2',
      name: '蓄岳',
      description: '提高《压轴》蓄势期间随《圆场步》成长的直接伤害减免。',
    },
    (_context, builder) => heavySwordBuild(builder).enable('chargedReduction'),
    (context) =>
      `《压轴》蓄势期间受到的直接伤害降低${nodePercent(growthStatusMagnitude(context, 'void-step', HEAVY_CHARGED_REDUCTION))}。`,
  ),
  createBaixibanNode(
    {
      id: 'heavy-shattering-armor',
      layerId: '2',
      name: '听雷',
      description: '提高《压轴》的后发攻击，并使其共施加2层裂甲。',
    },
    (_context, builder) => heavySwordBuild(builder).enable('chargedStrike'),
    (context) =>
      `《压轴》的后发《听雷》造成相当于${nodePercent(growthMagnitude(context, 'void-step', HEAVY_CHARGED_STRIKE_COEFFICIENT))}物攻的伤害，并共施加2层裂甲。`,
  ),
  createBaixibanNode(
    {
      id: 'heavy-retained-frame',
      layerId: '2',
      name: '守心',
      description: '施展《压轴》开始蓄势时，获得随《圆场步》成长的护盾。',
    },
    (_context, builder) =>
      heavySwordBuild(builder).enable('chargedGuardShield'),
    (context) =>
      `施展《压轴》开始蓄势时，获得相当于${nodePercent(growthMagnitude(context, 'void-step', HEAVY_CHARGED_GUARD_SHIELD_COEFFICIENT))}物攻的护盾。`,
  ),
] as const;

import { createBaixibanNode } from '../../../shared/createBaixibanNode';
import {
  growthMagnitude,
  nodePercent,
} from '../../../shared/BaixibanNodeDescription';
import { swiftSwordBuild } from '../SwiftSwordBuildFacade';
import { SWIFT_SPLIT_LIGHT_HIT_COEFFICIENT } from '../variants';

export const SWIFT_LAYER_2_NODES = [
  createBaixibanNode(
    {
      id: 'swift-split-light',
      layerId: '2',
      name: '分光',
      description:
        '《走场》维持3段攻击并获得3点戏念；总伤害随《走场歌》成长。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('splitLight'),
    (context) =>
      `《走场》进行3段攻击，每段造成相当于${nodePercent(growthMagnitude(context, 'sword-guidance', SWIFT_SPLIT_LIGHT_HIT_COEFFICIENT))}物攻的伤害，并获得3点戏念。`,
  ),
  createBaixibanNode(
    {
      id: 'swift-stacking-waves',
      layerId: '2',
      name: '叠浪',
      description: '施展《走场》后，其当前冷却减少1回合。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('stackingWaves'),
  ),
  createBaixibanNode(
    {
      id: 'swift-retained-force',
      layerId: '2',
      name: '留痕',
      description: '《走场》额外施加1层戏痕，共施加2层。',
    },
    (_context, builder) => swiftSwordBuild(builder).enable('retainedForce'),
  ),
] as const;

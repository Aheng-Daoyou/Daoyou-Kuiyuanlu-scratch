import type { AbilitySelectionCandidate } from '@shared/engine/battle-v5/abilities/AbilitySelectionStrategy';
import type { ActiveSkill } from '@shared/engine/battle-v5/abilities/ActiveSkill';
import { AttributeType, BuffType } from '@shared/engine/battle-v5/core/types';
import { AbilityFactory } from '@shared/engine/battle-v5/factories/AbilityFactory';
import { BuffFactory } from '@shared/engine/battle-v5/factories/BuffFactory';
import { Unit } from '@shared/engine/battle-v5/units/Unit';
import { describe, expect, it } from 'vitest';
import {
  LINGXIAO_HEAVY_PATH_MODULE,
  LINGXIAO_SWIFT_PATH_MODULE,
  LINGXIAO_SWORD_MOMENTUM,
  LingxiaoHeavySelectionStrategy,
  LingxiaoSwiftSelectionStrategy,
} from '..';
import { resolveSectAbility } from '../..';
import type { CultivatorSectState } from '../../../core';

type PathId = 'swift-sword' | 'heavy-sword';

function state(pathId: PathId): CultivatorSectState {
  return {
    membershipId: 'lingxiao-strategy',
    sectId: 'lingxiao',
    status: 'active',
    contribution: 0,
    configVersion: 4,
    activePathId: pathId,
    methods: {
      'lingxiao-canon': 100,
      'sword-guidance': 100,
      'void-step': 100,
      'edge-cleansing': 100,
      'origin-returning': 100,
      'sword-nurturing': 100,
    },
    paths: [
      {
        pathId,
        unlockedLayerIds: [],
        tacticId: pathId === 'swift-sword' ? 'aggressive' : 'heavy-break',
        activeMeridianSlot: 1,
        meridianLoadouts: [
          { slot: 1, nodeIds: [], version: 1 },
          { slot: 2, nodeIds: [], version: 1 },
          { slot: 3, nodeIds: [], version: 1 },
        ],
      },
    ],
    abilityLoadout: [
      'guiding-sword',
      'breaking-edge',
      'sword-aegis',
      'sect-ultimate',
    ],
  };
}

function unit(id: string): Unit {
  return new Unit(id, id, {
    [AttributeType.VITALITY]: 100,
    [AttributeType.SPIRIT]: 100,
    [AttributeType.ENDURANCE]: 100,
    [AttributeType.SPEED]: 100,
    [AttributeType.WILLPOWER]: 100,
  });
}

function context(pathId: PathId, abilityIds: string[]) {
  const sect = state(pathId);
  const caster = unit('caster');
  const opponent = unit('opponent');
  caster.combatResources.define({
    id: LINGXIAO_SWORD_MOMENTUM,
    name: '剑意',
    initial: 0,
    max: 6,
  });
  const candidates: AbilitySelectionCandidate[] = abilityIds.map(
    (abilityId, order) => {
      const ability = AbilityFactory.create(
        resolveSectAbility({ sect, realm: '化神', abilityId }).config,
      ) as ActiveSkill;
      ability.setOwner(caster);
      ability.setActive(true);
      return {
        ability,
        target: ability.targetPolicy.team === 'enemy' ? opponent : caster,
        order,
      };
    },
  );
  return { caster, opponent, candidates };
}

describe('流派策略插件', () => {
  it('按流派创建互相独立的策略', () => {
    expect(
      LINGXIAO_SWIFT_PATH_MODULE.createSelectionStrategy('aggressive'),
    ).toBeInstanceOf(LingxiaoSwiftSelectionStrategy);
    expect(
      LINGXIAO_HEAVY_PATH_MODULE.createSelectionStrategy('heavy-break'),
    ).toBeInstanceOf(LingxiaoHeavySelectionStrategy);
  });

  it('两个流派的六个战术都由各自模块接受并创建策略', () => {
    for (const tactic of LINGXIAO_SWIFT_PATH_MODULE.definition.tactics) {
      expect(
        LINGXIAO_SWIFT_PATH_MODULE.createSelectionStrategy(tactic.id),
      ).toBeInstanceOf(LingxiaoSwiftSelectionStrategy);
    }
    for (const tactic of LINGXIAO_HEAVY_PATH_MODULE.definition.tactics) {
      expect(
        LINGXIAO_HEAVY_PATH_MODULE.createSelectionStrategy(tactic.id),
      ).toBeInstanceOf(LingxiaoHeavySelectionStrategy);
    }
  });

  it.each([
    [
      '照影游尘',
      'swift-sword',
      new LingxiaoSwiftSelectionStrategy('aggressive'),
    ],
    [
      '守拙藏锋',
      'heavy-sword',
      new LingxiaoHeavySelectionStrategy('heavy-break'),
    ],
  ] as const)(
    '%s在目标存在可驱散增益时使用一剑破妄',
    (_label, pathId, strategy) => {
      const battle = context(pathId, ['guiding-sword', 'breaking-edge']);
      battle.opponent.buffs.addBuff(
        BuffFactory.create({
          id: 'test.dispellable',
          name: '可驱散增益',
          type: BuffType.BUFF,
          duration: 2,
        }),
        battle.opponent,
      );

      expect(strategy.select(battle)?.ability.id).toBe(
        'sect.lingxiao.breaking-edge',
      );
    },
  );

  it('快剑普通回退使用通用评分，不因槽位顺序改变结果', () => {
    const strategy = new LingxiaoSwiftSelectionStrategy('aggressive');
    const first = strategy.select(
      context('swift-sword', ['sword-aegis', 'breaking-edge']),
    );
    const second = strategy.select(
      context('swift-sword', ['breaking-edge', 'sword-aegis']),
    );

    expect(first?.ability.id).toBe('sect.lingxiao.breaking-edge');
    expect(second?.ability.id).toBe(first?.ability.id);
  });
});

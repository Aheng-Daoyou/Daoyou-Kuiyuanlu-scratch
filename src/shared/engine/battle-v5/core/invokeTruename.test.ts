import { describe, expect, it, beforeEach } from 'vitest';
import { AbilityFactory } from '../factories/AbilityFactory';
import { EventBus } from './EventBus';
import { Unit } from '../units/Unit';
import { AttributeType } from './types';
import {
  buildInvokeTruenameAbility,
  buildSanityResource,
  INVOKE_TRUENAME_ABILITY_SLUG,
  SANITY_RESOURCE_ID,
  TRUENAME_SUPPRESS_BUFF_ID,
  buildTruenameSuppressBuff,
  TRUENAME_SANITY_BURN_RATIO,
} from './sanity';

/**
 * 呼真名处置动作测试。
 *
 * 验证克苏鲁核心动作「呼真名」：
 *  - 主动技能配置可被实例化并挂载。
 *  - 效果链包含「灼烧目标当前神智」与「施加真名受缚」。
 *  - 真名受缚 debuff 具备攻防压制数值。
 */
const TEST_SOURCE = { kind: 'system' as const, id: 'test', name: '测试' };

function makeUnit(id: string, realm: '闻腥' = '闻腥'): Unit {
  const unit = new Unit(id, id, {
    [AttributeType.VITALITY]: 10,
    [AttributeType.SPIRIT]: 10,
    [AttributeType.ENDURANCE]: 10,
    [AttributeType.SPEED]: 10,
    [AttributeType.WILLPOWER]: 10,
  });
  unit.combatResources.define(buildSanityResource(realm));
  return unit;
}

describe('呼真名处置动作', () => {
  beforeEach(() => {
    EventBus.instance.reset();
  });

  it('呼真名主动技能可被实例化并挂载', () => {
    const unit = makeUnit('player');
    unit.abilities.addAbility(
      AbilityFactory.create(buildInvokeTruenameAbility()),
    );
    expect(unit.abilities.getAbility(INVOKE_TRUENAME_ABILITY_SLUG)).toBeDefined();
  });

  it('呼真名效果链包含神智灼烧与真名受缚', () => {
    const config = buildInvokeTruenameAbility();
    const effectTypes = (config.effects ?? []).map((e) => e.type);
    expect(effectTypes).toContain('combat_resource_modify');
    expect(effectTypes).toContain('apply_buff');

    const sanityBurn = (config.effects ?? []).find(
      (e) => e.type === 'combat_resource_modify',
    );
    if (sanityBurn?.type === 'combat_resource_modify') {
      expect(sanityBurn.params.resourceId).toBe(SANITY_RESOURCE_ID);
      expect(sanityBurn.params.operation).toBe('subtract');
      expect(sanityBurn.params.ratioOfCurrent).toBe(TRUENAME_SANITY_BURN_RATIO);
    } else {
      throw new Error('呼真名缺少神智灼烧效果');
    }
  });

  it('真名受缚 debuff 提供攻防压制', () => {
    const buff = buildTruenameSuppressBuff();
    expect(buff.id).toBe(TRUENAME_SUPPRESS_BUFF_ID);
    expect(buff.duration).toBe(2);
    const atk = buff.modifiers.find((m) => m.attrType === AttributeType.ATK);
    const def = buff.modifiers.find((m) => m.attrType === AttributeType.DEF);
    expect(atk?.value).toBe(-0.25);
    expect(def?.value).toBe(-0.15);
  });

  it('呼真名配置消耗灯焰并有冷却', () => {
    const config = buildInvokeTruenameAbility();
    expect(config.mpCost).toBeGreaterThan(0);
    expect(config.cooldown).toBeGreaterThan(0);
    expect(config.targetPolicy?.team).toBe('enemy');
    expect(config.targetPolicy?.scope).toBe('single');
  });
});

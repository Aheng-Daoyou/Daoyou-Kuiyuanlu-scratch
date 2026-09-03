import type { AbilitySelectionContext } from '@shared/engine/battle-v5/abilities/AbilitySelectionStrategy';
import { AttributeType, BuffType } from '@shared/engine/battle-v5/core/types';
import {
  SectStrategyCandidates,
  SectTacticalSelectionStrategy,
  type SectTacticId,
} from '../../../../core';
import { LINGXIAO_SECT_ID } from '../../ids';
import {
  LINGXIAO_RETURNING_SWALLOW_BUFF,
  LINGXIAO_SWORD_MARK_BUFF,
  LINGXIAO_SWORD_MOMENTUM,
} from '../../shared/LingxiaoMechanics';

export class LingxiaoSwiftSelectionStrategy extends SectTacticalSelectionStrategy {
  constructor(private readonly tacticId: SectTacticId) {
    super(LINGXIAO_SECT_ID);
  }

  protected decide(context: AbilitySelectionContext) {
    const { caster, opponent, candidates } = context;
    if (!opponent || candidates.length === 0) return this.defaultAttack();
    const index = new SectStrategyCandidates(LINGXIAO_SECT_ID, candidates);
    const momentum = caster.combatResources.getCurrent(LINGXIAO_SWORD_MOMENTUM);
    const finisherThreshold =
      this.tacticId === 'aggressive' ? 3 : this.tacticId === 'counter' ? 5 : 6;
    const buffs = new Set(caster.buffs.getAllBuffIds());
    const swordMarks =
      opponent.buffs
        .getAllBuffs()
        .find((buff) => buff.id === LINGXIAO_SWORD_MARK_BUFF)
        ?.getLayer() ?? 0;
    const turning = index.find('turning-body');
    if (
      this.tacticId === 'counter' &&
      turning &&
      !buffs.has(LINGXIAO_RETURNING_SWALLOW_BUFF)
    ) {
      return this.castCandidate(turning, 620);
    }
    const step = index.find('shadow-step');
    if (
      this.tacticId === 'counter' &&
      step &&
      !buffs.has('sect.lingxiao.swift.traceless-step') &&
      caster.attributes.getValue(AttributeType.SPEED) <=
        opponent.attributes.getValue(AttributeType.SPEED)
    ) {
      return this.castCandidate(step, 610);
    }
    const linked = index.find('linked-edge');
    if (this.tacticId === 'steady' && linked && swordMarks < 2) {
      return this.castCandidate(linked, 640);
    }
    const heart = index.find('sword-aegis');
    if (
      heart &&
      !buffs.has('sect.lingxiao.swift.wind-heart') &&
      caster.getHpPercent() < 0.6
    ) {
      return this.castCandidate(heart, 580);
    }
    const finisher = index.find('sect-ultimate');
    if (
      finisher &&
      momentum >= finisherThreshold &&
      (this.tacticId !== 'steady' || swordMarks >= 2)
    ) {
      return this.castCandidate(
        finisher,
        opponent.getHpPercent() < 0.25 ? 560 : 500,
      );
    }
    if (
      opponent.buffs
        .getAllBuffs()
        .some(
          (buff) =>
            buff.type === BuffType.BUFF &&
            buff.countsAsStatus &&
            buff.dispelPolicy === 'normal',
        )
    ) {
      const dispel = index.result('breaking-edge', 480);
      if (dispel) return this.cast(dispel);
    }
    if (linked) return this.castCandidate(linked, 400);

    const lightBuff = index.find('nurturing-sword');
    if (lightBuff && !buffs.has('sect.lingxiao.swift.light-sword')) {
      return this.castCandidate(lightBuff, 340);
    }
    if (
      step &&
      !buffs.has('sect.lingxiao.swift.traceless-step') &&
      caster.attributes.getValue(AttributeType.SPEED) <=
        opponent.attributes.getValue(AttributeType.SPEED)
    ) {
      return this.castCandidate(step, 320);
    }
    const guiding = index.result('guiding-sword', 100);
    return guiding ? this.cast(guiding) : this.fallback();
  }
}

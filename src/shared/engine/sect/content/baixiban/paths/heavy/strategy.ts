import type { AbilitySelectionContext } from '@shared/engine/battle-v5/abilities/AbilitySelectionStrategy';
import { BuffType } from '@shared/engine/battle-v5/core/types';
import {
  SectStrategyCandidates,
  SectTacticalSelectionStrategy,
  type SectTacticId,
} from '../../../../core';
import { BAIXIBAN_SECT_ID } from '../../ids';
import {
  BAIXIBAN_ARMOR_REND_BUFF,
  BAIXIBAN_STAGE_GRACE,
} from '../../shared/BaixibanMechanics';

export class BaixibanHeavySelectionStrategy extends SectTacticalSelectionStrategy {
  constructor(private readonly tacticId: SectTacticId) {
    super(BAIXIBAN_SECT_ID);
  }

  protected decide(context: AbilitySelectionContext) {
    const { caster, opponent, candidates } = context;
    if (!opponent || candidates.length === 0) return this.defaultAttack();
    const index = new SectStrategyCandidates(BAIXIBAN_SECT_ID, candidates);
    const momentum = caster.combatResources.getCurrent(BAIXIBAN_STAGE_GRACE);
    const buffs = new Set(caster.buffs.getAllBuffIds());
    const finisherThreshold =
      this.tacticId === 'heavy-break'
        ? 3
        : this.tacticId === 'heavy-guard'
          ? 5
          : 6;
    const armorRend =
      opponent.buffs
        .getAllBuffs()
        .find((buff) => buff.id === BAIXIBAN_ARMOR_REND_BUFF)
        ?.getLayer() ?? 0;

    const mountainStep = index.find('shadow-step');
    if (
      this.tacticId === 'heavy-guard' &&
      mountainStep &&
      caster.getCurrentShield() <= 0
    ) {
      return this.castCandidate(mountainStep, 650);
    }
    const sinking = index.find('linked-edge');
    if (
      this.tacticId === 'heavy-full' &&
      momentum >= 6 &&
      armorRend < 2 &&
      sinking
    ) {
      return this.castCandidate(sinking, 660);
    }
    const hidden = index.find('turning-body');
    if (
      this.tacticId === 'heavy-full' &&
      momentum >= 4 &&
      armorRend < 2 &&
      hidden &&
      !buffs.has('sect.baixiban.heavy.hidden-edge')
    ) {
      return this.castCandidate(hidden, 650);
    }
    const heart = index.find('sword-aegis');
    if (
      heart &&
      !buffs.has('sect.baixiban.heavy.mountain-heart') &&
      caster.getHpPercent() < 0.65
    ) {
      return this.castCandidate(heart, 620);
    }
    if (
      hidden &&
      this.tacticId === 'heavy-break' &&
      !buffs.has('sect.baixiban.heavy.hidden-edge')
    ) {
      return this.castCandidate(hidden, 590);
    }
    const finisher = index.find('sect-ultimate');
    if (
      finisher &&
      momentum >= finisherThreshold &&
      (this.tacticId !== 'heavy-full' || armorRend >= 2)
    ) {
      return this.castCandidate(
        finisher,
        opponent.getHpPercent() < 0.25 ? 570 : 520,
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
    const heavyIntent = index.find('nurturing-sword');
    if (heavyIntent && !buffs.has('sect.baixiban.heavy.weightless-edge')) {
      return this.castCandidate(heavyIntent, 400);
    }
    if (sinking) return this.castCandidate(sinking, 360);
    const guiding = index.result('guiding-sword', 100);
    return guiding ? this.cast(guiding) : this.fallback();
  }
}

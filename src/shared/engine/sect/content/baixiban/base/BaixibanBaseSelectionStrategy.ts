import { type AbilitySelectionContext } from '@shared/engine/battle-v5/abilities/AbilitySelectionStrategy';
import { AttributeType, BuffType } from '@shared/engine/battle-v5/core/types';
import { SectTacticalSelectionStrategy } from '../../../core';
import { BAIXIBAN_SECT_ID } from '../ids';
import { BAIXIBAN_STAGE_GRACE } from '../shared/BaixibanMechanics';

const BUFF_IDS = {
  clearHeart: 'sect.baixiban.clear-heart',
  swordIntent: 'sect.baixiban.sword-intent',
  tracelessStep: 'sect.baixiban.traceless-step',
} as const;

export class BaixibanBaseSelectionStrategy extends SectTacticalSelectionStrategy {
  constructor() {
    super(BAIXIBAN_SECT_ID);
  }

  protected decide(context: AbilitySelectionContext) {
    const { caster, opponent, candidates } = context;
    if (!opponent || candidates.length === 0) return this.defaultAttack();

    const momentum = caster.combatResources.getCurrent(BAIXIBAN_STAGE_GRACE);
    const buffs = new Set(caster.buffs.getAllBuffIds());
    const result = (abilityId: string, score: number) =>
      this.result(context, abilityId, score);

    if (momentum >= 3 && opponent.getHpPercent() < 0.25) {
      const execute = result('sect-ultimate', 900);
      if (execute) return this.cast(execute);
    }

    if (caster.getHpPercent() < 0.6) {
      const guard =
        result('turning-body', 850) ??
        (!buffs.has(BUFF_IDS.clearHeart) ? result('sword-aegis', 840) : null);
      if (guard) return this.cast(guard);
    }

    if (momentum >= 6) {
      const finisher = result('sect-ultimate', 800);
      if (finisher) return this.cast(finisher);
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
      const dispel = result('breaking-edge', 700);
      if (dispel) return this.cast(dispel);
    }

    if (!buffs.has(BUFF_IDS.swordIntent)) {
      const nurture = result('nurturing-sword', 600);
      if (nurture) return this.cast(nurture);
    }

    if (
      !buffs.has(BUFF_IDS.tracelessStep) &&
      caster.attributes.getValue(AttributeType.SPEED) <=
        opponent.attributes.getValue(AttributeType.SPEED)
    ) {
      const step = result('shadow-step', 550);
      if (step) return this.cast(step);
    }

    const standard = result('linked-edge', 450) ?? result('guiding-sword', 400);
    return standard ? this.cast(standard) : this.fallback();
  }
}

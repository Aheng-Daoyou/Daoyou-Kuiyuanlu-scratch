import {
  DefaultAbilitySelectionStrategy,
  type AbilitySelectionCandidate,
  type AbilitySelectionContext,
  type AbilitySelectionResult,
  type AbilitySelectionScoreModifier,
  type AbilitySelectionStrategy,
} from '@shared/engine/battle-v5/abilities/AbilitySelectionStrategy';
import { GameplayTags } from '@shared/engine/shared/tag-domain';
import type { SectAbilityId, SectId } from '../domain';
import { SectStrategyCandidates } from './SectStrategyCandidates';

export type SectTacticalDecision =
  | { kind: 'cast'; result: AbilitySelectionResult }
  | { kind: 'default' }
  | {
      kind: 'fallback';
      candidates?: AbilitySelectionCandidate[];
      scoreModifier?: AbilitySelectionScoreModifier;
    };

/**
 * 宗门战术只负责表达强制施法、明确普攻和战术偏好。
 * 所有未命中的合法候选统一交给 battle-v5 默认评分，禁止隐式首槽回退。
 */
export abstract class SectTacticalSelectionStrategy implements AbilitySelectionStrategy {
  private readonly fallbackStrategy = new DefaultAbilitySelectionStrategy();

  protected constructor(private readonly sectId: SectId) {}

  protected abstract decide(
    context: AbilitySelectionContext,
  ): SectTacticalDecision;

  select(context: AbilitySelectionContext): AbilitySelectionResult | null {
    const decision = this.decide(context);
    if (decision.kind === 'cast') return decision.result;
    if (decision.kind === 'default') return null;

    const fallbackContext = decision.candidates
      ? { ...context, candidates: decision.candidates }
      : context;
    return this.fallbackStrategy.select(
      fallbackContext,
      decision.scoreModifier,
    );
  }

  protected result(
    context: AbilitySelectionContext,
    abilityId: SectAbilityId,
    score: number,
  ): AbilitySelectionResult | null {
    return new SectStrategyCandidates(this.sectId, context.candidates).result(
      abilityId,
      score,
    );
  }

  protected firstAvailable(
    context: AbilitySelectionContext,
    priorities: readonly SectAbilityId[],
    score: number,
  ): AbilitySelectionResult | null {
    for (const abilityId of priorities) {
      const result = this.result(context, abilityId, score);
      if (result) return result;
    }
    return null;
  }

  protected cast(result: AbilitySelectionResult): SectTacticalDecision {
    return { kind: 'cast', result };
  }

  protected castCandidate(
    candidate: AbilitySelectionCandidate,
    score: number,
  ): SectTacticalDecision {
    return this.cast({
      ability: candidate.ability,
      target: candidate.target,
      score,
    });
  }

  protected defaultAttack(): SectTacticalDecision {
    return { kind: 'default' };
  }

  protected fallback(
    candidates?: AbilitySelectionCandidate[],
    scoreModifier?: AbilitySelectionScoreModifier,
  ): SectTacticalDecision {
    return { kind: 'fallback', candidates, scoreModifier };
  }

  protected rankedFallback(
    priorities: readonly SectAbilityId[],
    candidates?: AbilitySelectionCandidate[],
    baseScore = 0,
  ): SectTacticalDecision {
    const tags = new Map(
      priorities.map((abilityId, index) => [
        GameplayTags.ABILITY.SECT.ability(this.sectId, abilityId),
        baseScore + (priorities.length - index) * 1_000,
      ]),
    );
    return this.fallback(candidates, (candidate) => {
      for (const tag of candidate.ability.tags.getTags()) {
        const bonus = tags.get(tag);
        if (bonus !== undefined) return bonus;
      }
      return 0;
    });
  }
}

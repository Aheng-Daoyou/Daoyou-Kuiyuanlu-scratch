import type { CombatResourceModifyParams } from '../core/configs';
import { executeEffectConfigs } from '../core/effectExecutor';
import { EffectRegistry } from '../factories/EffectRegistry';
import { GameplayEffect, type EffectExecutionContextV3 } from './Effect';

export class CombatResourceModifyEffect extends GameplayEffect {
  constructor(private readonly params: CombatResourceModifyParams) {
    super();
  }

  execute(context: EffectExecutionContextV3): void {
    const unit =
      this.params.target === 'target' ? context.target : context.caster;
    const before = unit.combatResources.getCurrent(this.params.resourceId);
    let amount = 0;

    // 比例扣减：按目标资源「当前值」的比例计算（诡异烧神智）。
    // 仅 subtract 语义下有意义；与固定 amount 互斥，存在时优先。
    if (
      this.params.ratioOfCurrent !== undefined &&
      this.params.ratioOfCurrent > 0
    ) {
      const delta = Math.max(
        1,
        Math.floor(before * this.params.ratioOfCurrent),
      );
      unit.combatResources.consume(this.params.resourceId, delta, {
        attribution: context.attribution,
        trace: context.trace,
        caster: context.caster,
        ability: context.ability,
        operation: 'subtract',
        reason: this.params.reason,
      });
      amount = before - unit.combatResources.getCurrent(this.params.resourceId);
    } else {
      switch (this.params.operation) {
        case 'add':
          unit.combatResources.modify(
            this.params.resourceId,
            Math.max(0, this.params.amount ?? 1),
            {
              attribution: context.attribution,
              trace: context.trace,
              caster: context.caster,
              ability: context.ability,
              operation: 'add',
              reason: this.params.reason,
            },
          );
          amount =
            unit.combatResources.getCurrent(this.params.resourceId) - before;
          break;
        case 'subtract':
          amount = unit.combatResources.consume(
            this.params.resourceId,
            Math.max(0, this.params.amount ?? 1),
            {
              attribution: context.attribution,
              trace: context.trace,
              caster: context.caster,
              ability: context.ability,
              operation: 'subtract',
              reason: this.params.reason,
            },
          );
          break;
        case 'set':
          unit.combatResources.set(
            this.params.resourceId,
            this.params.amount ?? 0,
            {
              attribution: context.attribution,
              trace: context.trace,
              caster: context.caster,
              ability: context.ability,
              operation: 'set',
              reason: this.params.reason,
            },
          );
          amount = Math.abs(
            unit.combatResources.getCurrent(this.params.resourceId) - before,
          );
          break;
        case 'consume_all':
          amount = unit.combatResources.consume(this.params.resourceId, 'all', {
            attribution: context.attribution,
            trace: context.trace,
            caster: context.caster,
            ability: context.ability,
            operation: 'consume_all',
            reason: this.params.reason,
          });
          break;
      }
    }

    const repeat = this.params.scaleEffectsByAmount
      ? amount
      : amount > 0
        ? 1
        : 0;
    for (let index = 0; index < repeat; index += 1) {
      if (!context.canExecuteEffect()) break;
      executeEffectConfigs(this.params.effects ?? [], context);
    }
  }
}

EffectRegistry.getInstance().register(
  'combat_resource_modify',
  (params) => new CombatResourceModifyEffect(params),
);

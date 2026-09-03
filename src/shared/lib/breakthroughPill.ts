import { REALM_VALUES, type RealmType } from '@shared/types/constants';
import type { ConditionOperation, PillSpec } from '@shared/types/consumable';
import type { Consumable } from '@shared/types/cultivator';

export function getNextMajorRealm(realm: RealmType): RealmType | null {
  const index = REALM_VALUES.indexOf(realm);
  if (index < 0 || index >= REALM_VALUES.length - 1) {
    return null;
  }

  return REALM_VALUES[index + 1];
}

export function getBreakthroughPillLabel(
  targetRealm: RealmType | null,
): string {
  switch (targetRealm) {
    case '守灯':
      return '守灯香';
    case '窥渊':
      return '降尘香';
    case '蚀体':
      return '护婴香';
    case '忘川':
      return '叩神香';
    case '执灯':
      return '洞虚香';
    case '掌灯':
      return '合真香';
    case '近神':
      return '证道香';
    case '渡渊':
      return '应劫香';
    default:
      return targetRealm ? `${targetRealm}破境香` : '破境香';
  }
}

export function hasBreakthroughFocusEffect(
  operations: readonly ConditionOperation[],
): boolean {
  return operations.some(
    (operation) =>
      operation.type === 'add_status' &&
      operation.status === 'breakthrough_focus',
  );
}

export function getBreakthroughFocusPillLabel(
  spec: Pick<PillSpec, 'family' | 'operations' | 'alchemyMeta'>,
): string | null {
  if (
    spec.family !== 'breakthrough' ||
    !hasBreakthroughFocusEffect(spec.operations)
  ) {
    return null;
  }

  return (
    spec.alchemyMeta.breakthroughLabel ??
    (spec.alchemyMeta.breakthroughTargetRealm
      ? getBreakthroughPillLabel(spec.alchemyMeta.breakthroughTargetRealm)
      : null)
  );
}

export function isBreakthroughConsumableForRealm(
  consumable: Pick<Consumable, 'spec'>,
  targetRealm: RealmType,
): boolean {
  if (
    consumable.spec.kind !== 'pill' ||
    consumable.spec.family !== 'breakthrough'
  ) {
    return false;
  }

  const pillRealm = consumable.spec.alchemyMeta.breakthroughTargetRealm;
  return pillRealm ? pillRealm === targetRealm : true;
}

import {
  BODY_CULTIVATION_REALM_ORDER,
  BODY_CULTIVATION_REALM_REQUIREMENTS,
  BODY_CULTIVATION_TRACK_KEYS,
  type BodyCultivationRealmRequirement,
  createEmptyProgressTrack,
  isCultivationRealmAtLeast,
} from '@shared/lib/bodyCultivation/config';
import type {
  BodyCultivationRealm,
  BodyCultivationTrackKey,
} from '@shared/types/condition';
import { REALM_ORDER, type EnemyClan } from '@shared/types/constants';
import type {
  BodyCultivationTrackLevels,
  EnemyBodyCultivationPlan,
  NormalizedEnemyGenerationInput,
} from './types';
import { hashText } from './utils';

type BodyTrackWeights = Record<BodyCultivationTrackKey, number>;

export const ENEMY_BODY_CULTIVATION_TRACK_WEIGHTS: Record<
  EnemyClan,
  BodyTrackWeights
> = {
  腌物: {
    skin: 1.18,
    sinew_bone: 1.2,
    organs: 0.9,
    qi_blood: 1.1,
    primordial_spirit: 0.8,
  },
  遗种: {
    skin: 1.05,
    sinew_bone: 1.0,
    organs: 1.22,
    qi_blood: 0.95,
    primordial_spirit: 1.25,
  },
  投影: {
    skin: 0.85,
    sinew_bone: 0.72,
    organs: 1.12,
    qi_blood: 0.82,
    primordial_spirit: 1.4,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createEmptyTrackLevels(): BodyCultivationTrackLevels {
  return {
    skin: 0,
    sinew_bone: 0,
    organs: 0,
    qi_blood: 0,
    primordial_spirit: 0,
  };
}

function sumTrackLevels(levels: BodyCultivationTrackLevels): number {
  return BODY_CULTIVATION_TRACK_KEYS.reduce(
    (sum, key) => sum + levels[key],
    0,
  );
}

function sortTracksByClanPreference(
  clan: EnemyClan,
  variantKey: string,
): BodyCultivationTrackKey[] {
  const weights = ENEMY_BODY_CULTIVATION_TRACK_WEIGHTS[clan];
  return [...BODY_CULTIVATION_TRACK_KEYS].sort((left, right) => {
    const weightDiff = weights[right] - weights[left];
    if (weightDiff !== 0) return weightDiff;
    return (
      hashText(`${variantKey}:body:${left}`) -
      hashText(`${variantKey}:body:${right}`)
    );
  });
}

function pickNextTrack(
  levels: BodyCultivationTrackLevels,
  clan: EnemyClan,
  variantKey: string,
): BodyCultivationTrackKey {
  const weights = ENEMY_BODY_CULTIVATION_TRACK_WEIGHTS[clan];
  return [...BODY_CULTIVATION_TRACK_KEYS].sort((left, right) => {
    const leftScore = levels[left] / weights[left];
    const rightScore = levels[right] / weights[right];
    if (leftScore !== rightScore) return leftScore - rightScore;

    const weightDiff = weights[right] - weights[left];
    if (weightDiff !== 0) return weightDiff;

    return (
      hashText(`${variantKey}:body:${left}`) -
      hashText(`${variantKey}:body:${right}`)
    );
  })[0];
}

function resolveTotalLevel(input: NormalizedEnemyGenerationInput): number {
  return clamp(
    Math.floor(
      Math.max(0, input.difficulty - 20) * 0.45 +
        (REALM_ORDER[input.realm] ?? 0) * 8 +
        (input.isBoss ? 10 : 0),
    ),
    0,
    220,
  );
}

function resolveBodyRealm(
  input: NormalizedEnemyGenerationInput,
  totalLevel: number,
): BodyCultivationRealm {
  let selected: BodyCultivationRealm = 'mortal_body';

  for (const realm of BODY_CULTIVATION_REALM_ORDER) {
    const requirement = BODY_CULTIVATION_REALM_REQUIREMENTS[realm];
    if (
      totalLevel >= requirement.totalLevel &&
      isCultivationRealmAtLeast(input.realm, requirement.minCultivationRealm)
    ) {
      selected = realm;
    }
  }

  return selected;
}

function applyRealmRequirements(
  levels: BodyCultivationTrackLevels,
  clan: EnemyClan,
  variantKey: string,
  realm: BodyCultivationRealm,
): void {
  const requirement = BODY_CULTIVATION_REALM_REQUIREMENTS[
    realm
  ] as BodyCultivationRealmRequirement;

  if (requirement.minAllTracksLevel) {
    for (const track of BODY_CULTIVATION_TRACK_KEYS) {
      levels[track] = Math.max(levels[track], requirement.minAllTracksLevel);
    }
  }

  for (const [track, level] of Object.entries(
    requirement.requiredTrackLevels ?? {},
  ) as Array<[BodyCultivationTrackKey, number]>) {
    levels[track] = Math.max(levels[track], level);
  }

  if (requirement.requiredAnyTracks) {
    const preferredTracks = sortTracksByClanPreference(clan, variantKey).slice(
      0,
      requirement.requiredAnyTracks.count,
    );
    for (const track of preferredTracks) {
      levels[track] = Math.max(
        levels[track],
        requirement.requiredAnyTracks.minLevel,
      );
    }
  }
}

export class EnemyBodyCultivationPlanner {
  plan(args: {
    input: NormalizedEnemyGenerationInput;
    variantKey: string;
  }): EnemyBodyCultivationPlan {
    const { input, variantKey } = args;
    const totalLevel = resolveTotalLevel(input);
    const realm = resolveBodyRealm(input, totalLevel);
    const trackLevels = createEmptyTrackLevels();

    applyRealmRequirements(trackLevels, input.clan, variantKey, realm);

    while (sumTrackLevels(trackLevels) < totalLevel) {
      const track = pickNextTrack(trackLevels, input.clan, variantKey);
      trackLevels[track] += 1;
    }

    const focusTracks = [...BODY_CULTIVATION_TRACK_KEYS]
      .filter((track) => trackLevels[track] > 0)
      .sort((left, right) => {
        const levelDiff = trackLevels[right] - trackLevels[left];
        if (levelDiff !== 0) return levelDiff;
        return sortTracksByClanPreference(input.clan, variantKey).indexOf(left) -
          sortTracksByClanPreference(input.clan, variantKey).indexOf(right);
      })
      .slice(0, 3);

    return {
      state: {
        version: 1,
        realm,
        tracks: {
          skin: { ...createEmptyProgressTrack(), level: trackLevels.skin },
          sinew_bone: {
            ...createEmptyProgressTrack(),
            level: trackLevels.sinew_bone,
          },
          organs: { ...createEmptyProgressTrack(), level: trackLevels.organs },
          qi_blood: {
            ...createEmptyProgressTrack(),
            level: trackLevels.qi_blood,
          },
          primordial_spirit: {
            ...createEmptyProgressTrack(),
            level: trackLevels.primordial_spirit,
          },
        },
        milestones: {},
      },
      summary: {
        realm,
        totalLevel: sumTrackLevels(trackLevels),
        focusTracks,
        trackLevels,
      },
    };
  }
}

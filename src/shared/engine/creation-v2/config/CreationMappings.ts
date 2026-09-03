import { ElementType } from '@shared/types/constants';
import { CreationTags } from '@shared/engine/shared/tag-domain';

export const ELEMENT_TAG_TOKENS: Record<ElementType, string> = {
  烛: 'Metal',
  尸: 'Wood',
  星: 'Water',
  渊: 'Fire',
  梦: 'Earth',
  噬: 'Wind',
  帘: 'Thunder',
  疫: 'Ice',
};

export const ELEMENT_TO_MATERIAL_TAG: Record<ElementType, string> = Object.fromEntries(
  Object.entries(ELEMENT_TAG_TOKENS).map(([element, token]) => [
    element,
    `${CreationTags.MATERIAL.ELEMENT}.${token}`,
  ]),
) as Record<ElementType, string>;

export const ELEMENT_NAME_PREFIX: Record<ElementType, string> = {
  烛: '碎锋',
  尸: '青木',
  星: '流泉',
  渊: '焚岳',
  梦: '镇岳',
  噬: '岚影',
  帘: '惊霆',
  疫: '玄冰',
};
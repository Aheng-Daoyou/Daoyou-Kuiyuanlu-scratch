import { describe, expect, it } from 'vitest';
import {
  buildSanityResource,
  getSanityMaxByRealm,
  SANITY_RESOURCE_ID,
  SANITY_RESOURCE_NAME,
} from './sanity';

describe('神智资源定义（神智轴）', () => {
  it('境界驱动神智上限：力量↑则理智↓', () => {
    expect(getSanityMaxByRealm('闻腥')).toBe(100);
    expect(getSanityMaxByRealm('守灯')).toBe(95);
    expect(getSanityMaxByRealm('窥渊')).toBe(90);
    expect(getSanityMaxByRealm('蚀体')).toBe(85);
    expect(getSanityMaxByRealm('忘川')).toBe(80);
    expect(getSanityMaxByRealm('执灯')).toBe(75);
    expect(getSanityMaxByRealm('掌灯')).toBe(70);
    expect(getSanityMaxByRealm('近神')).toBe(65);
    expect(getSanityMaxByRealm('渡渊')).toBe(60);
  });

  it('开战满神智（initial === max）', () => {
    const def = buildSanityResource('闻腥');
    expect(def.id).toBe(SANITY_RESOURCE_ID);
    expect(def.name).toBe(SANITY_RESOURCE_NAME);
    expect(def.initial).toBe(100);
    expect(def.max).toBe(100);
  });

  it('神智资源 id 全局唯一', () => {
    expect(SANITY_RESOURCE_ID).toBe('core.sanity');
  });
});

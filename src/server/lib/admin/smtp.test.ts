import { describe, expect, it } from 'vitest';
import { isReservedEmailForTest } from './smtp';

describe('smtp 保留域拦截', () => {
  it('拦截 IANA 文档示例域 example.com / example.org / example.net', () => {
    expect(isReservedEmailForTest('user@example.com')).toBe(true);
    expect(isReservedEmailForTest('kuiyuan.dg.123@example.com')).toBe(true);
    expect(isReservedEmailForTest('user@example.org')).toBe(true);
    expect(isReservedEmailForTest('user@example.net')).toBe(true);
  });

  it('拦截 RFC 2606 保留域 .test / .example / .invalid / localhost', () => {
    expect(isReservedEmailForTest('user@foo.example')).toBe(true);
    expect(isReservedEmailForTest('user@foo.test')).toBe(true);
    expect(isReservedEmailForTest('user@foo.invalid')).toBe(true);
    expect(isReservedEmailForTest('a@localhost')).toBe(true);
    expect(isReservedEmailForTest('b@invalid')).toBe(true);
  });

  it('不拦截真实可投递域名', () => {
    expect(isReservedEmailForTest('user@qq.com')).toBe(false);
    expect(isReservedEmailForTest('user@gmail.com')).toBe(false);
    expect(isReservedEmailForTest('2773705092@qq.com')).toBe(false);
  });

  it('不误伤 example.com 的第三方子域', () => {
    // foo.example.com 不在保留范围内，是可注册的第三方域名，不应拦截
    expect(isReservedEmailForTest('user@foo.example.com')).toBe(false);
  });

  it('处理畸形输入', () => {
    expect(isReservedEmailForTest('no-at-sign')).toBe(false);
    expect(isReservedEmailForTest('')).toBe(false);
  });
});

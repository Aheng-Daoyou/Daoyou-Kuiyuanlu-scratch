import { describe, expect, it } from 'vitest';
import {
  generateInvitationCode,
  isValidInvitationCodeFormat,
  normalizeInvitationCode,
} from './code';

describe('invitation/code', () => {
  describe('normalizeInvitationCode', () => {
    it('去除首尾空白并转大写', () => {
      expect(normalizeInvitationCode('  abcd-efgh  ')).toBe('ABCD-EFGH');
      expect(normalizeInvitationCode('abcd-efgh')).toBe('ABCD-EFGH');
    });

    it('空输入返回空字符串', () => {
      expect(normalizeInvitationCode('')).toBe('');
      expect(normalizeInvitationCode('   ')).toBe('');
    });
  });

  describe('isValidInvitationCodeFormat', () => {
    it('接受 4-4 大写字母数字格式', () => {
      expect(isValidInvitationCodeFormat('ABCD-EFGH')).toBe(true);
      expect(isValidInvitationCodeFormat('A2B4-C6D8')).toBe(true);
    });

    it('拒绝非法格式', () => {
      expect(isValidInvitationCodeFormat('ABC')).toBe(false);
      expect(isValidInvitationCodeFormat('ABCDEFGH')).toBe(false);
      expect(isValidInvitationCodeFormat('ABCD-EFG!')).toBe(false);
      expect(isValidInvitationCodeFormat('abcd-efgh')).toBe(false);
      expect(isValidInvitationCodeFormat('ABCD-EFGH-1234')).toBe(false);
      expect(isValidInvitationCodeFormat('')).toBe(false);
    });
  });

  describe('generateInvitationCode', () => {
    it('生成符合格式的灯引码', () => {
      for (let i = 0; i < 50; i += 1) {
        const code = generateInvitationCode();
        expect(isValidInvitationCodeFormat(code)).toBe(true);
      }
    });

    it('多次生成结果大概率不同（字符集足够）', () => {
      const codes = new Set(
        Array.from({ length: 20 }, () => generateInvitationCode()),
      );
      expect(codes.size).toBeGreaterThan(15);
    });
  });
});

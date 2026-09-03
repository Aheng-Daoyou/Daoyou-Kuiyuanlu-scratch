// 灯引码工具：邀请制注册门槛的「灯引」令牌。
// 纯展示层工具，不涉及引擎判别值改动。格式：4-4 位大写字母数字，中间带连字符。
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DEFAULT_GROUP = 4;
const DEFAULT_GROUPS = 2;

export function normalizeInvitationCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidInvitationCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

function randomBlock(length: number): string {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * CODE_CHARSET.length);
    result += CODE_CHARSET[index];
  }
  return result;
}

export function generateInvitationCode(): string {
  const blocks: string[] = [];
  for (let g = 0; g < DEFAULT_GROUPS; g += 1) {
    blocks.push(randomBlock(DEFAULT_GROUP));
  }
  return blocks.join('-');
}

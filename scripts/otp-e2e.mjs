// 端到端验证：OTP 登录 → /api/player/resources
// 用法: node otp-e2e.mjs <验证码>
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

const BASE = 'http://localhost:3000';
const EMAIL = '2773705092@qq.com';
const OTP = process.argv[2];

async function solveCaptcha(action) {
  const res = await fetch(`${BASE}/api/captcha/challenge?action=${action}`);
  const challenge = await res.json();
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 60_000 });
  if (!solution) throw new Error('PoW 求解失败');
  return Buffer.from(JSON.stringify({ challenge, solution }), 'utf8').toString('base64');
}

async function main() {
  if (!OTP) {
    // 步骤1: 请求发送验证码
    const payload = await solveCaptcha('email-otp');
    const r = await fetch(`${BASE}/api/auth/email-otp/send-verification-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'x-altcha-payload': payload,
      },
      body: JSON.stringify({ email: EMAIL, type: 'sign-in' }),
    });
    console.log('发送OTP:', r.status, await r.text());
    console.log('→ 查看 daoyou/.dev-mail/latest.html 获取验证码，然后: node scripts/otp-e2e.mjs <验证码>');
    return;
  }

  // 步骤2: 用验证码登录
  const login = await fetch(`${BASE}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Referer: 'http://localhost:5173/',
    },
    body: JSON.stringify({ email: EMAIL, otp: OTP.trim() }),
  });
  const loginText = await login.text();
  console.log('登录:', login.status, loginText.slice(0, 200));
  if (login.status !== 200) process.exit(1);

  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  // 步骤3: 调用 resources（之前 500 的接口）
  const keys =
    'session,profile,condition,progress,currency,loadout,mail-summary,task-summary';
  const res = await fetch(`${BASE}/api/player/resources?keys=${keys}`, {
    headers: { Cookie: cookie, Origin: 'http://localhost:5173' },
  });
  const text = await res.text();
  console.log('resources:', res.status, text.slice(0, 400));
}

main().catch((e) => {
  console.error('E2E 失败:', e);
  process.exit(1);
});

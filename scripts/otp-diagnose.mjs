// 临时诊断脚本：求解 ALTCHA PoW 并触发 OTP 发送，验证落库情况（v2 API）
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

const BASE = 'http://localhost:3000';
const EMAIL = '2773705092@qq.com';

async function main() {
  // 1. 获取挑战
  const res = await fetch(`${BASE}/api/captcha/challenge?action=email-otp`);
  const challenge = await res.json();
  console.log('[1] 挑战获取成功, cost =', challenge.parameters.cost);

  // 2. 求解 PoW
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 60_000 });
  if (!solution) throw new Error('PoW 求解失败');
  console.log('[2] PoW 已求解, counter =', solution.counter);

  // 3. 构造 payload（base64(JSON({challenge, solution}))）
  const payload = Buffer.from(
    JSON.stringify({ challenge, solution }),
    'utf8',
  ).toString('base64');

  const otpRes = await fetch(`${BASE}/api/auth/email-otp/send-verification-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      'x-altcha-payload': payload,
    },
    body: JSON.stringify({ email: EMAIL, type: 'sign-in' }),
  });
  const otpText = await otpRes.text();
  console.log('[3] 发送 OTP HTTP', otpRes.status, otpText.slice(0, 300));
}

main().catch((e) => {
  console.error('诊断失败:', e);
  process.exit(1);
});

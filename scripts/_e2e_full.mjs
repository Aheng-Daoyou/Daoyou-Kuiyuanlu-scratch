// 完整端到端：注册 → 创建角色 → 进入游戏 → 外出历练（诡案副本）
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { Client } from 'pg';

const BASE = 'http://localhost:3000';
const ORIGIN = 'http://localhost:5173';
const db = new Client({ connectionString: 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou' });

async function solveCaptcha(action) {
  const res = await fetch(`${BASE}/api/captcha/challenge?action=${action}`);
  const challenge = await res.json();
  const solution = await solveChallenge({ challenge, deriveKey, timeout: 90_000 });
  if (!solution) throw new Error('PoW 求解失败');
  return Buffer.from(JSON.stringify({ challenge, solution }), 'utf8').toString('base64');
}

async function api(path, { method = 'POST', body, headers = {}, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/', ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, headers: res.headers };
}

async function main() {
  await db.connect();
  const stamp = Date.now();
  // 使用 RFC 2606 保留域 example.com：better-auth 要求带 TLD 才能通过邮箱格式校验，
  // 且后端会对保留域拦截外发（落到 .dev-mail 兜底），不再触发真实 SMTP 退信；
  // OTP 仍会写入 verification 表供脚本读取。
  const email = `kuiyuan.dg.${stamp}@example.com`;
  const name = `巡灯人${stamp % 1000}`;
  console.log('════ 窥渊录 完整端到端验证 ════');
  console.log('邮箱:', email, '| 昵称:', name, '\n');

  // ===== 1. 注册 =====
  console.log('【1】邮箱验证码注册...');
  const otpPayload = await solveCaptcha('email-otp');
  const send = await api('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in', altcha: otpPayload } });
  if (send.status !== 200) throw new Error('发送验证码失败: ' + send.text.slice(0, 150));
  await new Promise((r) => setTimeout(r, 1200));
  const otpRow = await db.query(`SELECT value FROM better_auth."verification" WHERE identifier=$1 ORDER BY "createdAt" DESC LIMIT 1`, [`sign-in-otp-${email}`]);
  const otp = otpRow.rows[0].value.split(':')[0];
  const login = await api('/api/auth/sign-in/email-otp', { body: { email, otp, name } });
  if (login.status !== 200) throw new Error('OTP 登录失败');
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const userId = login.json.user.id;
  console.log('  ✓ 注册+登录成功, user:', userId);

  // ===== 2. 创建角色 =====
  console.log('\n【2】创建角色...');
  const gen = await api('/api/generate-character', { body: { userInput: '一名在烬洲灯影地长大的守灯修士，擅长以香辨路，性子寡言。' }, cookie });
  if (gen.status !== 200 || !gen.json?.success) throw new Error('生成角色失败');
  const tempId = gen.json.data.tempCultivatorId;
  const cultName = gen.json.data.cultivator.name;
  const cultRealm = gen.json.data.cultivator.realm;
  console.log('  ✓ AI 生成角色:', cultName, '| 境界:', cultRealm, '| tempId:', tempId);

  const fates = await api('/api/generate-fates', { body: { tempId }, cookie });
  if (fates.status !== 200 || !fates.json?.success) throw new Error('生成气运失败');
  const fateNames = fates.json.data.fates.slice(0, 3).map((f) => f.name || f.title).join('、');
  console.log('  ✓ 生成气运:', fateNames);

  const save = await api('/api/save-character', { body: { tempCultivatorId: tempId, selectedFateIndices: [0, 1, 2] }, cookie });
  if (save.status !== 200) throw new Error('保存角色失败: ' + save.text.slice(0, 200));
  console.log('  ✓ 角色已保存（cultivator.created 事件）');

  const cult = await db.query(`SELECT id FROM wanjiedaoyou_cultivators WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [userId]);
  const cultivatorId = cult.rows[0].id;
  console.log('  ✓ 数据库确认角色:', cultivatorId);

  // ===== 3. 进入游戏（resources 有角色后） =====
  console.log('\n【3】进入游戏（读取资源快照）...');
  const res = await api('/api/player/resources?keys=session,profile,progress,currency', { method: 'GET', cookie });
  console.log('  status:', res.status);
  if (res.status === 200) {
    console.log('  ✓ 游戏主界面资源可用');
    console.log('  角色:', res.json.data.profile?.cultivator?.name);
    console.log('  境界:', res.json.data.progress?.realm);
    console.log('  灯油券:', res.json.data.currency?.spiritStones);
    console.log('  灵石→灯油券映射: spiritStones 字段');
  } else {
    console.log('  response:', res.text.slice(0, 200));
  }

  // ===== 4. 外出历练（诡案副本） =====
  console.log('\n【4】外出历练（诡案副本）...');
  console.log('  目标: SAT_TN_03 灰巷·废弃草圃 (easy)');
  const start = await api('/api/dungeon/start', { body: { mapNodeId: 'SAT_TN_03' }, cookie });
  console.log('  dungeon/start status:', start.status);
  console.log('  response:', JSON.stringify(start.json)?.slice(0, 500));
  if (start.status !== 200) {
    console.log('\n  ⚠️ 副本开启返回非 200，尝试读取 readiness...');
    console.log('  ', JSON.stringify(start.json));
  } else {
    console.log('  ✓ 副本已开启');
  }

  // 查询副本状态
  const state = await api('/api/dungeon/state', { method: 'GET', cookie });
  console.log('\n  dungeon/state status:', state.status);
  console.log('  副本状态:', JSON.stringify(state.json?.state)?.slice(0, 400));

  // ===== 5. 副本内执行探索动作 =====
  console.log('\n【5】副本内执行探索动作...');
  const options = state.json?.state?.currentOptions;
  if (options?.length) {
    const choiceId = options[0].id;
    console.log('  选择选项:', choiceId, '|', options[0].text?.slice(0, 30));
    const action = await api('/api/dungeon/action', { body: { choiceId }, cookie });
    console.log('  dungeon/action status:', action.status);
    console.log('  response:', JSON.stringify(action.json)?.slice(0, 400));
    if (action.status === 200) {
      console.log('  ✓ 副本探索动作成功');
    }
  } else {
    console.log('  ⚠️ 无可用选项，跳过动作测试');
  }

  await db.end();
  console.log('\n════ 端到端验证完成 ════');
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});

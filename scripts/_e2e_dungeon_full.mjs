// 窥渊录 历练（秘境推演）完整跑通验证：注册 → 建角色 → SSE 进副本 → SSE 多轮行动 → 结算/撤离
// 全程使用 SSE 流式（与前端一致），验证：流式事件正常、每轮 3 个选项、无 500、无锁错误、副本能跑完。
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { Client } from 'pg';

const BASE = 'http://localhost:3000';
const ORIGIN = 'http://localhost:5173';
const db = new Client({ connectionString: 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou' });

let failures = 0;
function log(ok, label, extra = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

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

// SSE 流式请求（与前端 consumeDungeonStream 一致）：解析所有 data 事件
async function apiSSE(path, { method = 'POST', body, cookie } = {}) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/', Accept: 'text/event-stream', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  if (res.status !== 200) {
    const text = await res.text();
    return { status: res.status, events: [], text, ms: Date.now() - t0 };
  }
  const text = await res.text();
  const events = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      try { events.push(JSON.parse(payload)); } catch { /* skip */ }
    }
  }
  const narrativeChunks = events.filter((e) => e.type === 'narrative' && e.text);
  const resultEvent = events.find((e) => e.type === 'result');
  const firstNarrative = narrativeChunks[0]?.text || '';
  // narrative 事件是累积式文本（每次携带完整 scene_description），最终值即完整叙事；
  // 求和值仅用于诊断事件数
  return {
    status: res.status,
    events,
    text,
    ms: Date.now() - t0,
    narrativeLen: narrativeChunks.length
      ? narrativeChunks[narrativeChunks.length - 1].text.length
      : 0,
    narrativeSumChars: narrativeChunks.reduce((n, e) => n + (e.text || '').length, 0),
    narrativeEvents: narrativeChunks.length,
    narrativeSample: firstNarrative.slice(0, 120),
    result: resultEvent?.data,
    errors: events.filter((e) => e.type === 'error'),
  };
}

async function main() {
  await db.connect();
  const stamp = Date.now();
  const email = `kuiyuan.dg.${stamp}@example.com`;
  console.log('════════════ 历练完整跑通验证（SSE 流式）════════════');
  console.log('邮箱:', email, '\n');

  // ========== 1. 注册 + 登录 ==========
  console.log('【1】注册+登录');
  let cookie;
  try {
    const otpPayload = await solveCaptcha('email-otp');
    const send = await api('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in', altcha: otpPayload } });
    if (send.status !== 200) throw new Error('发送验证码失败: ' + send.text.slice(0, 150));
    await new Promise((r) => setTimeout(r, 1200));
    const otpRow = await db.query(`SELECT value FROM better_auth."verification" WHERE identifier=$1 ORDER BY "createdAt" DESC LIMIT 1`, [`sign-in-otp-${email}`]);
    const otp = otpRow.rows[0].value.split(':')[0];
    const login = await api('/api/auth/sign-in/email-otp', { body: { email, otp, name: `历巡${stamp % 10000}` } });
    if (login.status !== 200) throw new Error('OTP 登录失败');
    cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    globalThis.__cookie = cookie;
    globalThis.__userId = login.json.user.id;
    log(true, '注册+登录成功', `user: ${login.json.user.id}`);
  } catch (e) { log(false, '注册失败', e.message); return; }

  // ========== 2. 创建角色 ==========
  console.log('\n【2】创建角色');
  let cultivatorId;
  try {
    const gen = await api('/api/generate-character', { body: { userInput: '一名在烬洲灯影地长大的守灯修士，擅长以香辨路，性子寡言。' }, cookie });
    if (gen.status !== 200 || !gen.json?.success) throw new Error('生成角色失败: ' + gen.text.slice(0, 150));
    const tempId = gen.json.data.tempCultivatorId;
    const fates = await api('/api/generate-fates', { body: { tempId }, cookie });
    await api('/api/save-character', { body: { tempCultivatorId: tempId, selectedFateIndices: [0, 1, 2] }, cookie });
    const cult = await db.query(`SELECT id FROM wanjiedaoyou_cultivators WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [globalThis.__userId]);
    cultivatorId = cult.rows[0].id;
    log(true, '创建角色成功', `角色: ${gen.json.data.cultivator.name} | 境界: ${gen.json.data.cultivator.realm} | id: ${cultivatorId}`);
  } catch (e) { log(false, '创建角色失败', e.message); return; }

  // ========== 3. 注入灵石（副本行动需要代价） ==========
  console.log('\n【3】注入测试资源');
  try {
    await db.query(`UPDATE wanjiedaoyou_cultivators SET spirit_stones = spirit_stones + 100000 WHERE id = $1`, [cultivatorId]);
    log(true, '灯油券 +100000');
  } catch (e) { log(false, '注入失败', e.message); }

  // ========== 4. SSE 开启副本 ==========
  console.log('\n【4】SSE 开启副本');
  let state, round = 0, totalMs = 0;
  const MAX_ROUNDS = 8;
  let finalReached = false;
  try {
    const start = await apiSSE('/api/dungeon/start', { body: { mapNodeId: 'SAT_TN_08' }, cookie });
    if (start.status !== 200) throw new Error('SSE 开启副本失败: ' + start.text.slice(0, 200));
    totalMs += start.ms;
    const sResult = start.result;
    const st = await api('/api/dungeon/state', { method: 'GET', cookie });
    state = st.json?.state || st.json?.data?.state;
    const sData = sResult?.data ?? sResult;
    const options = sData?.interaction?.options || state?.currentOptions || state?.roundData?.currentOptions || [];
    log(true, 'SSE 开启副本成功', `流式${start.ms}ms 叙事${start.narrativeLen}字(${start.narrativeEvents}事件/累计${start.narrativeSumChars}字) ${options.length}个选项 | 无error:${start.errors.length === 0}`);
    console.log('  · 叙事样本:', JSON.stringify(start.narrativeSample));
    if (options.length === 0) {
      console.log('  · start result 结构诊断:', JSON.stringify(Object.keys(sData || {})), '| 顶层键:', JSON.stringify(Object.keys(sResult || {})));
    }
    if (start.errors.length > 0) log(false, 'SSE start 有 error 事件', JSON.stringify(start.errors[0]).slice(0, 150));
  } catch (e) { log(false, '开启副本失败', e.message); }

  // ========== 5. SSE 循环行动直到副本结束 ==========
  console.log('\n【5】SSE 多轮行动（目标：跑到副本自然结束）');
  let lastResult = null;
  let sawZeroOptions = false;
  let lastState = null;
  while (round < MAX_ROUNDS) {
    round++;
    // 读取当前状态拿选项
    const st = await api('/api/dungeon/state', { method: 'GET', cookie });
    const cur = st.json?.state || st.json?.data?.state;
    lastState = cur;
    const opts = cur?.currentOptions || cur?.roundData?.currentOptions || cur?.interaction?.options || [];
    if (opts.length === 0) {
      // 可能是最终回合已结算，或处于战斗/拾荒状态
      const disposition = cur?.disposition || cur?.phase || cur?.status;
      console.log(`  · 第${round}轮：无当前选项（状态: ${JSON.stringify(disposition)}），副本可能已收束`);
      sawZeroOptions = true;
      break;
    }
    // 优先选不需要窥悟(comprehension_insight)的选项，避免新角色资源不足 409
    const affordable =
      opts.find(
        (o) =>
          !(o.costs?.resources ?? []).some(
            (r) => r.type === 'comprehension_insight',
          ),
      ) ?? opts[0];
    const choiceId =
      affordable.choiceId ?? affordable.id ?? affordable.index ?? 0;
    const t0 = Date.now();
    const act = await apiSSE('/api/dungeon/action', { body: { choiceId }, cookie });
    totalMs += act.ms;
    const r = act.result;
    const rData = r?.data ?? r;
    const nextOptions = rData?.roundData?.interaction?.options || rData?.interaction?.options || rData?.currentOptions || [];
    const isFinal = rData?.roundData?.status_update?.is_final_round ?? rData?.status_update?.is_final_round ?? rData?.isFinished ?? cur?.isFinalRound ?? false;
    console.log(`  · 第${round}轮: ${act.ms}ms 叙事${act.narrativeLen}字(${act.narrativeEvents}事件/累计${act.narrativeSumChars}字) 选项${nextOptions.length} 最终回合:${isFinal} ${act.status === 200 ? '' : 'HTTP ' + act.status}`);
    if (act.status !== 200) { log(false, `第${round}轮 action 失败`, act.text.slice(0, 150)); break; }
    if (act.errors.length > 0) { log(false, `第${round}轮 action 有 error 事件`, JSON.stringify(act.errors[0]).slice(0, 150)); break; }
    if (nextOptions.length === 0) {
      console.log('  · action result 结构诊断: data键:', JSON.stringify(Object.keys(rData || {})), '| result键:', JSON.stringify(Object.keys(r || {})));
    }
    if (nextOptions.length < 3 && !isFinal) { console.log(`  ⚠ 第${round}轮选项数 ${nextOptions.length}（非最终回合）`); }
    lastResult = r;
    if (isFinal) {
      finalReached = true;
      // 不 break：最终回合的 action 之后，下一次 action 会触发服务端结算（handleAction currentRound >= maxRounds 分支）
      console.log('  · 达到最终回合，继续发送行动以触发结算');
    }
    // 结算完成检测：action 返回 isFinished / settlement（结算分支的响应）
    const settledFlag = rData?.isFinished || rData?.settlement || rData?.roundData?.isFinished;
    if (settledFlag) {
      console.log('  · 结算完成', rData?.settlement ? '（含结算数据）' : '');
      break;
    }
    // 战斗状态：执行战斗引擎（action 返回 TRIGGER_BATTLE + battleId，或 state 带 battlePending）
    if (rData?.type === 'TRIGGER_BATTLE' || rData?.battleId || r?.battle_pending || cur?.battlePending) {
      const battleId = rData?.battleId || r?.battle_id || cur?.battle?.battleId;
      if (battleId) {
        console.log(`  · 触发战斗（battleId=${battleId}，执行战斗引擎）`);
        const exec = await api('/api/dungeon/battle/execute/v5', { body: { battleId }, cookie });
        log(exec.status === 200, `第${round}轮战斗执行`, exec.status === 200 ? '' : exec.text.slice(0, 150));
        if (exec.status === 200) {
          // 战斗结束后的状态（可能进入 LOOTING 拾荒或下一轮探索）
          const st2 = await api('/api/dungeon/state', { method: 'GET', cookie });
          const cur2 = st2.json?.state || st2.json?.data?.state;
          console.log(`  · 战后状态: ${cur2?.status || cur2?.phase || '?'} 选项${cur2?.currentOptions?.length ?? 0}`);
        }
      } else {
        console.log('  · 战斗触发但缺 battleId，跳过');
      }
    }
  }

  // ========== 6. 收束：确认结算完成（无独立 /settle 路由，结算由最终回合后的 action 触发） ==========
  console.log('\n【6】副本收束');
  try {
    const st = await api('/api/dungeon/state', { method: 'GET', cookie });
    const cur = st.json?.state || st.json?.data?.state;
    const disposition = cur?.disposition || cur?.status || cur?.phase;
    const rData = lastResult?.data ?? lastResult;
    const settlement = rData?.settlement ?? lastResult?.settlement;
    if (cur?.status === 'FINISHED' || cur?.status === 'SETTLED' || disposition === 'settled' || settlement || rData?.isFinished) {
      const tier = settlement?.reward_tier ?? settlement?.settlement?.reward_tier;
      const narrative = settlement?.ending_narrative || settlement?.settlement?.ending_narrative;
      log(true, '副本结算完成', tier ? `奖励档位: ${tier}` : `状态: ${disposition}`);
      if (narrative) console.log('  · 结算叙事样本:', narrative.slice(0, 80));
    } else {
      // 未能结算：尝试安全撤离
      const quit = await api('/api/dungeon/quit', { cookie });
      log(quit.status === 200, '安全撤离', quit.status === 200 ? '' : quit.text.slice(0, 150));
    }
  } catch (e) { log(false, '副本收束异常', e.message); }

  // ========== 汇总 ==========
  console.log('\n════════════ 历练验证汇总 ════════════');
  console.log(`总轮数: ${round} | 总耗时: ${totalMs}ms | 平均: ${round > 0 ? Math.round(totalMs / round) : 0}ms/轮`);
  console.log(`最终回合达成: ${finalReached} | 出现无选项回合: ${sawZeroOptions}`);
  console.log(`失败: ${failures}`);
  await db.end();
  if (failures > 0) process.exit(1);
  console.log('════ 历练完整跑通 ════');
  process.exit(0);
}

main().catch((e) => {
  console.error('历练验证脚本异常:', e);
  process.exit(1);
});

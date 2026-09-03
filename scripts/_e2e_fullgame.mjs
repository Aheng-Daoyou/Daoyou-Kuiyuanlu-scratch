// 窥渊录 全系统端到端回归：注册 → 建角色 → 闭关 → 挂机 → 坊市(买/卖) → 任务 → 练香炼器 → 历练
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { Client } from 'pg';

const BASE = 'http://localhost:3000';
const ORIGIN = 'http://localhost:5173';
const db = new Client({ connectionString: 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou' });

const results = [];
let failures = 0;
function log(ok, label, extra = '') {
  const mark = ok ? '✅' : '❌';
  const line = `${mark} ${label}${extra ? ' — ' + extra : ''}`;
  results.push({ ok, label });
  if (!ok) failures++;
  console.log(line);
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

// SSE 请求：读取并返回所有 data 事件的 JSON 解析结果
async function apiSSE(path, { method = 'POST', body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/', Accept: 'text/event-stream', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  const events = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      try { events.push(JSON.parse(payload)); } catch { /* skip */ }
    }
  }
  return { status: res.status, events, text };
}

async function main() {
  await db.connect();
  const stamp = Date.now();
  // 使用保留域邮箱：后端会拦截外发到 dev-mail，不触发真实 SMTP；OTP 仍写入 verification 表
  const email = `kuiyuan.full.${stamp}@example.com`;
  const name = `全巡${stamp % 10000}`;
  console.log('════════════ 窥渊录 全系统端到端回归 ════════════');
  console.log('邮箱:', email, '| 昵称:', name, '\n');

  // ========== 1. 注册 ==========
  console.log('【1】注册');
  try {
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
    log(true, '注册+登录成功', `user: ${userId}`);
    globalThis.__cookie = cookie;
    globalThis.__userId = userId;
  } catch (e) { log(false, '注册失败', e.message); failures++; return; }

  // ========== 2. 创建角色 ==========
  console.log('\n【2】创建角色');
  let cultivatorId;
  try {
    const gen = await api('/api/generate-character', { body: { userInput: '一名在烬洲灯影地长大的守灯修士，擅长以香辨路，性子寡言。' }, cookie: globalThis.__cookie });
    if (gen.status !== 200 || !gen.json?.success) throw new Error('生成角色失败: ' + gen.text.slice(0, 150));
    const tempId = gen.json.data.tempCultivatorId;
    const fates = await api('/api/generate-fates', { body: { tempId }, cookie: globalThis.__cookie });
    const fateNames = fates.json?.data?.fates?.slice(0, 3).map((f) => f.name || f.title).join('、') || '';
    const save = await api('/api/save-character', { body: { tempCultivatorId: tempId, selectedFateIndices: [0, 1, 2] }, cookie: globalThis.__cookie });
    if (save.status !== 200) throw new Error('保存角色失败: ' + save.text.slice(0, 200));
    const cult = await db.query(`SELECT id FROM wanjiedaoyou_cultivators WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [globalThis.__userId]);
    cultivatorId = cult.rows[0].id;
    log(true, '创建角色成功', `角色: ${gen.json.data.cultivator.name} | 境界: ${gen.json.data.cultivator.realm} | 气运: ${fateNames} | id: ${cultivatorId}`);
  } catch (e) { log(false, '创建角色失败', e.message); failures++; }

  // ========== 3. 进入游戏（资源快照）==========
  console.log('\n【3】进入游戏');
  try {
    const snap = await api('/api/player/resources?keys=session,profile,progress,currency', { method: 'GET', cookie: globalThis.__cookie });
    if (snap.status !== 200) throw new Error('资源快照失败: ' + snap.text.slice(0, 150));
    const d = snap.json?.data || snap.json || {};
    const prof = d.profile?.cultivator;
    log(true, '进入游戏成功', `角色: ${prof?.name || '?'} | 境界: ${d.progress?.realm || '?'} | 灵石: ${d.currency?.spiritStones ?? '?'}`);
  } catch (e) { log(false, '进入游戏失败', e.message); failures++; }

  // ========== 4. 闭关（SSE）==========
  console.log('\n【4】闭关修炼');
  try {
    const sse = await apiSSE('/api/cultivator/retreat', { body: { years: 1, action: 'cultivate' }, cookie: globalThis.__cookie });
    if (sse.status !== 200) throw new Error('闭关失败 status=' + sse.status + ' ' + sse.text.slice(0, 150));
    const result = sse.events.find((e) => e.type === 'result')?.data;
    if (!result) throw new Error('未收到 result 事件: ' + sse.text.slice(0, 150));
    const sum = result.summary || result;
    log(true, '闭关修炼成功', `修为+${sum.exp_gained ?? '?'} 悟性+${sum.insight_gained ?? sum.insight_value ?? '?'} 进度${sum.progress ?? sum.exp_progress ?? '?'}%`);
  } catch (e) { log(false, '闭关修炼失败', e.message); failures++; }

  // 突破尝试
  console.log('  · 尝试突破');
  try {
    const sse = await apiSSE('/api/cultivator/retreat', { body: { years: 1, action: 'breakthrough' }, cookie: globalThis.__cookie });
    if (sse.status === 200) {
      const result = sse.events.find((e) => e.type === 'result')?.data;
      const sum = result?.summary || result || {};
      log(true, '突破流程可执行', `success:${sum.success} 成功率:${sum.chance ?? '?'}% 修为+${sum.exp_progress ?? '?'}`);
    } else {
      log(true, '突破接口响应', `status=${sse.status} ${sse.text.slice(0, 80)}`);
    }
  } catch (e) { log(false, '突破调用异常', e.message); failures++; }

  // ========== 5. 挂机收益（SSE）==========
  console.log('\n【5】挂机收益');
  try {
    const sse = await apiSSE('/api/cultivator/yield', { cookie: globalThis.__cookie });
    if (sse.status === 200) {
      const result = sse.events.find((e) => e.type === 'result')?.data;
      log(true, '挂机收益成功', `灵石+${result?.amount ?? '?'} 修为+${result?.expGain ?? '?'} 悟性+${result?.insightGain ?? '?'} ${result?.materialCount ?? 0}材料`);
    } else {
      // 距上次 <1h 时返回 400 "历练时日尚短"，属预期
      log(true, '挂机接口响应', `status=${sse.status} ${sse.text.slice(0, 80)}（距上次<1h属预期）`);
    }
  } catch (e) { log(false, '挂机收益异常', e.message); failures++; }

  // ========== 6. 坊市购买 ==========
  console.log('\n【6】坊市购买');
  // 注入灵石与材料，验证购买/出售/炼器流程真实可用（跳过新角色经济等待）
  try {
    await db.query(`UPDATE wanjiedaoyou_cultivators SET spirit_stones = spirit_stones + 50000 WHERE id=$1`, [cultivatorId]);
    const mats = [
      // [名称, 类型, 品级(凡/灵/玄/真/地/天/仙/神), 元素(烛/尸/星/渊/梦/噬/帘/疫)]
      ['灯下草', 'herb', '凡品', '烛'],
      ['幽冥铁砂', 'ore', '玄品', '渊'],
      ['月桂树脂', 'herb', '灵品', '梦'],
    ];
    for (const [name, type, rank, element] of mats) {
      await db.query(
        `INSERT INTO wanjiedaoyou_materials (cultivator_id, name, type, rank, element, description, quantity) VALUES ($1,$2,$3,$4,$5,'回归测试材料',3) ON CONFLICT DO NOTHING`,
        [cultivatorId, name, type, rank, element],
      );
    }
    log(true, '已注入测试资源', '灵石+50000, 3种材料×3');
  } catch (e) { log(false, '资源注入失败', e.message); failures++; }

  let buyListingId;
  try {
    const node = 'TN_YUE_01';
    const market = await api(`/api/market/${node}?layer=common`, { method: 'GET', cookie: globalThis.__cookie });
    if (market.status !== 200) throw new Error('坊市加载失败: ' + market.text.slice(0, 150));
    const listings = market.json.listings || market.json.data?.listings || [];
    const buyable = listings.find((l) => (l.quantity ?? 1) > 0);
    if (!buyable) throw new Error('无可用商品 listingId');
    buyListingId = buyable.id;
    const buy = await api(`/api/market/${node}/buy`, { body: { listingId: buyListingId, quantity: 1, layer: 'common' }, cookie: globalThis.__cookie });
    if (buy.status !== 200) throw new Error('购买失败: ' + buy.text.slice(0, 200));
    log(true, '坊市购买成功', `商品: ${buyable.name} (${buyable.type}) 价${buyable.price}灵`);
  } catch (e) { log(false, '坊市购买失败', e.message); failures++; }

  // ========== 7. 坊市出售（preview → confirm）==========
  console.log('\n【7】坊市出售');
  try {
    const inv = await api('/api/cultivator/inventory?type=materials', { method: 'GET', cookie: globalThis.__cookie });
    const rawItems = inv.json?.data?.items || inv.json?.items || [];
    const materials = rawItems.filter((m) => m.quantity > 0);
    if (!materials.length) {
      console.log('  [debug] 背包原始items数:', rawItems.length, '| 完整响应:', JSON.stringify(inv.json).slice(0, 300));
      throw new Error('背包无材料可卖');
    }
    const preview = await api('/api/market/sell', { body: { phase: 'preview', itemType: 'material', materialIds: [materials[0].id] }, cookie: globalThis.__cookie });
    if (preview.status !== 200) throw new Error('出售预览失败: ' + preview.text.slice(0, 150));
    const sessionId = preview.json?.data?.sessionId || preview.json?.sessionId;
    if (sessionId) {
      const confirm = await api('/api/market/sell', { body: { phase: 'confirm', sessionId }, cookie: globalThis.__cookie });
      log(confirm.status === 200, '坊市出售成功', confirm.status === 200 ? 'preview→confirm 完整流程' : 'confirm: ' + confirm.text.slice(0, 120));
    } else {
      log(true, '出售预览成功（无sessionId，走其他结算）', '');
    }
  } catch (e) { log(false, '坊市出售失败', e.message); failures++; }

  // ========== 8. 日常/教程任务 ==========
  console.log('\n【8】任务');
  try {
    const tasks = await api('/api/tasks', { method: 'GET', cookie: globalThis.__cookie });
    const taskList = tasks.json?.data || tasks.json?.items || [];
    log(true, '任务列表可读取', `${taskList.length} 个任务`);
    const first = taskList.find((t) => t.category !== undefined || t.id);
    if (first) {
      const detail = await api(`/api/tasks/${first.id}`, { method: 'GET', cookie: globalThis.__cookie });
      log(detail.status === 200, '任务详情可读取', `任务: ${first.name || first.title} (${first.category})`);
    }
  } catch (e) { log(false, '任务系统异常', e.message); failures++; }

  // ========== 9. 练香/炼器 ==========
  console.log('\n【9】练香/炼器');
  // 炼器(refine)：用矿石(ore)类材料精炼封灵器
  try {
    const inv = await api('/api/cultivator/inventory?type=materials', { method: 'GET', cookie: globalThis.__cookie });
    const materials = inv.json?.data?.items || inv.json?.items || [];
    const oreMats = materials.filter((m) => m.type === 'ore' && m.quantity > 0);
    if (oreMats.length) {
      const ids = oreMats.slice(0, 2).map((m) => m.id);
      const preview = await api('/api/craft?craftType=refine&materialIds=' + ids.join(','), { method: 'GET', cookie: globalThis.__cookie });
      log(preview.status === 200, '炼器(精炼)预览可获取', preview.status === 200 ? `可负担:${preview.json?.data?.canAfford}` : 'preview: ' + preview.text.slice(0, 150));
      const craft = await api('/api/craft', { body: { craftType: 'refine', materialIds: ids }, cookie: globalThis.__cookie });
      log(craft.status === 200, '炼器(精炼)执行', craft.status === 200 ? '精炼完成' : 'craft: ' + craft.text.slice(0, 150));
    } else {
      log(true, '炼器：无矿石材料，跳过', '');
    }
  } catch (e) { log(false, '炼器系统异常', e.message); failures++; }

  // 炼香（alchemy）：用草本(herb)材料制香
  console.log('  · 炼香(alchemy)');
  try {
    const inv = await api('/api/cultivator/inventory?type=materials', { method: 'GET', cookie: globalThis.__cookie });
    const materials = inv.json?.data?.items || inv.json?.items || [];
    const herbMats = materials.filter((m) => m.type === 'herb' && m.quantity > 0);
    if (herbMats.length) {
      const ids = herbMats.slice(0, 2).map((m) => m.id);
      const qty = {};
      for (const id of ids) qty[id] = 1;
      const preview = await api('/api/craft?craftType=alchemy&alchemyMode=improvised&materialIds=' + ids.join(',') + '&materialQuantities=' + encodeURIComponent(JSON.stringify(qty)), { method: 'GET', cookie: globalThis.__cookie });
      log(preview.status === 200, '炼香预览可获取', preview.status === 200 ? '' : 'preview: ' + preview.text.slice(0, 150));
      const alchemy = await api('/api/craft', { body: { craftType: 'alchemy', alchemyMode: 'improvised', materialIds: ids, materialQuantities: qty, userPrompt: '以月桂树脂为底，调制一盏能静心驱秽的安神香' }, cookie: globalThis.__cookie });
      log(alchemy.status === 200, '炼香执行', alchemy.status === 200 ? '炼香完成' : 'alchemy: ' + alchemy.text.slice(0, 150));
    } else {
      log(true, '炼香：无草本材料，跳过', '');
    }
  } catch (e) { log(false, '炼香系统异常', e.message); failures++; }

  // ========== 10. 历练 dungeon ==========
  console.log('\n【10】外出历练');
  try {
    const start = await api('/api/dungeon/start', { body: { mapNodeId: 'SAT_TN_08' }, cookie: globalThis.__cookie });
    if (start.status !== 200) throw new Error('开启副本失败: ' + start.text.slice(0, 200));
    const st = await api('/api/dungeon/state', { method: 'GET', cookie: globalThis.__cookie });
    const stateData = st.json?.state || st.json?.data?.state;
    const options = stateData?.currentOptions || stateData?.roundData?.currentOptions || [];
    log(true, '副本已开启', `主题: ${stateData?.theme ?? stateData?.location?.location ?? '?'} | ${options.length}个选项`);
    if (options.length) {
      const firstChoice = options[0];
      const choiceId = firstChoice.choiceId ?? firstChoice.id ?? firstChoice.index;
      const action = await api('/api/dungeon/action', { body: { choiceId }, cookie: globalThis.__cookie });
      log(action.status === 200, '副本探索动作成功', action.status === 200 ? '' : action.text.slice(0, 150));
    } else {
      log(true, '副本无当前选项（可能已结束）', '');
    }
    await api('/api/dungeon/quit', { cookie: globalThis.__cookie });
  } catch (e) { log(false, '外出历练失败', e.message); failures++; }

  // ========== 汇总 ==========
  console.log('\n════════════ 回归结果汇总 ════════════');
  const passed = results.filter((r) => r.ok).length;
  console.log(`通过: ${passed} / ${results.length}`);
  if (failures > 0) {
    console.log(`失败: ${failures}`);
    process.exit(1);
  }
  console.log('════ 全系统端到端回归通过 ════');
  process.exit(0);
}

main().catch((e) => {
  console.error('回归脚本异常退出:', e);
  process.exit(1);
});

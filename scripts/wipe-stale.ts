import postgres from 'postgres';
const c = postgres(process.env.DATABASE_URL ?? 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou');

const targets: Array<{ id: string; name: string }> = await c`SELECT id, name FROM wanjiedaoyou_cultivators WHERE name LIKE '陆%' OR name ~ '^.{1,3}(沉|清玄)$'`;
console.log('targets:', targets.length, targets.map(r=>r.name));

for (const t of targets) {
  const cid = t.id;
  // 先尝试 cultivator_id 列存在的表，失败也无所谓
  for (const table of [
    'wanjiedaoyou_creation_products',
    'wanjiedaoyou_pre_heaven_fates',
    'wanjiedaoyou_sect_memberships',
    'wanjiedaoyou_cultivator_tasks',
    'wanjiedaoyou_battle_records_v3',
    'wanjiedaoyou_qi_logs',
    'wanjiedaoyou_dungeon_runs',
    'wanjiedaoyou_dungeon_histories',
    'wanjiedaoyou_resource_events',
    'wanjiedaoyou_resource_scopes',
    'wanjiedaoyou_retreat_records',
    'wanjiedaoyou_mails',
    'wanjiedaoyou_consumables',
    'wanjiedaoyou_materials',
    'wanjiedaoyou_tower_enemy_floors',
  ]) {
    try {
      await c.unsafe(`DELETE FROM ${table} WHERE cultivator_id = $1`, [cid]);
    } catch { /* missing column skip */ }
  }
  await c`DELETE FROM wanjiedaoyou_cultivators WHERE id = ${cid}`;
  console.log('deleted:', t.name);
}

const users: Array<{ id: string; email: string }> = await c`SELECT id, email FROM "user" WHERE email LIKE '2773705092%' OR email LIKE 'kuiyuan-test-%'`;
console.log('users:', users.length);
for (const u of users) {
  try { await c`DELETE FROM account WHERE user_id = ${u.id}`; } catch {}
  try { await c`DELETE FROM session WHERE user_id = ${u.id}`; } catch {}
  try { await c`DELETE FROM verification WHERE identifier = ${u.email}`; } catch {}
  await c`DELETE FROM "user" WHERE id = ${u.id}`;
  console.log('deleted user:', u.email);
}
await c.end();

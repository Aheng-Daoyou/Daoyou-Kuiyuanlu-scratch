import postgres from 'postgres';
const c = postgres(process.env.DATABASE_URL ?? 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou');
const rows: Array<any> = await c.unsafe(`SELECT id, email FROM better_auth."user" WHERE email LIKE '2773705092%' OR email LIKE 'kuiyuan-test-%'`);
console.log('users:', rows.length, rows.map(r=>r.email));
for (const u of rows) {
  try { await c.unsafe(`DELETE FROM better_auth.account WHERE "userId" = $1`, [u.id]); } catch {}
  try { await c.unsafe(`DELETE FROM better_auth.session WHERE "userId" = $1`, [u.id]); } catch {}
  try { await c.unsafe(`DELETE FROM better_auth.verification WHERE identifier = $1`, [u.email]); } catch {}
  await c.unsafe(`DELETE FROM better_auth."user" WHERE id = $1`, [u.id]);
  console.log('deleted user:', u.email);
}
await c.end();

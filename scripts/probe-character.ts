import postgres from 'postgres';
const c = postgres(process.env.DATABASE_URL ?? 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou');
const wu = await c`SELECT name FROM wanjiedaoyou_cultivators ORDER BY updated_at DESC LIMIT 12`;
for (const r of wu) console.log(r.name);
await c.end();

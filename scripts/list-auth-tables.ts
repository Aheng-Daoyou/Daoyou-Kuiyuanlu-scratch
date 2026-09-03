import postgres from 'postgres';
const c = postgres(process.env.DATABASE_URL ?? 'postgresql://daoyou:daoyou@127.0.0.1:5432/daoyou');
const rows = await c`SELECT tablename FROM pg_tables WHERE tablename IN ('user','session','account','verification') OR tablename LIKE '%auth%' ORDER BY tablename`;
for (const r of rows) console.log(r.tablename);
await c.end();

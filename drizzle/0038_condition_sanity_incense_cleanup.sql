-- ============================================================
-- 0038_condition_sanity_incense_cleanup
-- 修复：condition jsonb 遗留字段 sanity/incense 导致 /api/player/resources 500
--
-- 根因：窥渊化「神智/香」系统早期曾持久化到 cultivators.condition jsonb
-- 的顶层 sanity / incense 字段，后来重构为 battle-v5 战斗内动态神智资源
-- （core/sanity.ts，开战临时计算，不持久化）+ 香系统独立重构。
-- 当前代码 buildDefaultCondition 不再产出这两字段，读取契约
-- contracts/resources/player.ts 的 conditionSchema 是 .strict()，
-- 也不认识它们 → 老角色读 condition 时 ZodError 500。
--
-- 修复：从 condition jsonb 删除遗留的 sanity / incense 顶层键，
-- 使历史数据对齐当前 schema。神智现由 battle-v5 动态计算，香系统独立，
-- 删除不影响任何现行机制。
-- ============================================================

UPDATE "wanjiedaoyou_cultivators"
SET "condition" = "condition" - 'sanity' - 'incense'
WHERE "condition" IS NOT NULL
  AND ("condition" ? 'sanity' OR "condition" ? 'incense');

-- ============================================================
-- 0037_spiritual_root_grade_sync
-- 修复：灵根 grade 命名漂移导致 /api/player/resources 500
--
-- 根因：窥渊化改造把灵根品阶从「灵根」体系改名「窍」体系，
-- 代码枚举已统一为 SPIRITUAL_ROOT_GRADE_VALUES = 天窍/真窍/伪窍/变异窍，
-- 但数据库里历史数据仍残留旧值「天灵根/真灵根/变异灵根」，
-- 另有一条手造脏数据「清窍」。读取路径 Zod 校验
-- (contracts/resources/player.ts:115 z.enum(SPIRITUAL_ROOT_GRADE_VALUES))
-- 只认新枚举，旧值一律校验失败 → 500「服务器内部错误」。
--
-- 映射关系（按 resolveSpiritualRootGrade 规则归位）：
--   天灵根   → 天窍
--   真灵根   → 真窍
--   变异灵根 → 变异窍
--   清窍     → 天窍（该条 element=渊、单窍 rootCount=1，按规则应为天窍）
-- ============================================================

UPDATE "wanjiedaoyou_spiritual_roots"
SET "grade" = CASE
  WHEN "grade" = '天灵根' THEN '天窍'
  WHEN "grade" = '真灵根' THEN '真窍'
  WHEN "grade" = '变异灵根' THEN '变异窍'
  WHEN "grade" = '清窍' THEN '天窍'
  ELSE "grade"
END
WHERE "grade" IN ('天灵根', '真灵根', '变异灵根', '清窍');

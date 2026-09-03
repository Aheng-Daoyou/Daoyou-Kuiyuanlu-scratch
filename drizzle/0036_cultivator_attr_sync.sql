-- 修复 wanjiedaoyou_cultivators 中窥渊化历史留下的死列，并把 schema.ts 期望但 DB 缺失的两列补上。
-- 死列 lamp_law / matter_wall / heart_fire / archived_attributes 在代码中无任何引用
-- （schema.ts 与全部应用代码均使用 strength/spirit/endurance），仅为某次中途放弃的
-- 「窥渊化命名探索」残留在生产库中的死列。
-- 缺列 strength / spirit 在 schema.ts 中是 .notNull() 但 DB 此前从未 ADD COLUMN，导致
-- createCultivator 直接报 "column ... does not exist" → save-character 返回 500。
--
-- 同样问题在 wanjiedaoyou_spiritual_roots：DB 列被某次窥渊化改为 aperture_strength，
-- 但 schema.ts 仍叫 strength。CreateCultivator 在主表 insert 之后会写 spiritual_roots，
-- 因此修复主表 500 后会立即被这张表的 insert 再炸一次 500；rename 同步即可。

ALTER TABLE "wanjiedaoyou_cultivators"
  DROP COLUMN IF EXISTS "lamp_law";

ALTER TABLE "wanjiedaoyou_cultivators"
  DROP COLUMN IF EXISTS "matter_wall";

ALTER TABLE "wanjiedaoyou_cultivators"
  DROP COLUMN IF EXISTS "heart_fire";

ALTER TABLE "wanjiedaoyou_cultivators"
  DROP COLUMN IF EXISTS "archived_attributes";

ALTER TABLE "wanjiedaoyou_cultivators"
  ADD COLUMN IF NOT EXISTS "strength" integer NOT NULL DEFAULT 10;

ALTER TABLE "wanjiedaoyou_cultivators"
  ADD COLUMN IF NOT EXISTS "spirit" integer NOT NULL DEFAULT 10;

ALTER TABLE "wanjiedaoyou_spiritual_roots"
  RENAME COLUMN "aperture_strength" TO "strength";

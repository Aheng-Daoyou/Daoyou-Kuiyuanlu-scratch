ALTER TABLE "wanjiedaoyou_bet_battles"
  DROP CONSTRAINT IF EXISTS "wanjiedaoyou_bet_battles_battle_record_id_wanjiedaoyou_battle_records_id_fk";

ALTER TABLE "wanjiedaoyou_bet_battles"
  DROP CONSTRAINT IF EXISTS "wanjiedaoyou_bet_battles_battle_record_v2_id_wanjiedaoyou_battle_records_v2_id_fk";

ALTER TABLE "wanjiedaoyou_bet_battles"
  DROP COLUMN IF EXISTS "battle_record_id";

ALTER TABLE "wanjiedaoyou_bet_battles"
  DROP COLUMN IF EXISTS "battle_record_v2_id";

DROP TABLE IF EXISTS "wanjiedaoyou_battle_records" CASCADE;
DROP TABLE IF EXISTS "wanjiedaoyou_battle_records_v2" CASCADE;
DROP TABLE IF EXISTS "wanjiedaoyou_cultivator_state_versions" CASCADE;
DROP TABLE IF EXISTS "wanjiedaoyou_player_state_events" CASCADE;
# 持灯引荐 · 邀请制注册门槛设计

> 世界观：持灯人（老玩家）以一枚「灯引」引荐新人入道。灯引是灯下入道的引荐信物——
> 一灯引一人，火种相传。新人注册时可凭灯引入道，亦可自行叩门。

## 需求取向（已确认）

- **灯引码 = 选填门槛**：填写则须为有效灯引（否则拒绝注册）；未填写亦可注册。
  遵循「不阻塞核心流程」的降级原则——引擎/运营管对错，门槛不卡正常入道。
- **运营侧 = 管理端「灯引管理」页**：可生成 / 停用 / 查看使用记录。

## 数据层

表 `wanjiedaoyou_invitation_lamps`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `code` | varchar(40) 唯一 | 灯引码，格式 `XXXX-XXXX`（4-4 大写字母数字） |
| `referrer_user_id` | uuid 可空 | 引荐人（持灯人） |
| `note` | varchar(200) | 备注 |
| `status` | varchar(16) | `active` / `disabled` |
| `total_limit` | integer 默认 1 | 可引荐次数 |
| `used_count` | integer 默认 0 | 已消耗次数 |
| `used_by_user_id` | uuid 可空 | 最近一次使用者 |
| `used_at` | timestamp 可空 | 最近一次使用时间 |
| `expires_at` | timestamp 可空 | 过期时间（空=永不过期） |
| `created_by` / `created_at` / `updated_at` | | 审计 |

迁移：`drizzle/0035_windy_jamie_braddock.sql`（drizzle-kit 产物，journal 登记）。
实际建表：`scripts/apply-pending-migrations.sql`（`CREATE TABLE IF NOT EXISTS` 幂等）。

## 服务层

- `src/server/lib/invitation/code.ts`：`generateInvitationCode()`（生成 `XXXX-XXXX`）、
  `normalizeInvitationCode()`、`isValidInvitationCodeFormat()`。
- `src/server/lib/invitation/service.ts`：
  - `validateInvitationCode(raw)`：纯校验，不消耗。空码→valid（选填）。
  - `consumeInvitationLamp(raw, executor)`：事务内 `SELECT FOR UPDATE` 原子校验+消耗
    （used_count+1）。返回 `valid` 或 `invalid{reason}`。
  - `invitationErrorMessage(validation)`：错误文案（不存在/已停用/已用完/已过期）。

## 注册接入（`src/server/lib/auth/hono.ts`）

`validateInvitationOnSignUp` 只拦截**真正创建账号**的请求点：

- `POST /api/auth/sign-up/email`（密码注册）
- `POST /api/auth/sign-in/email-otp`（邮箱验证码验证，首次邮箱在此创建账号）

读取 body `inviteCode`：空则放行；非空则 `consumeInvitationLamp` 原子校验+消耗，无效则
返回 400。`sign-in/email-otp` 对已有账号（source=login）登录时灯引通常为空，直接放行。

## 管理端 API

`src/server/routes/api/admin/invitation-lamps.router.ts`（注册于 `/api/admin/invitation-lamps`）：

- `GET /`：列表，可按 `status`（active/disabled）过滤。
- `POST /`：创建。`code` 留空自动生成；可填 `referrerUserId`/`note`/`totalLimit`/`expiresAt`。
- `POST /:id/toggle`：停用 / 启用。

## 前端

- 注册表单（密码注册 + 邮箱验证码注册 signup 场景）：新增「灯引（选填）」输入框，
  格式校验 `XXXX-XXXX`；`AuthProvider.signUpWithPassword` / `verifyEmailOtp` 透传
  `inviteCode`（better-auth client 类型对未知字段用断言绕过）。
- `buildEmailOtpTarget` 支持 `invite` 查询参数，切换注册方式时保留灯引。
- 管理页：`routes/admin/invitation-lamps/`（列表 + 新建表单），导航栏「灯引管理」。

## 边界

- 未改动任何既有英文 ID / schema 判别值 / 引擎逻辑；仅新增独立机制。
- 选填门槛 + 无效即拒，保证核心注册流程不被灯引机制阻塞。

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import nodemailer from 'nodemailer';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type SmtpTransporter = {
  transporter: nodemailer.Transporter;
  from: string;
};

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM;

  if (!host || !port || !user || !pass || !from) return null;

  return { host, port, secure, user, pass, from };
}

/**
 * dev 模式兜底：当 SMTP 未配置时，把邮件内容打到 bun/server 控制台，
 * 这样本地开发体验验证码/通知邮件时不需要真 SMTP 也能正常流转。
 * 生产环境（SMTP 未配置）会保持抛错，避免把邮件误发到本地日志导致泄漏。
 */
function isDevMode(): boolean {
  const env = (process.env.NODE_ENV ?? '').toLowerCase();
  if (env === 'development' || env === 'dev') return true;
  const isProd = process.env.DAOYOU_PRODUCTION === 'true';
  return !isProd && process.env.NODE_ENV !== 'production';
}

/**
 * dev 模式邮件落盘目录：项目根/.dev-mail
 * 最新一封写入 latest.html，全部追加到 inbox.html（可用浏览器直接打开查看验证码）。
 */
function devMailDir(): string {
  const dir = join(process.cwd(), '.dev-mail');
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // 目录已存在或无法创建时忽略，写文件时再报错
  }
  return dir;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function sendViaDevMailbox(
  email: string,
  subject: string,
  content: string,
): void {
  const now = new Date();
  const timestamp = now.toLocaleString('zh-CN', { hour12: false });
  const codeMatch = content.match(/验证码[：:]\s*(\d{4,8})/);
  const codeHtml = codeMatch
    ? `<span class="code">${escapeHtml(codeMatch[1])}</span>`
    : '';

  const entryHtml = `
  <section class="mail">
    <header>
      <span class="time">${escapeHtml(timestamp)}</span>
      <span class="to">收件人: ${escapeHtml(email)}</span>
      <span class="subject">${escapeHtml(subject)}</span>
    </header>
    ${codeHtml ? `<div class="code-line">验证码: ${codeHtml}</div>` : ''}
    <pre>${escapeHtml(content)}</pre>
  </section>`;

  const latestHtml = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>窥渊录 · 开发邮箱</title>
<style>
  body { font-family: "Microsoft YaHei", system-ui, sans-serif; background: #14161c; color: #d8d4c8; margin: 0; padding: 24px; }
  h1 { font-size: 18px; color: #9db4c0; border-bottom: 1px solid #2c313c; padding-bottom: 8px; }
  .mail { background: #1b1e26; border: 1px solid #2c313c; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .mail header { display: flex; gap: 16px; flex-wrap: wrap; color: #8a92a0; font-size: 13px; margin-bottom: 8px; }
  .mail pre { white-space: pre-wrap; font-family: inherit; margin: 0; line-height: 1.7; }
  .code-line { margin: 8px 0; font-size: 15px; }
  .code { font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #ffd166; font-family: "Courier New", monospace; }
</style></head>
<body>
<h1>📬 窥渊录 · 开发邮箱（最新一封邮件）</h1>
${entryHtml}
</body></html>`;

  try {
    const dir = devMailDir();
    writeFileSync(join(dir, 'latest.html'), latestHtml, 'utf8');
    appendFileSync(join(dir, 'inbox.html'), entryHtml + '\n', 'utf8');
  } catch (error) {
    console.error('[SMTP dev] 开发邮箱落盘失败:', error);
  }

  // 同时保留控制台输出（便于 Attach 到进程日志排查）
  const banner = '═'.repeat(72);
  console.warn('\n' + banner);
  console.warn(
    '📬 [SMTP 未配置] 开发模式兜底：邮件未真实投递，已写入 .dev-mail/latest.html',
  );
  console.warn('   收件人: ' + email);
  console.warn('   主题:   ' + subject);
  if (codeMatch) console.warn('   验证码: ' + codeMatch[1]);
  console.warn('   NODE_ENV=' + (process.env.NODE_ENV ?? '(未设)'));
  console.warn('--- 正文 ---');
  console.warn(content);
  console.warn(banner + '\n');
}

export function createSmtpTransporter(): SmtpTransporter {
  const cfg = readSmtpConfig();
  if (!cfg) {
    throw new Error(
      'Missing SMTP config: SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM',
    );
  }

  return {
    transporter: nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    }),
    from: cfg.from,
  };
}

/**
 * 永不实际投递的保留域邮箱。
 * - RFC 2606 保留域：`.test` / `.example` / `.invalid` / `.localhost`（无法注册、无真实 MX）
 * - IANA 文档示例域：`example.com` / `example.org` / `example.net`（真实存在但仅用于文档示例，
 *   SMTP 一律退信，比如 example.com 的 MX 是 '.'）
 * 命中时落到 dev 邮箱兜底（模拟投递），绝不触发真实 SMTP，避免退信堆积。
 */
function isReservedDomainEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  const IANA_EXAMPLE = new Set(['example.com', 'example.org', 'example.net']);
  return (
    IANA_EXAMPLE.has(domain) ||
    domain === 'localhost' ||
    domain === 'invalid' ||
    domain.endsWith('.test') ||
    domain.endsWith('.example') ||
    domain.endsWith('.invalid')
  );
}

/** 仅供测试：判断邮箱是否属于永不外发的保留域（RFC 2606 / IANA 示例域）。 */
export function isReservedEmailForTest(email: string): boolean {
  return isReservedDomainEmail(email);
}

export async function sendViaSmtp(
  email: string,
  subject: string,
  content: string,
): Promise<void> {
  // 保留域邮箱拦截：只模拟投递，绝不真实外发，避免 SMTP 退信堆积。
  if (isReservedDomainEmail(email)) {
    if (isDevMode()) {
      sendViaDevMailbox(email, subject, content);
      return;
    }
    throw new Error(`Refusing to send mail to reserved domain: ${email}`);
  }

  const cfg = readSmtpConfig();
  if (!cfg) {
    if (isDevMode()) {
      sendViaDevMailbox(email, subject, content);
      return;
    }
    throw new Error(
      'Missing SMTP config: SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM',
    );
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const html = content
    .split('\n')
    .map((line) => line.trim())
    .join('<br />');

  await transporter.sendMail({
    from: cfg.from,
    to: email,
    subject,
    text: content,
    html,
  });
}

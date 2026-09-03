import type { SectVisualIdentity } from '@shared/engine/sect';
import { cn } from '@shared/lib/cn';

/**
 * SectCrest —— 宗门徽记（程序化立绘）。
 *
 * 深墨风宗门徽记，由 `SectVisualIdentity` 的确定性数据渲染：
 * 中央单字徽印 + 宗门名号 + 格言 + 意象注脚。不依赖运行时 AI 生成，
 * 离线恒可渲染，作为进入宗门舆图前的视觉落点（框架 31.3「立绘」降级方案）。
 *
 * 换骨边界：纯展示层，不读取/改动任何引擎数值或判别字段。
 */
export function SectCrest({
  visual,
  title,
  className,
}: {
  visual: SectVisualIdentity;
  title?: string;
  className?: string;
}) {
  const [base, accent, blood] = visual.palette;
  const sealTone = blood ?? '#b0452f';

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden border border-ink/15',
        className,
      )}
      style={{
        background:
          'radial-gradient(120% 90% at 20% 0%, rgba(255,245,225,0.05), transparent 55%), linear-gradient(160deg, ' +
          base +
          ' 0%, ' +
          base +
          ' 58%, ' +
          accent +
          ' 130%)',
      }}
    >
      {/* 墨渍底纹 */}
      <svg
        className="pointer-events-none absolute inset-0 size-full opacity-25"
        aria-hidden="true"
        viewBox="0 0 680 180"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0h680v180H0z"
          fill="none"
          stroke={sealTone}
          strokeOpacity="0.18"
        />
        <path
          d="M-20 150 Q 160 60 340 120 T 700 90"
          fill="none"
          stroke={sealTone}
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />
        <circle cx="560" cy="36" r="60" fill={sealTone} opacity="0.08" />
        <circle cx="120" cy="150" r="70" fill={sealTone} opacity="0.07" />
      </svg>

      <div className="relative z-10 flex items-center gap-5 p-5 md:gap-7 md:p-7">
        {/* 徽印 */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="flex size-16 items-center justify-center rounded-full border-2 md:size-20"
            style={{
              borderColor: sealTone,
              color: '#faf5e6',
              boxShadow:
                'inset 0 0 0 4px rgba(250,245,230,0.06), 0 0 18px ' +
                sealTone +
                '33',
            }}
          >
            <span
              className="text-2xl font-black tracking-tight md:text-3xl"
              style={{ textShadow: `0 0 12px ${sealTone}66` }}
            >
              {visual.sigilGlyph}
            </span>
          </div>
          <span
            className="text-[10px] tracking-[0.2em] uppercase"
            style={{ color: sealTone }}
          >
            {visual.sigilLabel}
          </span>
        </div>

        {/* 名号 + 格言 + 注脚 */}
        <div className="min-w-0 flex-1">
          {title ? (
            <h2
              className="text-xl font-semibold tracking-[0.18em] md:text-2xl"
              style={{ color: '#faf5e6' }}
            >
              {title}
            </h2>
          ) : null}
          <p
            className="mt-1 text-sm font-medium tracking-[0.1em] md:text-base"
            style={{ color: '#e9dcc0' }}
          >
            {visual.motto}
          </p>
          {visual.motif ? (
            <p
              className="mt-2 max-w-xl text-xs leading-6 opacity-80 md:text-sm"
              style={{ color: '#d6c8ad' }}
            >
              {visual.motif}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

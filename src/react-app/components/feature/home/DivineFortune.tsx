import { GameLoadingState } from '@app/components/game-shell/GameLoadingState';
import { TypewriterText } from '@app/components/ui/TypewriterText';
import { useDivineFortune } from '@app/lib/hooks/useDivineFortune';
import { cn } from '@shared/lib/utils';

interface DivineFortuneProps {
  className?: string;
  onComplete?: () => void;
  showImmediately?: boolean; // 是否立即显示（跳过打字机效果）
  startDelay?: number; // 延迟开始时间（ms）
}

/**
 * 天机推演显示组件
 * 显示 AIGC 生成的天机格言
 */
export function DivineFortune({
  className,
  onComplete,
  showImmediately = false,
  startDelay = 0,
}: DivineFortuneProps) {
  const { fortune, isLoading } = useDivineFortune();

  if (isLoading) {
    return (
      <GameLoadingState
        message="正在推演天机……"
        variant="inline"
        className={className}
      />
    );
  }

  if (!fortune) {
    return null;
  }

  return (
    <div className={cn('divine-fortune space-y-3 text-center', className)}>
      {/* 标题 */}
      <div className="text-wood/70 mb-4 text-sm tracking-widest">
        ◆ 今日天机 ◆
      </div>

      {/* 天机格言 */}
      <TypewriterText
        text={fortune.fortune}
        speed={100}
        startDelay={startDelay}
        enabled={!showImmediately}
        className="block text-lg italic"
      />

      {/* 提示 */}
      <TypewriterText
        text={fortune.hint}
        speed={100}
        startDelay={
          showImmediately ? 0 : startDelay + fortune.fortune.length * 100 + 300
        }
        enabled={!showImmediately}
        onComplete={onComplete}
        className="block text-lg"
      />

      {/* 装饰性分隔线 */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <div className="border-wood/30 w-12 border-t border-dashed" />
        <div className="text-wood/40 text-xs">☯</div>
        <div className="border-wood/30 w-12 border-t border-dashed" />
      </div>
    </div>
  );
}

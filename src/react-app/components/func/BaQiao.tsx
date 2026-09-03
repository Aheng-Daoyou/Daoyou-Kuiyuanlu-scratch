import { GameSceneSection } from '@app/components/game-shell/GameSceneSection';
import { InkSection } from '@app/components/layout';
import { InkBadge } from '@app/components/ui/InkBadge';
import { InkButton } from '@app/components/ui/InkButton';
import { InkList, InkListItem } from '@app/components/ui/InkList';
import { ELEMENT_VALUES } from '@shared/types/constants';
import type { SpiritualRoot } from '@shared/types/cultivator';
import { getElementInfo } from '@shared/lib/gameConceptDisplay';
import { ReactNode } from 'react';
import { useInkUI } from '../providers/InkUIProvider';

function formatRootStrength(root: SpiritualRoot): string {
  const bonus = root.marrowWashBonus ?? 0;
  if (bonus <= 0) {
    return `强度：${root.strength}`;
  }
  return `强度：${root.strength}（原始 ${root.baseStrength ?? root.strength}，后天 +${bonus}）`;
}

interface BaQiaoProps {
  spiritualRoots: SpiritualRoot[];
  /** 是否显示在 Section 中，默认 true */
  showSection?: boolean;
  /** 是否使用简化显示（仅显示badge），默认 false */
  compact?: boolean;
  /** 自定义标题，默认 "【窍】" */
  title?: ReactNode;
  /** 场景页使用正文级 section，避免引入 display 标题 */
  sectionVariant?: 'ink' | 'scene';
}

/**
 * 窍展示组件
 */
export function BaQiao({
  spiritualRoots,
  showSection = true,
  compact = false,
  title = '【窍】',
  sectionVariant = 'ink',
}: BaQiaoProps) {
  const { openDialog } = useInkUI();
  if (!spiritualRoots || spiritualRoots.length === 0) {
    return null;
  }

  const rootHelpContent = (
    <div className="text-ink-secondary flex flex-col gap-2 text-sm">
      <p>窍是守灯人感应灯油、被灯外之物窥见的根本。</p>
      <p>
        <span className="text-ink font-bold">属性：</span>
        决定了可修习的功法属性与灯律威力加成（如同属性灯律伤害提升）。
      </p>
      <p>
        <span className="text-ink font-bold">强度：</span>
        窍越纯净（强度越高），燃灯越快，感应灯油越易。
      </p>
      <p>单一属性的纯窍燃灯最快，多属性杂窍则较慢。</p>
      <p>
        八窍共有 {ELEMENT_VALUES.join('、')}，皆为先祖纳秽（吸收梦涎）遗下的感官异化之果。
      </p>
    </div>
  );

  const showRootHelp = () => {
    openDialog({
      title: '窍说明',
      content: rootHelpContent,
      confirmLabel: '明悟',
    });
  };

  const content = compact ? (
    <div className="flex flex-wrap">
      {spiritualRoots.map((root, idx) => (
        <InkBadge
          tier={root.grade}
          key={`${root.element}-${root.grade}-${idx}`}
        >
          {root.element}
        </InkBadge>
      ))}
    </div>
  ) : (
    <InkList>
      {spiritualRoots.map((root, idx) => (
        <InkListItem
          key={root.element + idx}
          title={
            <div className="flex items-center">
              <span>
                {getElementInfo(root.element).icon} {root.element}
              </span>
              <InkBadge tier={root.grade} />
            </div>
          }
          meta={formatRootStrength(root)}
        />
      ))}
    </InkList>
  );

  if (showSection) {
    if (sectionVariant === 'scene') {
      return (
        <GameSceneSection
          title={title}
          contentClassName="space-y-3"
          help={{
            title: '窍说明',
            content: rootHelpContent,
            confirmLabel: '明悟',
          }}
        >
          {content}
        </GameSceneSection>
      );
    }

    return (
      <InkSection title={title}>
        <>
          {content}
          <InkButton onClick={showRootHelp}>💡 窍说明</InkButton>
        </>
      </InkSection>
    );
  }

  return <>{content}</>;
}

export function BaQiaoMini({
  spiritualRoots,
  title = '窍',
}: Pick<BaQiaoProps, 'spiritualRoots' | 'title'>) {
  return (
    <div className="space-y-2">
      <div className="font-semibold">{title}</div>
      <div className="flex flex-wrap gap-2">
        {spiritualRoots && spiritualRoots.length > 0 ? (
          spiritualRoots.map((root, idx) => (
            <InkBadge tier={root.grade} key={`${root.element}-${idx}`}>
              {`${root.element} · ${root.strength}${
                (root.marrowWashBonus ?? 0) > 0
                  ? `(+${root.marrowWashBonus})`
                  : ''
              }`}
            </InkBadge>
          ))
        ) : (
          <span className="text-ink-secondary text-xs">无窍信息</span>
        )}
      </div>
    </div>
  );
}

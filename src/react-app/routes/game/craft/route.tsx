import {
  GameSceneAsideSection,
  GameSceneFrame,
  GameSceneNote,
} from '@app/components/game-shell';
import { InkButton } from '@app/components/ui/InkButton';
import { InkCard } from '@app/components/ui/InkCard';
import { usePlayerSession } from '@app/lib/resources/player';

export default function CraftPage() {
  const note = usePlayerSession().data?.note;

  return (
    <GameSceneFrame
      variant="lite"
      title="【造物仙炉】"
      description="天地为炉，造化为工。先分清此刻是要封灵成兵，还是制香调息，再携合适灯材入室。"
      headerMeta={
        note ? (
          <GameSceneNote>
            <p className="text-sm leading-7">{note}</p>
          </GameSceneNote>
        ) : undefined
      }
      aside={
        <>
          <GameSceneAsideSection title="炉房分途">
            <div className="space-y-2 text-sm leading-7">
              <p>封灵室：矿材、腌骨、辅材入炉，锻出封灵器形体。</p>
              <p>制香房：草木灯药调性，求疗伤、破境与五轨炼体诸丹。</p>
            </div>
          </GameSceneAsideSection>
          <GameSceneAsideSection
            title="造物说明"
            className="text-sm leading-7"
            help={{
              title: '造物要诀与细则',
              content: (
                <div className="space-y-3 text-sm leading-7">
                  <div>
                    <p className="text-ink font-medium">造物要诀</p>
                    <p className="text-ink-secondary">
                      品阶越高、属性越契合，成品越稳。
                    </p>
                    <p className="text-ink-secondary">
                      神念描述会直接影响成品的方向与气质。
                    </p>
                  </div>
                  <div>
                    <p className="text-ink font-medium">造物细则</p>
                    <p className="text-ink-secondary">
                      造物需消耗对应灯材，材料品阶与属性都会影响成品品质。
                    </p>
                    <p className="text-ink-secondary">
                      封灵铸骨立形，制香调和香性；决定路线后再入炉更清楚。
                    </p>
                  </div>
                </div>
              ),
            }}
          />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InkCard className="flex flex-col items-center p-4 text-center">
          <div className="mb-2 text-3xl">🔥</div>
          <h3 className="text-ink-primary mb-2 text-lg font-semibold">封灵</h3>
          <p className="text-ink-secondary mb-4 min-h-10 text-sm">
            引地火之威，锻造封灵器神兵。
            <br />
            可投入矿材、腌骨与辅材，灯药与秘籍不可入炉。
          </p>
          <InkButton href="/game/craft/refine" variant="primary">
            前往封灵室
          </InkButton>
        </InkCard>

        <InkCard className="flex flex-col items-center p-4 text-center">
          <div className="mb-2 text-3xl">🌕</div>
          <h3 className="text-ink-primary mb-2 text-lg font-semibold">制香</h3>
          <p className="text-ink-secondary mb-4 min-h-10 text-sm">
            调阴阳之气，炼制香品妙药。
            <br />
            炼体香按香性推进五轨，肉身进阶看香性与质量。
          </p>
          <InkButton href="/game/craft/alchemy" variant="primary">
            前往制香房
          </InkButton>
        </InkCard>
      </div>
    </GameSceneFrame>
  );
}

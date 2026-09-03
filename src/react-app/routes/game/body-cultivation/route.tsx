import { BodyCultivationDetailPanel } from '@app/components/feature/cultivator/BodyCultivationPanels';
import {
  GameSceneFrame,
  GameSceneLoading,
  GameSceneNote,
} from '@app/components/game-shell';
import { InkButton, InkNotice } from '@app/components/ui';
import {
  useCultivatorIdentity,
  usePlayerSession,
} from '@app/lib/resources/player';

export default function BodyCultivationPage() {
  const profile = useCultivatorIdentity();
  const session = usePlayerSession();
  const cultivator = profile.data?.cultivator;
  const isLoading = profile.loading || session.loading;
  const note = session.data?.note;

  if (isLoading && !cultivator) {
    return <GameSceneLoading message="正在读取炼体信息……" />;
  }

  if (!cultivator) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <InkNotice>
          尚无角色资料，先创建角色后再查看炼体。
          <InkButton href="/game/create" variant="primary" className="ml-2">
            觉醒窍
          </InkButton>
        </InkNotice>
      </div>
    );
  }

  return (
    <GameSceneFrame
      title="肉身炼体"
      description="服用炼体香提升皮肤、筋骨、脏腑、气血与心神五条轨道。满足等级、灯韵、材料和香品要求后，可以提升肉身阶位。"
      headerMeta={
        note ? (
          <GameSceneNote>
            <p className="text-sm leading-7">{note}</p>
          </GameSceneNote>
        ) : undefined
      }
    >
      <BodyCultivationDetailPanel />
    </GameSceneFrame>
  );
}

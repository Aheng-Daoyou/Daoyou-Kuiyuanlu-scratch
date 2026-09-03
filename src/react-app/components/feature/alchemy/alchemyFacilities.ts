import type {
  NpcConversationActor,
  RoomActorView,
} from '@app/components/feature/room';
import type { AlchemyFacilityId } from './alchemyTypes';

export const ALCHEMY_FACILITIES = {
  furnace: {
    id: 'furnace',
    sigil: '🔥',
    name: '玄火香炉',
    identity: '制香设施',
    responsibility: '准备材料并完成炼制',
    appearance: 'facility',
  },
  cabinet: {
    id: 'cabinet',
    sigil: '🌿',
    name: '百草香柜',
    identity: '材料设施',
    responsibility: '查看和辨认制香材料',
    appearance: 'facility',
  },
  formulas: {
    id: 'formulas',
    sigil: '📜',
    name: '香方灯册',
    identity: '香方设施',
    responsibility: '查阅和管理已有香方',
    appearance: 'facility',
  },
  guide: {
    id: 'guide',
    sigil: '🪨',
    name: '炉理碑',
    identity: '指引设施',
    responsibility: '阅读炼香方法与常见问题',
    appearance: 'facility',
  },
} as const satisfies Record<
  AlchemyFacilityId,
  NpcConversationActor & Pick<RoomActorView, 'id'>
>;

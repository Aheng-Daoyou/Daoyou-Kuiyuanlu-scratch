import {
  ConfiguredSectNodePlugin,
  type SectAbilityId,
  type SectBuildBuilder,
} from '../../../../core';
import {
  EYE_BUILD_FACADE,
  type JiujieEyeBuildFacade,
  type JiujieEyeFeatures,
} from '../../shared/buildFacade';

const node = (
  id: string,
  layerId: string,
  name: string,
  description: string,
  feature: keyof JiujieEyeFeatures,
  abilities: SectAbilityId[],
) => new ConfiguredSectNodePlugin(
  { id, layerId, name, description },
  (_context, builder: SectBuildBuilder) => {
    builder.requireExtension<JiujieEyeBuildFacade>(
      EYE_BUILD_FACADE,
      '灯眼临身构筑',
    ).enable(feature);
    for (const abilityId of abilities) {
      builder.addAbilityPresentationModifier({
        sourceId: id,
        abilityId,
        factRows: [`参悟·${name}：${description}`],
      });
    }
  },
);

export const JIUJIE_EYE_NODES = [
  node('eye-open', '1', '开门迎焰', '施展《承灯受焰》时获得8%最大气血护盾；该护盾在承焰期间破裂时获得1点灯焰，每次施法最多一次。', 'openingShield', ['receive-calamity']),
  node('eye-bear', '1', '承焰留名', '灯眼第一次照见攻击者时额外反击0.15倍法攻灯焰伤害；若其没有灯痕则施加灯痕，若已有灯痕则增加1层案债。', 'bearingMark', ['receive-calamity']),
  node('eye-first-light', '1', '灯焰护心', '每次灯眼存续期间第一次受到直接伤害后，获得5%最大气血护盾，并额外获得1点灯焰。', 'firstLight', ['receive-calamity']),
  node('eye-record', '2', '血甲同书', '承焰量可以记录护盾吸收的直接伤害；记录上限提高至自身最大气血的70%。', 'armorMemory', ['receive-calamity']),
  node('eye-question', '2', '问焰寻隙', '《灯牢问行》命中照见目标时，额外推进1层案债，并使《承灯受焰》当前冷却减少1回合。', 'questionBeheld', ['thunder-prison-question']),
  node('eye-return', '2', '借焰续眼', '《借焰护身》令当前灯眼和承灯受焰各延长1回合；没有对应状态时不补开状态。', 'borrowExtendsEye', ['borrow-calamity']),
  node('eye-guard', '3', '不退灯门', '承灯受焰期间，气血低于40%时首次受到直接伤害，消耗1点灯焰使该次伤害额外降低20%；每回合最多一次。', 'lowHpGate', ['receive-calamity']),
  node('eye-deep-return', '3', '灯焰反照', '灯眼期间每回合第一次受到直接伤害后，对攻击者造成0.20倍法攻的灯焰反击伤害。', 'counterThunder', ['receive-calamity']),
  node('eye-still', '3', '静候灯来', '若一整个回合内灯眼没有记录到直接伤害，则回合结束时获得1点灯焰，并使《承灯受焰》冷却减少1回合。', 'quietCalamity', ['receive-calamity']),
  node('eye-long-gaze', '4', '众焰归一', '《灯影回响》命中照见目标时，额外释放当前承焰量的20%作为追击灯焰伤害，但不消耗承焰量；每回合最多一次。', 'echoMemory', ['causal-echo']),
  node('eye-heavy-thunder', '4', '灯牢追身', '《灯牢问行》命中照见目标时追加0.25倍法攻灯焰伤害，并将灯眼刷新1回合。', 'questionPursuit', ['thunder-prison-question']),
  node('eye-shelter', '4', '灯甲回生', '《借焰护身》的护盾破裂时，恢复6%最大气血，并为破盾者施加或刷新灯痕；每个护盾最多触发一次。', 'shieldRebirth', ['borrow-calamity']),
  node('eye-true-record', '5', '真焰入簿', '《九灯清算》的承焰量以45%比例转为无属性真实伤害。', 'trueMemory', ['nine-sky-settlement']),
  node('eye-returning-law', '5', '焰尽身还', '《九灯清算》除造成承焰伤害外，再将承焰量的25%转为自身治疗。', 'memoryHeal', ['nine-sky-settlement']),
  node('eye-after-rain', '5', '清算留门', '消耗3点灯焰施展《九灯清算》后，重新获得1回合灯眼和基础承灯受焰。', 'settlementReopen', ['nine-sky-settlement']),
  node('eye-nine-gates', 'ultimate', '九门归焰', '《九灯清算》以100%比例释放承焰量；若承焰量达到记录上限，额外推进目标1层案债。', 'fullMemory', ['nine-sky-settlement']),
  node('eye-heavenly-shield', 'ultimate', '身为灯门', '《九灯清算》释放承焰伤害的同时，将承焰量的60%转为护盾，持续2回合。', 'memoryShield', ['nine-sky-settlement']),
  node('eye-calamity-without-end', 'ultimate', '焰后再开', '《九灯清算》后获得2回合灯眼和1回合承灯受焰；期间首次受击返还1点灯焰，每3回合最多一次。', 'calamityCycle', ['nine-sky-settlement']),
] as const;

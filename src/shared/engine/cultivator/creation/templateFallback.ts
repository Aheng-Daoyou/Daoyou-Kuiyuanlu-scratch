import { ELEMENT_VALUES, GENDER_VALUES, type ElementType } from '@shared/types/constants';
import type { CultivatorAIRawData } from './types';

/**
 * 本地开发 / LLM 未配置 / AI 调用失败时的模板骨架。
 * 文案取自《窥渊录》克苏鲁修仙世界观：八窍、家系异闻、纳秽污染。
 * 数值由引擎「法则自动演算」，此处只提供叙事与偏好。
 */

const SURNAMES = ['陆', '沈', '顾', '白', '燕', '聂', '温', '商', '桓', '闻人'];
const GIVEN_NAMES = [
  '听澜', '折镜', '守拙', '问灯', '渡蚁', '拾骨', '青梧', '照野',
  '无咎', '迟归', '观棋', '叩舷', '拂衣', '衔烛', '洗心', '眠鸥',
];

const ORIGINS = [
  '澜州渔户，世代不敢夜航',
  '观灯镇灯油世家旁支',
  '九禁地边缘的守陵人后裔',
  '没落执灯传承的记名杂役',
  '漕帮账房，半生与水账为伴',
  '山中采药农，惯走无人崖径',
  '香火断绝的小庙庙祝之子',
  '旧港牙人，替人打捞沉物',
];

const PERSONALITIES = [
  '外冷内韧，遇诡先记账',
  '寡言多疑，信奉眼见为虚',
  '温吞怕事，唯独对禁忌好奇',
  '爽利重诺，酒后爱说胡话',
  '谨慎圆滑，凡事留三分余地',
  '孤僻执拗，认死理不回头',
  '健谈市侩，心里另有杆秤',
];

const LINEAGE_LORES = [
  '曾祖随商队误入雾中孤港，归来后夜夜面壁而坐。自那以后，族中子弟开窍时总带着一缕不易察觉的潮气，长辈说是「欠了水里的债」。',
  '家谱缺了整整三代，只余一页写着「勿唤其名」。祖母临终反复叮嘱：夜里听见唤姓字，先咬破舌尖再回头。',
  '祖上有人替观灯会扎过一盏「不该亮的灯」，那晚之后嫡系血脉皆有梦游之症，醒来掌心多了一缕灯灰。',
  '先父是守陵人，说他守的「不是坟」。族中每代必有一人窍生异象，被视为「替先人听更」。',
  '高祖曾是渡口船工，一船人只他归来，从此不食鱼虾。族训第一条：水静无澜处，莫要看第二眼。',
  '母系一脉擅长「安神香」，配方只传女不传男。据说香灭之时，屋里会多坐一个人。',
];

const BACKGROUNDS = [
  '自幼替家中守夜，惯于在寂静里辨认「多余的声音」。某次替人打捞沉物时窥见水下一角衣袂，自此夜不能寐，决意求道以问究竟。',
  '半生循规蹈矩，直到亲历一场「所有钟表慢了一刻」的怪事。同乡皆已忘却，唯他记得——那份记得，成了他叩问彼岸的契机。',
  '因家传香方偶然「引」来过一位不速之客，从此明白世上有些门缝不该擦得太亮。带着满腹未解之事投入修行，只想看一眼帘后。',
  '早年随长辈出入旧地，学会了对一切「过分整齐」之物绕道。如今长辈故去，遗物中半页手记催他上路：去把当年没敢看完的看完。',
];

const BALANCE_NOTES = [
  '命格生辰皆为簿记推演，待叩问灯律再判。',
  '执灯传承尚在云雾里，掌灯司案头先记下此人。',
  '身世未明，灯律先按下不表，只在簿角画一道墨痕。',
  '此子根骨尚在观察之中，暂列候册，每夜点香一炷。',
  '家系异闻确凿，本司留档，待其开窍后另作处置。',
  '为陌生香火所钟，先记下，待执灯时一并核验。',
];

function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickName(): string {
  return pick(SURNAMES) + pick(GIVEN_NAMES);
}

function pickElements(): ElementType[] {
  const pool = [...ELEMENT_VALUES];
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 窍
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function buildTemplateCultivatorAIData(
  userInput: string,
): CultivatorAIRawData {
  const hint = userInput.trim().slice(0, 40);
  const lineage = pick(LINEAGE_LORES);

  return {
    player_race: 'human',
    race_narrative: '人身近道，百法皆可参悟。',
    name: pickName(),
    gender: pick(GENDER_VALUES),
    origin: pick(ORIGINS),
    personality: pick(PERSONALITIES),
    lineage_lore: lineage,
    background: pick(BACKGROUNDS),
    element_preferences: pickElements(),
    aptitude_score: 55 + Math.floor(Math.random() * 31), // 55-85
    balance_notes: pick(BALANCE_NOTES) + (hint ? `  玩家心念：${hint}` : ''),
  };
}

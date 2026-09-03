import { InkButton } from '@app/components/ui';
import { AlchemyToolWorkspace } from '../AlchemyToolWorkspace';

const SECTIONS = [
  {
    title: '初识制香',
    body: '一炉制香只需在香炉内完成材料准备、炼制预览和确认炼制。香柜、灯册和炉理碑都是可选的辅助设施。',
  },
  {
    title: '随心制香',
    body: '投入材料并填写明确的炼制目标，香炉会根据材料香性与目标生成香品，也可能由此获得新香方。',
  },
  {
    title: '香方炼制',
    body: '选择已保存的香方后再添加材料。炼制预览会说明当前材料与香方是否契合。',
  },
  {
    title: '香蕴与批次',
    body: '材料数量与品质汇成香蕴。香蕴会分结成主香和副香，同一炉可能出现多个品质与品相批次。',
  },
  {
    title: '品质与品相',
    body: '品质代表香品层次，品相代表同品质下的成香完整程度。预览只能显示大致倾向，炼制完成后才能看到最终结果。',
  },
  {
    title: '香毒与炉况',
    body: '燥烈、冲突或过杂的配伍会提高损耗与风险。炼制预览会列出无法继续的原因和需要留意的问题。',
  },
  {
    title: '常见失败原因',
    body: '材料不足、灯油券不足、炼制目标为空、未选择香方、材料变化或分析过期，都会导致无法炼制；返回准备阶段修改即可。',
  },
] as const;

export function AlchemyGuideView({
  focus = 'reference',
  onBack,
  onOpenFurnace,
}: {
  focus?: 'basics' | 'reference';
  onBack(): void;
  onOpenFurnace(): void;
}) {
  return (
    <AlchemyToolWorkspace
      title={focus === 'basics' ? '第一炉建议' : '制香说明'}
      backLabel="炉理碑"
      onBack={onBack}
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title} className="border-ink/15 border p-5">
              <h3 className="text-base font-medium">{section.title}</h3>
              <p className="text-ink-secondary mt-2 text-sm leading-7">
                {section.body}
              </p>
            </section>
          ))}
        </div>
        <div className="flex justify-end">
          <InkButton variant="primary" onClick={onOpenFurnace}>
            前往香炉
          </InkButton>
        </div>
      </div>
    </AlchemyToolWorkspace>
  );
}

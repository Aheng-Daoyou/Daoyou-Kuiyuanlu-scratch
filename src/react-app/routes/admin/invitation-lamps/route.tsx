import { InvitationLampsTable } from './_components/InvitationLampsTable';

export default function InvitationLampsPage() {
  return (
    <div className="space-y-5">
      <header className="border-ink/15 bg-bgpaper/90 border border-dashed p-6">
        <p className="text-ink-secondary text-xs tracking-[0.2em]">
          INVITATION LAMPS
        </p>
        <h2 className="font-heading text-ink mt-2 text-4xl">灯引管理</h2>
        <p className="text-ink-secondary mt-2 text-sm">
          持灯人引荐新人的「灯引」信物。管理状态、引荐名额与过期时间，
          新人在注册时可选填写灯引码。
        </p>
      </header>

      <section className="border-ink/15 bg-bgpaper/90 border border-dashed p-6">
        <InvitationLampsTable />
      </section>
    </div>
  );
}

import { InvitationLampCreateForm } from '../_components/InvitationLampCreateForm';

export default function NewInvitationLampPage() {
  return (
    <div className="space-y-5">
      <header className="border-ink/15 bg-bgpaper/90 border border-dashed p-6">
        <p className="text-ink-secondary text-xs tracking-[0.2em]">
          NEW INVITATION LAMP
        </p>
        <h2 className="font-heading text-ink mt-2 text-4xl">新建灯引</h2>
      </header>

      <section className="border-ink/15 bg-bgpaper/90 border border-dashed p-6">
        <InvitationLampCreateForm />
      </section>
    </div>
  );
}

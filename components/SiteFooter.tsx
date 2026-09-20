import { FlameIcon, KeyIcon, TimerIcon } from "@/components/icons";
import type { Translations } from "@/lib/i18n/translations";

export function SiteFooter({ t }: { t: Translations }) {
  const features = [
    {
      icon: KeyIcon,
      title: t.footer.zeroKnowledgeTitle,
      body: t.footer.zeroKnowledgeBody,
    },
    {
      icon: TimerIcon,
      title: t.footer.goneTitle,
      body: t.footer.goneBody,
    },
    {
      icon: FlameIcon,
      title: t.footer.burnTitle,
      body: t.footer.burnBody,
    },
  ];

  return (
    <footer className="mt-16 space-y-8">
      <div className="space-y-6">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">{t.footer.tagline}</p>
    </footer>
  );
}

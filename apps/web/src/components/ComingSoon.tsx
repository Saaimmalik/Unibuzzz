import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-yellow/15 text-brand-orange">
        <Icon size={28} strokeWidth={2} />
      </div>
      <h1 className="text-xl font-bold text-brand-ink">{title}</h1>
      <p className="max-w-sm text-sm text-stone-500">{description}</p>
    </div>
  );
}

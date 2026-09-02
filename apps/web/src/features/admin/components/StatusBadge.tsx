const TONE_CLASSES: Record<"neutral" | "positive" | "warning" | "negative", string> = {
  neutral: "bg-stone-100 text-stone-600",
  positive: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  negative: "bg-red-50 text-red-600",
};

const STATUS_TONES: Record<string, keyof typeof TONE_CLASSES> = {
  active: "positive",
  visible: "positive",
  approved: "positive",
  resolved: "positive",
  student: "neutral",
  member: "neutral",
  pending: "warning",
  locked: "warning",
  suspended: "warning",
  hidden: "warning",
  dismissed: "neutral",
  moderator: "warning",
  admin: "negative",
  banned: "negative",
  removed: "negative",
  rejected: "negative",
  duplicate: "neutral",
  sold: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${TONE_CLASSES[tone]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

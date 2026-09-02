const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

export function Avatar({
  displayName,
  avatarUrl,
  size = "md",
}: {
  displayName: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const sizeClasses = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="" className={`${sizeClasses} shrink-0 rounded-full object-cover`} />
    );
  }

  return (
    <div
      className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full bg-brand-purple/10 font-bold text-brand-purple`}
    >
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

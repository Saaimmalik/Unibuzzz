import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
        {stars.map((n) => (
          <Star
            key={n}
            size={size}
            className={n <= Math.round(value) ? "text-brand-yellow" : "text-stone-200"}
            fill="currentColor"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            size={size + 8}
            className={n <= value ? "text-brand-yellow" : "text-stone-200"}
            fill="currentColor"
          />
        </button>
      ))}
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/job-types";
import { ratingStyleMap } from "@/lib/rating";

export function RatingPill({
  rating,
  size = "md",
  glow = false,
}: {
  rating: Rating;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}) {
  const sizes = {
    sm: "px-3 py-1 text-[10.5px] tracking-[0.18em]",
    md: "px-3.5 py-1.5 text-[11px] tracking-[0.18em]",
    lg: "px-5 py-2 text-[13px] tracking-[0.18em]",
    xl: "px-10 py-4 text-[26px] tracking-[0.22em]",
  } as const;
  const c = ratingStyleMap[rating];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold uppercase text-white",
        c.bg,
        c.glow,
        sizes[size],
        glow && "ring-4 " + c.ring,
      )}
    >
      {rating}
    </span>
  );
}

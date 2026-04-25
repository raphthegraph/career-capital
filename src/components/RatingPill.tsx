import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/job-types";

const map: Record<Rating, { bg: string; ring: string; text: string; glow: string }> = {
  BUY: {
    bg: "bg-buy",
    ring: "ring-buy/25",
    text: "text-buy",
    glow: "shadow-[0_10px_36px_-10px_hsl(var(--buy)/0.45)]",
  },
  HOLD: {
    bg: "bg-hold",
    ring: "ring-hold/25",
    text: "text-hold",
    glow: "shadow-[0_10px_36px_-10px_hsl(var(--hold)/0.45)]",
  },
  SELL: {
    bg: "bg-sell",
    ring: "ring-sell/25",
    text: "text-sell",
    glow: "shadow-[0_10px_36px_-10px_hsl(var(--sell)/0.45)]",
  },
  SHORT: {
    bg: "bg-short",
    ring: "ring-short/25",
    text: "text-short",
    glow: "shadow-[0_10px_36px_-10px_hsl(var(--short)/0.45)]",
  },
};

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
    sm: "px-3 py-1 text-[10.5px] tracking-[0.16em]",
    md: "px-3.5 py-1.5 text-[11px] tracking-[0.16em]",
    lg: "px-5 py-2 text-[13px] tracking-[0.16em]",
    xl: "px-9 py-4 text-[24px] tracking-[0.18em]",
  } as const;
  const c = map[rating];
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

export function ratingColorClass(rating: Rating) {
  return map[rating].text;
}

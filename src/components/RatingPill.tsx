import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/job-types";

const map: Record<Rating, { bg: string; ring: string; text: string }> = {
  BUY: { bg: "bg-buy", ring: "ring-buy/40", text: "text-buy" },
  HOLD: { bg: "bg-hold", ring: "ring-hold/40", text: "text-hold" },
  SELL: { bg: "bg-sell", ring: "ring-sell/40", text: "text-sell" },
  SHORT: { bg: "bg-short", ring: "ring-short/40", text: "text-short" },
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
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-5 py-2 text-base",
    xl: "px-8 py-4 text-3xl tracking-widest",
  } as const;
  const c = map[rating];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-bold uppercase text-background",
        c.bg,
        sizes[size],
        glow && "ring-4 " + c.ring
      )}
    >
      {rating}
    </span>
  );
}

export function ratingColorClass(rating: Rating) {
  return map[rating].text;
}

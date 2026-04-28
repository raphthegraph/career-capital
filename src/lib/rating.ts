import type { Rating } from "@/lib/job-types";

export const ratingStyleMap: Record<
  Rating,
  { bg: string; ring: string; text: string; glow: string }
> = {
  BUY: {
    bg: "bg-buy",
    ring: "ring-buy/20",
    text: "text-buy",
    glow: "shadow-[0_18px_48px_-18px_hsl(var(--buy)/0.55)]",
  },
  HOLD: {
    bg: "bg-hold",
    ring: "ring-hold/20",
    text: "text-hold",
    glow: "shadow-[0_18px_48px_-18px_hsl(var(--hold)/0.55)]",
  },
  SELL: {
    bg: "bg-sell",
    ring: "ring-sell/20",
    text: "text-sell",
    glow: "shadow-[0_18px_48px_-18px_hsl(var(--sell)/0.55)]",
  },
  SHORT: {
    bg: "bg-short",
    ring: "ring-short/20",
    text: "text-short",
    glow: "shadow-[0_18px_48px_-18px_hsl(var(--short)/0.55)]",
  },
};

export function ratingColorClass(rating: Rating) {
  return ratingStyleMap[rating].text;
}

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Analysis, QualitativeInsight } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { ArrowDown } from "lucide-react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  onContinue: () => void;
}

// 0 idle → 1 priced → 2 ticker → 3 rating → 4 question → 5 answer → 6 verdict → 7 signals → 8 cta
const TIMINGS = [350, 1200, 900, 1100, 950, 800, 950, 700];

const LEVEL_TONE: Record<string, { color: string; label: string }> = {
  strong: { color: "text-buy", label: "Positive" },
  rising: { color: "text-buy", label: "Positive" },
  low: { color: "text-buy", label: "Positive" },
  neutral: { color: "text-hold", label: "Neutral" },
  high: { color: "text-short", label: "Negative" },
  declining: { color: "text-short", label: "Negative" },
  blocked: { color: "text-short", label: "Negative" },
  weak: { color: "text-short", label: "Negative" },
  limited: { color: "text-hold", label: "Neutral" },
};

const FALLBACK_INSIGHTS: QualitativeInsight[] = [
  { label: "Promotion path", value: "Unclear", level: "neutral", detail: "No visible expansion in leadership roles for this seat." },
  { label: "Regulatory risk", value: "Elevated", level: "high", detail: "Sector pressure could slow product velocity." },
  { label: "Hiring momentum", value: "Slowing", level: "declining", detail: "Open roles down meaningfully vs trailing six months." },
  { label: "Learning upside", value: "Strong", level: "strong", detail: "Surface area still expanding inside your scope." },
  { label: "Exit opportunities", value: "Strong", level: "strong", detail: "Brand converts well to peer companies." },
];

export function VerdictReveal({ company, role, analysis, onContinue }: Props) {
  const [phase, setPhase] = useState(0);
  const [insightsRevealed, setInsightsRevealed] = useState(0);

  useEffect(() => {
    if (phase >= TIMINGS.length) return;
    const t = setTimeout(() => setPhase((p) => p + 1), TIMINGS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const insights = useMemo<QualitativeInsight[]>(
    () =>
      analysis.qualitativeInsights && analysis.qualitativeInsights.length >= 3
        ? analysis.qualitativeInsights.slice(0, 5)
        : FALLBACK_INSIGHTS,
    [analysis.qualitativeInsights],
  );

  useEffect(() => {
    if (phase < 7) return;
    if (insightsRevealed >= insights.length) return;
    const t = setTimeout(() => setInsightsRevealed((m) => m + 1), 380);
    return () => clearTimeout(t);
  }, [phase, insightsRevealed, insights.length]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="max-w-xl w-full text-center space-y-10 relative">
        {/* 1 */}
        {phase >= 1 && (
          <div className="animate-fade-in-up space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {company} · {role}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">
              Your job has been priced.
            </h2>
          </div>
        )}

        {/* 2 */}
        {phase >= 2 && (
          <div className="animate-fade-in space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Synthetic ticker
            </div>
            <div className="font-mono text-4xl md:text-5xl font-semibold tracking-wider">
              {analysis.ticker}
            </div>
          </div>
        )}

        {/* 3 */}
        {phase >= 3 && (
          <div className="flex justify-center pt-1 animate-scale-in">
            <RatingPill rating={analysis.rating} size="xl" />
          </div>
        )}

        {/* 4 */}
        {phase >= 4 && (
          <h2 className="font-display text-xl md:text-2xl font-medium animate-fade-in-up text-muted-foreground">
            Would you buy this job?
          </h2>
        )}

        {/* 5 */}
        {phase >= 5 && (
          <p
            className={`font-display text-4xl md:text-5xl font-semibold animate-scale-in ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
        )}

        {/* 6 */}
        {phase >= 6 && (
          <p className="text-base md:text-lg text-foreground/80 max-w-lg mx-auto italic animate-fade-in-up leading-relaxed">
            "{analysis.oneLineVerdict}"
          </p>
        )}

        {/* 7 — concrete signals */}
        {phase >= 7 && (
          <div className="space-y-2 max-w-lg mx-auto pt-4 text-left">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center mb-3">
              Key signals
            </div>
            {insights.map((ins, i) => {
              if (i >= insightsRevealed) return null;
              const tone = LEVEL_TONE[ins.level] ?? LEVEL_TONE.neutral;
              return (
                <div
                  key={ins.label}
                  className="flex items-start gap-3 py-2.5 border-b border-border/40 animate-fade-in-up"
                >
                  <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${tone.color.replace("text-", "bg-")}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {ins.label}
                    </div>
                    <div className="text-[14px] text-foreground/90 leading-snug">{ins.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 8 */}
        {phase >= 8 && insightsRevealed >= insights.length && (
          <div className="animate-fade-in-up pt-4">
            <Button
              onClick={onContinue}
              size="lg"
              variant="outline"
              className="gap-2 hover:border-foreground/40"
            >
              Continue <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

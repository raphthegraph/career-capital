import { useEffect, useMemo, useRef, useState } from "react";
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
const TIMINGS = [350, 1100, 850, 1000, 900, 800, 900, 700];

const LEVEL_TONE: Record<string, { dot: string; chip: string; label: string }> = {
  strong: { dot: "bg-buy", chip: "text-buy", label: "Positive" },
  rising: { dot: "bg-buy", chip: "text-buy", label: "Positive" },
  low: { dot: "bg-buy", chip: "text-buy", label: "Positive" },
  neutral: { dot: "bg-hold", chip: "text-hold", label: "Neutral" },
  high: { dot: "bg-short", chip: "text-short", label: "Negative" },
  declining: { dot: "bg-short", chip: "text-short", label: "Negative" },
  blocked: { dot: "bg-short", chip: "text-short", label: "Negative" },
  weak: { dot: "bg-short", chip: "text-short", label: "Negative" },
  limited: { dot: "bg-hold", chip: "text-hold", label: "Neutral" },
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
  const lastSignalRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

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
    const t = setTimeout(() => setInsightsRevealed((m) => m + 1), 650);
    return () => clearTimeout(t);
  }, [phase, insightsRevealed, insights.length]);

  // autoscroll as new signals appear
  useEffect(() => {
    if (insightsRevealed === 0) return;
    lastSignalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [insightsRevealed]);

  useEffect(() => {
    if (phase >= 8 && insightsRevealed >= insights.length) {
      ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [phase, insightsRevealed, insights.length]);

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-20">
      <div className="max-w-xl w-full text-center space-y-12">
        {/* 1 */}
        {phase >= 1 && (
          <div className="animate-fade-in-up space-y-3">
            <div className="text-xs text-muted-foreground">
              {company} · {role}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Your job has been priced.
            </h2>
          </div>
        )}

        {/* 2 */}
        {phase >= 2 && (
          <div className="animate-fade-in space-y-1.5">
            <div className="text-[11px] text-muted-foreground tracking-wide">Synthetic ticker</div>
            <div className="font-mono text-3xl md:text-4xl font-medium tracking-wider text-foreground/95">
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
          <h2 className="font-display text-xl md:text-2xl font-medium animate-fade-in-up text-muted-foreground tracking-tight">
            Would you buy this job?
          </h2>
        )}

        {/* 5 */}
        {phase >= 5 && (
          <p
            className={`font-display text-5xl md:text-6xl font-semibold animate-scale-in tracking-tight ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
        )}

        {/* 6 */}
        {phase >= 6 && (
          <p className="text-base md:text-lg text-foreground/75 max-w-lg mx-auto animate-fade-in-up leading-relaxed">
            {analysis.oneLineVerdict}
          </p>
        )}

        {/* 7 — concrete signals as elegant cards */}
        {phase >= 7 && (
          <div className="space-y-3 max-w-lg mx-auto pt-6 text-left">
            <div className="text-[11px] text-muted-foreground text-center mb-5 tracking-wide">
              Key signals
            </div>
            {insights.map((ins, i) => {
              if (i >= insightsRevealed) return null;
              const tone = LEVEL_TONE[ins.level] ?? LEVEL_TONE.neutral;
              const isLast = i === insightsRevealed - 1;
              return (
                <div
                  key={ins.label}
                  ref={isLast ? lastSignalRef : null}
                  className="surface rounded-2xl p-5 animate-fade-in-up"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
                      <div className="text-[13px] font-medium text-foreground">
                        {ins.label}
                      </div>
                    </div>
                    <span className={`text-[11px] ${tone.chip}`}>{tone.label}</span>
                  </div>
                  <p className="text-[14.5px] text-foreground/80 leading-relaxed pl-4">
                    {ins.detail}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 8 */}
        {phase >= 8 && insightsRevealed >= insights.length && (
          <div ref={ctaRef} className="animate-fade-in-up pt-6">
            <Button
              onClick={onContinue}
              size="lg"
              className="gap-2 h-12 px-7 rounded-xl bg-primary text-primary-foreground hover:opacity-95"
            >
              Continue <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

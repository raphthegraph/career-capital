import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Analysis, QualitativeInsight } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { ArrowDown } from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";

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

  useEffect(() => {
    if (insightsRevealed === 0) return;
    lastSignalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [insightsRevealed]);

  useEffect(() => {
    if (phase >= 8 && insightsRevealed >= insights.length) {
      ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [phase, insightsRevealed, insights.length]);

  // Grid focuses subtly when the rating is revealed, then relaxes
  const gridFocus = phase >= 3 && phase < 7;

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-24 relative">
      <SignalGrid focus={gridFocus} />

      <div className="relative z-10 max-w-xl w-full text-center space-y-14">
        {phase >= 1 && (
          <div className="animate-fade-in-up space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface text-[11px] text-muted-foreground tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-strong" />
              {company} · {role}
            </div>
            <h2 className="font-display text-[40px] md:text-[56px] font-[680] tracking-[-0.04em] leading-[1.02] text-foreground text-elegant">
              Your job has been priced.
            </h2>
          </div>
        )}

        {phase >= 2 && (
          <div className="animate-fade-in flex justify-center">
            <div className="surface rounded-2xl px-6 py-4 inline-flex flex-col items-center gap-1.5">
              <div className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.18em]">
                Synthetic ticker
              </div>
              <div className="font-mono text-[22px] md:text-[26px] font-medium tracking-[0.12em] text-foreground">
                {analysis.ticker}
              </div>
            </div>
          </div>
        )}

        {phase >= 3 && (
          <div className="flex justify-center pt-2 animate-scale-in">
            <RatingPill rating={analysis.rating} size="xl" />
          </div>
        )}

        {phase >= 4 && (
          <h2 className="font-display text-[20px] md:text-[24px] font-medium animate-fade-in-up text-muted-foreground tracking-tight">
            Would you buy this job?
          </h2>
        )}

        {phase >= 5 && (
          <p
            className={`font-display text-[64px] md:text-[80px] font-[680] animate-scale-in tracking-[-0.045em] leading-[0.95] ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
        )}

        {phase >= 6 && (
          <p className="text-[16px] md:text-[18px] text-foreground/80 max-w-[480px] mx-auto animate-fade-in-up leading-[1.55]">
            {analysis.oneLineVerdict}
          </p>
        )}

        {phase >= 7 && (
          <div className="space-y-3 max-w-lg mx-auto pt-8 text-left">
            <div className="text-[10px] text-muted-foreground text-center mb-6 tracking-[0.18em] uppercase">
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
                  className="surface-elevated rounded-[24px] p-6 md:p-7 animate-fade-in-up lift-on-hover"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                      <div className="text-[15px] font-semibold text-foreground tracking-tight">
                        {ins.label}
                      </div>
                    </div>
                    <span className={`text-[10.5px] uppercase tracking-[0.14em] font-semibold ${tone.chip}`}>
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-[15px] text-foreground/75 leading-[1.55] pl-[20px]">
                    {ins.detail}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {phase >= 8 && insightsRevealed >= insights.length && (
          <div ref={ctaRef} className="animate-fade-in-up pt-8">
            <Button
              onClick={onContinue}
              size="lg"
              className="gap-2 h-14 px-8 rounded-[16px] bg-primary text-primary-foreground hover:bg-primary-hover lift-on-hover glow-primary text-[15px] font-semibold"
            >
              Continue <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

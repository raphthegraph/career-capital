import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Analysis, QualitativeInsight } from "@/lib/job-types";
import { RatingPill } from "@/components/RatingPill";
import { ArrowDown } from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";
import { getRevealSignals } from "@/lib/analysis-helpers";
import { ratingColorClass } from "@/lib/rating";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  animationsEnabled: boolean;
  onReadyChange?: (ready: boolean) => void;
  onContinue: () => void;
}

// 0 idle → 1 priced → 2 ticker → 3 rating → 4 question → 5 answer → 6 verdict → 7 signals → 8 cta
const TIMINGS = [160, 360, 420, 420, 420, 520, 340, 220];

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

export function VerdictReveal({
  company,
  role,
  analysis,
  animationsEnabled,
  onReadyChange,
  onContinue,
}: Props) {
  const [phase, setPhase] = useState(0);
  const [insightsRevealed, setInsightsRevealed] = useState(0);
  const lastSignalRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const insights = useMemo<QualitativeInsight[]>(
    () => {
      const resolved = getRevealSignals(analysis);
      return resolved.length >= 3 ? resolved.slice(0, 5) : FALLBACK_INSIGHTS;
    },
    [analysis],
  );

  useEffect(() => {
    if (!animationsEnabled) {
      setPhase(TIMINGS.length);
      setInsightsRevealed(insights.length);
      return;
    }
    if (phase >= TIMINGS.length) return;
    const t = setTimeout(() => setPhase((p) => p + 1), TIMINGS[phase]);
    return () => clearTimeout(t);
  }, [phase, animationsEnabled, insights.length]);

  // Slower, more deliberate signal reveal — let user actually read each one
  useEffect(() => {
    if (!animationsEnabled) {
      setInsightsRevealed(insights.length);
      return;
    }
    if (phase < 7) return;
    if (insightsRevealed >= insights.length) return;
    const t = setTimeout(() => setInsightsRevealed((m) => m + 1), 620);
    return () => clearTimeout(t);
  }, [phase, insightsRevealed, insights.length, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (insightsRevealed === 0) return;
    lastSignalRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [insightsRevealed, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (phase >= 8 && insightsRevealed >= insights.length) {
      ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [phase, insightsRevealed, insights.length, animationsEnabled]);

  const gridFocus = phase >= 3 && phase < 7;
  const ctaReady = phase >= 8 && insightsRevealed >= insights.length;

  useEffect(() => {
    onReadyChange?.(ctaReady);
  }, [ctaReady, onReadyChange]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 sm:px-6 md:py-14 relative">
      <SignalGrid variant="reveal" focus={gridFocus} intensity={gridFocus ? "focus" : "active"} />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] space-y-10">
        <section className="grid items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-5 text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground shadow-soft backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {company} · {role}
            </div>
            {phase >= 1 && (
              <h2 className="font-display text-[38px] font-[720] leading-[1.04] text-foreground text-elegant sm:text-[54px] lg:text-[64px]">
                Your job has been priced.
              </h2>
            )}
            {phase >= 6 && (
              <p className="max-w-[560px] animate-fade-in-up text-[16px] leading-[1.65] text-foreground/80 md:text-[18px]">
                {analysis.oneLineVerdict}
              </p>
            )}
          </div>

          <div className="relative">
            <div className="terminal-verdict-card animate-scale-in p-5 pl-6 sm:p-6 sm:pl-7 md:p-7 md:pl-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">Synthetic ticker</div>
                {phase >= 2 && (
                  <div className="mt-2 font-mono text-[30px] font-semibold tracking-[0.08em] text-primary-strong sm:text-[40px]">
                    {analysis.ticker}
                  </div>
                )}
              </div>
              <div className="rounded-full bg-primary-tint/75 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-strong">
                priced
              </div>
            </div>

            <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
              {phase >= 3 && <RatingPill rating={analysis.rating} size="xl" glow />}
              <div className="text-left sm:text-right">
                {phase >= 4 && (
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Would you buy?
                  </div>
                )}
                {phase >= 5 && (
                  <div
                    className={`mt-1 font-display text-[52px] font-[760] leading-none sm:text-[72px] ${ratingColorClass(
                      analysis.rating,
                    )}`}
                  >
                    {analysis.wouldBuy}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] border border-border/[0.035] bg-white/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Score</div>
                <div className="mt-1 text-[24px] font-semibold text-foreground">{analysis.careerAssetScore}</div>
              </div>
              <div className="rounded-[24px] border border-border/[0.035] bg-white/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Confidence</div>
                <div className="mt-1 text-[24px] font-semibold text-foreground">{analysis.confidence}</div>
              </div>
              <div className="rounded-[24px] border border-border/[0.035] bg-white/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Signal</div>
                <div className="mt-1 text-[24px] font-semibold text-foreground">{analysis.rating}</div>
              </div>
            </div>
          </div>
          </div>
        </section>

        {phase >= 7 && (
          <section className="space-y-4 pt-2 text-left">
            <div className="eyebrow">Key signals</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insights.map((ins, i) => {
              if (i >= insightsRevealed) return null;
              const tone = LEVEL_TONE[ins.level] ?? LEVEL_TONE.neutral;
              const isLast = i === insightsRevealed - 1;
              return (
                <div
                  key={ins.label}
                  ref={isLast ? lastSignalRef : null}
                    className="air-card animate-fade-in-up p-5 lift-on-hover"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                        <div className="text-[15px] font-semibold text-foreground">
                        {ins.label}
                      </div>
                    </div>
                    <span className={`text-[10.5px] uppercase tracking-[0.16em] font-semibold ${tone.chip}`}>
                      {tone.label}
                    </span>
                  </div>
                    <p className="text-[14.5px] leading-[1.6] text-foreground/75">
                    {ins.detail}
                  </p>
                </div>
              );
            })}
          </div>
          </section>
        )}

        {ctaReady && (
          <div ref={ctaRef} className="animate-fade-in-up pt-2 text-center">
            <Button
              onClick={onContinue}
              size="lg"
              className="gap-2 h-[52px] py-3.5 px-8 rounded-[24px] bg-primary text-primary-foreground hover:bg-primary-hover lift-on-hover glow-primary text-[15px] font-semibold"
            >
              Continue <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

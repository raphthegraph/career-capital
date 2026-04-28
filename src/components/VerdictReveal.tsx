import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/lib/job-types";
import { ArrowDown } from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";
import { getRevealSignals, type RevealSignal } from "@/lib/analysis-helpers";
import { ratingColorClass } from "@/lib/rating";
import { SourceChips } from "@/components/SourceChips";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  animationsEnabled: boolean;
  onReadyChange?: (ready: boolean) => void;
  onContinue: () => void;
}

// 0 idle → 1 title → 2 subtitle → 3 ticker → 4 question → 5 answer → 6 metrics → 7 signals → 8 cta
const TIMINGS = [260, 760, 760, 620, 640, 720, 700, 520];

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

const FALLBACK_INSIGHTS: RevealSignal[] = [
  { label: "Promotion path", value: "Unclear", level: "neutral", detail: "No visible expansion in leadership roles for this seat.", sourceUrls: [] },
  { label: "Regulatory risk", value: "Elevated", level: "high", detail: "Sector pressure could slow product velocity.", sourceUrls: [] },
  { label: "Hiring momentum", value: "Slowing", level: "declining", detail: "Open roles down meaningfully vs trailing six months.", sourceUrls: [] },
  { label: "Learning upside", value: "Strong", level: "strong", detail: "Surface area still expanding inside your scope.", sourceUrls: [] },
  { label: "Exit opportunities", value: "Strong", level: "strong", detail: "Brand converts well to peer companies.", sourceUrls: [] },
];

function scrollNearestIfNeeded(element: HTMLElement | null) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const viewportBottom = window.innerHeight - 112;
  if (rect.bottom > viewportBottom || rect.top < 84) {
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function getVerdictSubtitle(company: string, role: string, verdict: string) {
  const normalized = verdict.toLowerCase();
  if (normalized.includes(company.toLowerCase()) || normalized.includes(role.toLowerCase())) {
    return verdict;
  }
  return `As a ${role} at ${company}, ${verdict.replace(/^[A-Z]/, (letter) => letter.toLowerCase())}`;
}

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
  const signalsRef = useRef<HTMLElement>(null);
  const lastSignalRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const insights = useMemo<RevealSignal[]>(
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
    const t = setTimeout(() => setInsightsRevealed((m) => m + 1), 780);
    return () => clearTimeout(t);
  }, [phase, insightsRevealed, insights.length, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (phase < 7) return;
    const t = setTimeout(() => {
      signalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 360);
    return () => clearTimeout(t);
  }, [phase, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (phase >= 8 && insightsRevealed >= insights.length) {
      scrollNearestIfNeeded(ctaRef.current);
    }
  }, [phase, insightsRevealed, insights.length, animationsEnabled]);

  const gridFocus = phase >= 3 && phase < 7;
  const ctaReady = phase >= 8 && insightsRevealed >= insights.length;
  const qualityLabel =
    analysis.researchQuality === "live"
      ? "Live research"
      : analysis.researchQuality === "limited"
        ? "Limited evidence"
        : "Fallback mode";
  const emptySourceLabel = analysis.researchQuality === "live" ? "AI inference" : "Limited evidence";
  const subtitle = getVerdictSubtitle(company, role, analysis.oneLineVerdict);

  useEffect(() => {
    onReadyChange?.(ctaReady);
  }, [ctaReady, onReadyChange]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 sm:px-6 md:py-14 relative">
      <SignalGrid variant="reveal" focus={gridFocus} intensity={gridFocus ? "focus" : "active"} />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] space-y-10">
        <section className="mx-auto max-w-[820px] space-y-7 text-center">
          <div className="space-y-5">
            {phase >= 1 && (
              <h2 className="animate-pop-in font-display text-[44px] font-[760] leading-[1.02] text-foreground text-elegant sm:text-[64px] lg:text-[76px]">
                Your job has been priced.
              </h2>
            )}
            {phase >= 2 && (
              <p className="mx-auto max-w-[620px] animate-fade-in-up text-[16px] leading-[1.65] text-foreground/80 md:text-[18px]">
                {subtitle}
              </p>
            )}
            {phase >= 2 && (
              <div className="mx-auto inline-flex animate-fade-in-up rounded-full border border-border/[0.035] bg-white/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-soft backdrop-blur-xl">
                {qualityLabel}
              </div>
            )}
          </div>

          {phase >= 3 && (
            <div className="mx-auto max-w-[360px] animate-scale-in rounded-[32px] border border-primary/10 bg-white/45 px-6 py-5 shadow-soft backdrop-blur-2xl">
              <div className="eyebrow">Synthetic ticker</div>
              <div className="mt-2 font-mono text-[34px] font-semibold tracking-[0.08em] text-primary-strong sm:text-[44px]">
                {analysis.ticker}
              </div>
            </div>
          )}

          <div className="min-h-[160px] space-y-4">
            {phase >= 4 && (
              <div className="animate-fade-in-up text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Would you buy?
              </div>
            )}
            {phase >= 5 && (
              <div
                className={`animate-pop-in font-display text-[64px] font-[760] leading-none sm:text-[86px] ${ratingColorClass(
                  analysis.rating,
                )}`}
              >
                {analysis.wouldBuy}
              </div>
            )}

            {phase >= 6 && (
              <div className="mx-auto grid max-w-[680px] grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
                <div className="animate-fade-in-up rounded-[28px] border border-border/[0.035] bg-white/42 p-4 shadow-soft backdrop-blur-2xl">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Score</div>
                  <div className="mt-1 text-[25px] font-semibold text-foreground">{analysis.careerAssetScore}</div>
                </div>
                <div className="animate-fade-in-up rounded-[28px] border border-border/[0.035] bg-white/42 p-4 shadow-soft backdrop-blur-2xl [animation-delay:90ms]">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Confidence</div>
                  <div className="mt-1 text-[25px] font-semibold text-foreground">{analysis.confidence}%</div>
                </div>
                <div className="animate-fade-in-up rounded-[28px] border border-border/[0.035] bg-white/42 p-4 shadow-soft backdrop-blur-2xl [animation-delay:180ms]">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Signal</div>
                  <div className={`mt-1 text-[25px] font-semibold ${ratingColorClass(analysis.rating)}`}>
                    {analysis.rating}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {phase >= 7 && (
          <section ref={signalsRef} className="scroll-mt-24 space-y-4 pt-2 text-left">
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
                  {ins.confidenceReason && (
                    <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                      {ins.confidenceReason}
                    </p>
                  )}
                  <div className="mt-4">
                    <SourceChips
                      urls={ins.sourceUrls}
                      sources={analysis.sources ?? []}
                      compact
                      emptyLabel={emptySourceLabel}
                    />
                  </div>
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

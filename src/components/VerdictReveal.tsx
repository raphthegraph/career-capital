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

// Staged reveal sequence with intentional pauses.
// 0: nothing
// 1: "Your job has been priced."
// 2: ticker
// 3: rating pill
// 4: "Would you buy this job?"
// 5: yes/no answer
// 6: explanation
// 7: insights one-by-one
// 8: continue
const TIMINGS = [400, 1500, 1000, 1200, 1100, 800, 1000, 700];

const LEVEL_TONE: Record<string, { color: string; label: string }> = {
  strong: { color: "text-buy border-buy/50", label: "STRONG" },
  rising: { color: "text-buy border-buy/50", label: "RISING" },
  low: { color: "text-buy border-buy/50", label: "LOW" },
  neutral: { color: "text-hold border-hold/50", label: "NEUTRAL" },
  high: { color: "text-short border-short/50", label: "HIGH" },
  declining: { color: "text-short border-short/50", label: "DECLINING" },
  blocked: { color: "text-short border-short/50", label: "BLOCKED" },
  weak: { color: "text-short border-short/50", label: "WEAK" },
  limited: { color: "text-hold border-hold/50", label: "LIMITED" },
};

const FALLBACK_INSIGHTS: QualitativeInsight[] = [
  { label: "Promotion path", value: "Contested", level: "neutral", detail: "Senior bench is crowded; visible wins required." },
  { label: "Regulatory risk", value: "Moderate", level: "neutral", detail: "Sector scrutiny rising but no acute exposure." },
  { label: "Hiring momentum", value: "Slowing", level: "declining", detail: "Open roles down vs trailing six months." },
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
    [analysis.qualitativeInsights]
  );

  useEffect(() => {
    if (phase < 7) return;
    if (insightsRevealed >= insights.length) return;
    const t = setTimeout(() => setInsightsRevealed((m) => m + 1), 420);
    return () => clearTimeout(t);
  }, [phase, insightsRevealed, insights.length]);

  // Glow color tied to verdict
  const glow =
    analysis.rating === "BUY"
      ? "hsl(var(--buy) / 0.35)"
      : analysis.rating === "HOLD"
      ? "hsl(var(--hold) / 0.30)"
      : analysis.rating === "SELL"
      ? "hsl(var(--sell) / 0.30)"
      : "hsl(var(--short) / 0.35)";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 terminal-grid relative overflow-hidden">
      {/* verdict glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, ${glow} 0%, transparent 60%)`,
          opacity: phase >= 3 ? 1 : 0,
        }}
      />

      <div className="max-w-3xl w-full text-center space-y-8 relative">
        {/* 1 */}
        {phase >= 1 && (
          <div className="animate-fade-in-up space-y-2">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {company} / {role}
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold">
              Your job has been priced.
            </h2>
          </div>
        )}

        {/* 2 */}
        {phase >= 2 && (
          <div className="animate-fade-in space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Synthetic Ticker
            </div>
            <div className="font-mono text-5xl md:text-7xl font-bold tracking-wider">
              {analysis.ticker}
            </div>
          </div>
        )}

        {/* 3 */}
        {phase >= 3 && (
          <div className="flex justify-center pt-2">
            <div className="animate-scale-in" style={{ animation: "scale-in 0.6s var(--transition-smooth), price-pulse 2.4s ease-in-out infinite 0.6s" }}>
              <RatingPill rating={analysis.rating} size="xl" glow />
            </div>
          </div>
        )}

        {/* 4 */}
        {phase >= 4 && (
          <h2 className="font-display text-2xl md:text-3xl font-bold animate-fade-in-up pt-2">
            Would you buy this job?
          </h2>
        )}

        {/* 5 */}
        {phase >= 5 && (
          <p
            className={`font-display text-4xl md:text-6xl font-bold animate-scale-in ${ratingColorClass(
              analysis.rating
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
        )}

        {/* 6 */}
        {phase >= 6 && (
          <p className="text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto italic animate-fade-in-up">
            "{analysis.oneLineVerdict}"
          </p>
        )}

        {/* 7 — qualitative insights */}
        {phase >= 7 && (
          <div className="space-y-2 max-w-2xl mx-auto pt-4 text-left">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-3">
              Verdict signals
            </div>
            {insights.map((ins, i) => {
              if (i >= insightsRevealed) return null;
              const tone = LEVEL_TONE[ins.level] ?? LEVEL_TONE.neutral;
              return (
                <div
                  key={ins.label}
                  className={`flex items-center justify-between gap-4 p-3 rounded border bg-background/40 backdrop-blur-sm animate-slide-in-right ${tone.color}`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {ins.label}
                    </div>
                    <div className="text-sm text-foreground/90 truncate">{ins.detail}</div>
                  </div>
                  <span className={`font-mono text-xs font-bold tracking-wider whitespace-nowrap`}>
                    {ins.value.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 8 */}
        {phase >= 8 && insightsRevealed >= insights.length && (
          <div className="animate-fade-in-up pt-6">
            <Button
              onClick={onContinue}
              size="lg"
              variant="outline"
              className="gap-2 font-mono hover:border-primary/60 hover:text-primary transition-all"
            >
              Open full analysis <ArrowDown className="w-4 h-4 animate-bounce" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

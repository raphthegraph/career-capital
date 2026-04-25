import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/lib/job-types";
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
// 6: explanation (oneLineVerdict)
// 7: metrics one-by-one (handled below)
// 8: continue button
const TIMINGS = [350, 1300, 900, 1100, 1100, 700, 900, 600];

export function VerdictReveal({ company, role, analysis, onContinue }: Props) {
  const [phase, setPhase] = useState(0);
  const [metricsRevealed, setMetricsRevealed] = useState(0);

  useEffect(() => {
    if (phase >= TIMINGS.length) return;
    const t = setTimeout(() => setPhase((p) => p + 1), TIMINGS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  // Reveal metrics one-by-one once phase >= 7
  useEffect(() => {
    if (phase < 7) return;
    if (metricsRevealed >= 5) return;
    const t = setTimeout(() => setMetricsRevealed((m) => m + 1), 320);
    return () => clearTimeout(t);
  }, [phase, metricsRevealed]);

  const metrics = [
    { label: "Confidence", value: `${analysis.confidence}%` },
    { label: "Asset Score", value: analysis.careerAssetScore.toFixed(0) },
    { label: "Dividend", value: analysis.dimensions.careerDividend.score.toFixed(0) },
    { label: "Volatility", value: analysis.dimensions.volatility.score.toFixed(0) },
    { label: "Liquidity", value: analysis.dimensions.exitLiquidity.score.toFixed(0) },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 terminal-grid relative">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* 1: priced */}
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

        {/* 2: ticker */}
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

        {/* 3: rating */}
        {phase >= 3 && (
          <div className="animate-scale-in flex justify-center pt-2">
            <RatingPill rating={analysis.rating} size="xl" glow />
          </div>
        )}

        {/* 4: question */}
        {phase >= 4 && (
          <h2 className="font-display text-2xl md:text-3xl font-bold animate-fade-in-up pt-2">
            Would you buy this job?
          </h2>
        )}

        {/* 5: answer */}
        {phase >= 5 && (
          <p className={`font-display text-4xl md:text-6xl font-bold animate-scale-in ${ratingColorClass(analysis.rating)}`}>
            {analysis.wouldBuy}.
          </p>
        )}

        {/* 6: explanation */}
        {phase >= 6 && (
          <p className="text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto italic animate-fade-in-up">
            "{analysis.oneLineVerdict}"
          </p>
        )}

        {/* 7: metrics one-by-one */}
        {phase >= 7 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto pt-4">
            {metrics.map((m, i) =>
              i < metricsRevealed ? (
                <div key={m.label} className="card-terminal rounded p-3 animate-scale-in">
                  <div className="font-mono text-2xl font-bold">{m.value}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                </div>
              ) : (
                <div key={m.label} className="rounded p-3 border border-dashed border-border/50 opacity-30">
                  <div className="font-mono text-2xl font-bold text-muted-foreground">··</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* 8: continue */}
        {phase >= 8 && metricsRevealed >= 5 && (
          <div className="animate-fade-in-up pt-4">
            <Button onClick={onContinue} size="lg" variant="outline" className="gap-2 font-mono">
              Open full analysis <ArrowDown className="w-4 h-4 animate-bounce" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

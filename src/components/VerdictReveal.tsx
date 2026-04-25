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

export function VerdictReveal({ company, role, analysis, onContinue }: Props) {
  const [phase, setPhase] = useState(0); // 0: dim, 1: ticker, 2: rating, 3: details
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 terminal-grid relative">
      <div className="max-w-3xl w-full text-center space-y-8">
        {phase >= 1 && (
          <div className="animate-fade-in space-y-2">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Synthetic Ticker · {company} / {role}
            </div>
            <div className="font-mono text-5xl md:text-7xl font-bold tracking-wider">
              {analysis.ticker}
            </div>
          </div>
        )}

        {phase >= 2 && (
          <div className="animate-scale-in space-y-4">
            <div className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Asset Rating
            </div>
            <div className="flex justify-center">
              <RatingPill rating={analysis.rating} size="xl" glow />
            </div>
          </div>
        )}

        {phase >= 3 && (
          <div className="animate-fade-in-up space-y-6 pt-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Would you buy this job?
            </h2>
            <p className={`font-display text-3xl md:text-4xl font-bold ${ratingColorClass(analysis.rating)}`}>
              {analysis.wouldBuy}.
            </p>
            <p className="text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto italic">
              "{analysis.oneLineVerdict}"
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto pt-4">
              <Stat label="Confidence" value={`${analysis.confidence}%`} />
              <Stat label="Asset Score" value={analysis.careerAssetScore.toFixed(0)} />
              <Stat label="Dividend" value={analysis.dimensions.careerDividend.score.toFixed(0)} />
              <Stat label="Volatility" value={analysis.dimensions.volatility.score.toFixed(0)} />
              <Stat label="Liquidity" value={analysis.dimensions.exitLiquidity.score.toFixed(0)} />
            </div>

            <Button onClick={onContinue} size="lg" variant="outline" className="mt-8 gap-2 font-mono">
              Open full analysis <ArrowDown className="w-4 h-4 animate-bounce" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-terminal rounded p-3">
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

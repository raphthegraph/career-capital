import { useEffect, useState } from "react";

const STEPS = [
  { label: "Scanning company signals", insight: "12 recent signals found" },
  { label: "Reading recent news", insight: "Press cycle: positive trend" },
  { label: "Analyzing hiring momentum", insight: "Hiring momentum: moderate" },
  { label: "Detecting volatility signals", insight: "Volatility risk detected" },
  { label: "Estimating career dividend", insight: "Yield band: above median" },
  { label: "Calculating upside optionality", insight: "Career upside: attractive but conditional" },
  { label: "Building synthetic job asset", insight: "Synthetic asset constructed" },
  { label: "Generating investment verdict", insight: "Verdict ready" },
];

interface Props {
  company: string;
  role: string;
  done: boolean;
  onComplete: () => void;
}

export function AnalysisRunner({ company, role, done, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [revealedInsights, setRevealed] = useState<number[]>([]);

  useEffect(() => {
    if (step >= STEPS.length) return;
    // Hold the last step until network completes; pace the rest.
    const isLast = step === STEPS.length - 1;
    if (isLast && !done) return;
    const t = setTimeout(() => {
      setRevealed((p) => [...p, step]);
      setStep((s) => s + 1);
    }, isLast ? 600 : 700);
    return () => clearTimeout(t);
  }, [step, done]);

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(onComplete, 700);
      return () => clearTimeout(t);
    }
  }, [step, onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative terminal-grid">
      <div className="card-terminal rounded-lg max-w-2xl w-full p-8 relative overflow-hidden scan-line">
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            $JOB · ASSET CONSTRUCTION
          </div>
          <span className="font-mono text-xs text-primary blink">● LIVE</span>
        </div>

        <h2 className="font-display text-2xl font-bold mb-1">
          Pricing <span className="text-primary">{role}</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-8 font-mono">
          @ {company} · synthesizing real-world signals
        </p>

        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <li key={s.label} className="font-mono text-sm flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="w-5 pt-0.5 shrink-0">
                  {state === "done" && <span className="text-buy">✓</span>}
                  {state === "active" && <span className="text-primary blink">▶</span>}
                  {state === "pending" && <span className="text-muted-foreground">·</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={state === "pending" ? "text-muted-foreground" : "text-foreground"}>
                    {s.label}
                    {state === "active" && <span className="ml-1 text-primary blink">_</span>}
                  </div>
                  {revealedInsights.includes(i) && (
                    <div className="text-xs text-primary/80 mt-1 animate-slide-in-right">
                      → {s.insight}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 h-1 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-buy transition-all duration-500"
            style={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";

type Phase = {
  key: string;
  title: string;
  subtitle: string;
  steps: { label: string; insight: string }[];
};

const PHASES: Phase[] = [
  {
    key: "collect",
    title: "Phase 1 · Data Collection",
    subtitle: "Pulling real-world signals from the market",
    steps: [
      { label: "Scanning company signals", insight: "Found 12 recent signals" },
      { label: "Reading press cycle", insight: "Product expansion identified" },
      { label: "Indexing hiring activity", insight: "Hiring slowdown observed" },
      { label: "Mapping risk surface", insight: "Regulatory risk detected" },
    ],
  },
  {
    key: "interpret",
    title: "Phase 2 · Signal Interpretation",
    subtitle: "Weighing what the signals actually mean",
    steps: [
      { label: "Weighting volatility vs upside", insight: "Volatility band: elevated" },
      { label: "Estimating career dividend", insight: "Yield: above sector median" },
      { label: "Comparing career yield vs alternatives", insight: "Top quartile vs peers" },
    ],
  },
  {
    key: "decide",
    title: "Phase 3 · Decision Formation",
    subtitle: "AI is forming a verdict on this asset",
    steps: [
      { label: "Calculating expected career return", insight: "Risk-adjusted return modeled" },
      { label: "Constructing synthetic ticker", insight: "Asset constructed" },
      { label: "Generating investment verdict", insight: "Verdict ready" },
    ],
  },
];

const FLAT = PHASES.flatMap((p, pi) => p.steps.map((s, si) => ({ ...s, phaseIdx: pi, stepIdx: si })));

interface Props {
  company: string;
  role: string;
  done: boolean;
  onComplete: () => void;
}

export function AnalysisRunner({ company, role, done, onComplete }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= FLAT.length) return;
    const isLast = step === FLAT.length - 1;
    if (isLast && !done) return;
    // Slightly slower pacing + a beat between phases
    const cur = FLAT[step];
    const next = FLAT[step + 1];
    const phaseChange = next && next.phaseIdx !== cur.phaseIdx;
    const delay = isLast ? 700 : phaseChange ? 950 : 620;
    const t = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [step, done]);

  useEffect(() => {
    if (step >= FLAT.length) {
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
  }, [step, onComplete]);

  const activePhase = step >= FLAT.length ? PHASES.length - 1 : FLAT[step].phaseIdx;
  const progress = (Math.min(step, FLAT.length) / FLAT.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative terminal-grid">
      <div className="card-terminal rounded-lg max-w-2xl w-full p-8 relative overflow-hidden scan-line">
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            $JOB · ASSET CONSTRUCTION
          </div>
          <span className="font-mono text-xs text-primary blink">● THINKING</span>
        </div>

        <h2 className="font-display text-2xl font-bold mb-1">
          Pricing <span className="text-primary">{role}</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-6 font-mono">
          @ {company}
        </p>

        {/* Phase indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {PHASES.map((p, i) => (
            <div key={p.key} className="space-y-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i < activePhase ? "bg-buy" : i === activePhase ? "bg-primary blink" : "bg-muted"
                }`}
              />
              <div
                className={`font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  i <= activePhase ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {p.title.split("·")[1]?.trim() ?? p.title}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="font-mono text-xs text-primary">
            {PHASES[activePhase].title}
          </div>
          <div className="text-xs text-muted-foreground">{PHASES[activePhase].subtitle}</div>
        </div>

        <ol className="space-y-2.5 min-h-[260px]">
          {FLAT.map((s, i) => {
            if (i > step) return null;
            const state = i < step ? "done" : "active";
            return (
              <li
                key={`${s.phaseIdx}-${s.stepIdx}`}
                className="font-mono text-sm flex items-start gap-3 animate-fade-in-up"
              >
                <span className="w-5 pt-0.5 shrink-0">
                  {state === "done" ? (
                    <span className="text-buy">✓</span>
                  ) : (
                    <span className="text-primary blink">▶</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={state === "done" ? "text-foreground/80" : "text-foreground"}>
                    {s.label}
                    {state === "active" && <span className="ml-1 text-primary blink">_</span>}
                  </div>
                  {state === "done" && (
                    <div className="text-xs text-primary/80 mt-0.5 animate-slide-in-right">
                      → {s.insight}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 h-1 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-buy transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

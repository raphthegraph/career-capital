import { useEffect, useState } from "react";

type Phase = {
  key: string;
  title: string;
  subtitle: string;
  steps: { label: string; signal: string; tone: "buy" | "short" | "hold" | "primary" }[];
};

const PHASES: Phase[] = [
  {
    key: "collect",
    title: "Data Collection",
    subtitle: "Pulling real-world signals across the market",
    steps: [
      { label: "Scanning company signals", signal: "Product expansion identified", tone: "buy" },
      { label: "Reading press cycle", signal: "Funding round indexed", tone: "buy" },
      { label: "Indexing hiring activity", signal: "Hiring slowdown observed", tone: "short" },
      { label: "Mapping risk surface", signal: "Regulatory risk detected", tone: "short" },
    ],
  },
  {
    key: "interpret",
    title: "Signal Interpretation",
    subtitle: "Weighing what these signals actually mean",
    steps: [
      { label: "Modeling volatility band", signal: "Volatility: elevated but contained", tone: "hold" },
      { label: "Estimating career dividend", signal: "Yield above sector median", tone: "buy" },
      { label: "Comparing vs alternatives", signal: "Top quartile vs peers", tone: "buy" },
    ],
  },
  {
    key: "decide",
    title: "Decision Formation",
    subtitle: "AI is forming a verdict on this asset",
    steps: [
      { label: "Calculating risk-adjusted return", signal: "Expected return modeled", tone: "primary" },
      { label: "Constructing synthetic ticker", signal: "Asset constructed", tone: "primary" },
      { label: "Generating investment verdict", signal: "Verdict ready", tone: "primary" },
    ],
  },
];

const FLAT = PHASES.flatMap((p, pi) => p.steps.map((s, si) => ({ ...s, phaseIdx: pi, stepIdx: si })));

const toneClass: Record<string, string> = {
  buy: "text-buy border-buy/40",
  short: "text-short border-short/40",
  hold: "text-hold border-hold/40",
  primary: "text-primary border-primary/40",
};

interface Props {
  company: string;
  role: string;
  done: boolean;
  onComplete: () => void;
}

export function AnalysisRunner({ company, role, done, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");

  // Type-out the active step label
  useEffect(() => {
    if (step >= FLAT.length) return;
    const target = FLAT[step].label;
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [step]);

  // Advance steps with intentional pacing + extra beat between phases
  useEffect(() => {
    if (step >= FLAT.length) return;
    const isLast = step === FLAT.length - 1;
    if (isLast && !done) return;
    const cur = FLAT[step];
    const next = FLAT[step + 1];
    const phaseChange = next && next.phaseIdx !== cur.phaseIdx;
    const delay = isLast ? 750 : phaseChange ? 1100 : 760;
    const t = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [step, done]);

  useEffect(() => {
    if (step >= FLAT.length) {
      const t = setTimeout(onComplete, 950);
      return () => clearTimeout(t);
    }
  }, [step, onComplete]);

  const activePhase = step >= FLAT.length ? PHASES.length - 1 : FLAT[step].phaseIdx;
  const progress = (Math.min(step, FLAT.length) / FLAT.length) * 100;

  // Live feed = completed signals (newest first), max 6
  const feed = FLAT.slice(0, step).slice(-6).reverse();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative terminal-grid">
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[40rem] h-[40rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 max-w-5xl w-full relative">
        {/* LEFT — reasoning terminal */}
        <div className="card-terminal rounded-lg p-8 relative overflow-hidden scan-line">
          <div className="flex items-center justify-between mb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              $JOB · ASSET CONSTRUCTION
            </div>
            <span className="font-mono text-xs text-primary blink">● THINKING</span>
          </div>

          <h2 className="font-display text-2xl font-bold mb-1">
            Pricing <span className="text-primary">{role}</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-6 font-mono">@ {company}</p>

          {/* Phase pills */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {PHASES.map((p, i) => (
              <div key={p.key} className="space-y-1.5">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i < activePhase
                      ? "bg-buy"
                      : i === activePhase
                      ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                      : "bg-muted"
                  }`}
                />
                <div
                  className={`font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    i <= activePhase ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {`Phase ${i + 1} · ${p.title}`}
                </div>
              </div>
            ))}
          </div>

          {/* Active phase header — animates between phases */}
          <div key={activePhase} className="mb-4 animate-fade-in">
            <div className="font-mono text-xs text-primary">{PHASES[activePhase].title}</div>
            <div className="text-xs text-muted-foreground">{PHASES[activePhase].subtitle}</div>
          </div>

          {/* Step list with typing on active */}
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
                    <div className={state === "done" ? "text-foreground/70" : "text-foreground"}>
                      {state === "active" ? (
                        <>
                          {typed}
                          <span className="ml-0.5 text-primary blink">_</span>
                        </>
                      ) : (
                        s.label
                      )}
                    </div>
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

        {/* RIGHT — live signal feed */}
        <div className="card-terminal rounded-lg p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Live Signals
            </div>
            <span className="font-mono text-[10px] text-buy blink">● STREAMING</span>
          </div>

          {feed.length === 0 ? (
            <div className="font-mono text-xs text-muted-foreground italic py-8 text-center">
              waiting for first signal…
            </div>
          ) : (
            <ul className="space-y-2">
              {feed.map((s, i) => (
                <li
                  key={`${s.phaseIdx}-${s.stepIdx}-${i}`}
                  className={`font-mono text-xs px-3 py-2 rounded border bg-background/40 ${toneClass[s.tone]} animate-slide-in-right`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  + {s.signal}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 pt-4 border-t border-border font-mono text-[10px] text-muted-foreground space-y-1">
            <div>SOURCE · public web · hiring boards · press</div>
            <div>MODEL · $JOB asset engine v1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}

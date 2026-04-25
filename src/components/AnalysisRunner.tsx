import { useEffect, useState } from "react";

interface Phase {
  key: string;
  title: string;
  steps: string[];
}

const PHASES: Phase[] = [
  {
    key: "collect",
    title: "Collecting signals",
    steps: [
      "Searching company news",
      "Reading hiring signals",
      "Checking risk indicators",
    ],
  },
  {
    key: "interpret",
    title: "Interpreting career asset",
    steps: [
      "Estimating learning yield",
      "Evaluating promotion upside",
      "Measuring volatility",
    ],
  },
  {
    key: "decide",
    title: "Forming recommendation",
    steps: [
      "Comparing stay vs leave scenarios",
      "Generating asset rating",
      "Preparing next-step questions",
    ],
  },
];

const FLAT = PHASES.flatMap((p, pi) =>
  p.steps.map((s, si) => ({ label: s, phaseIdx: pi, stepIdx: si })),
);

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
    const t = setTimeout(() => setStep((s) => s + 1), 850);
    return () => clearTimeout(t);
  }, [step, done]);

  useEffect(() => {
    if (step >= FLAT.length) {
      const t = setTimeout(onComplete, 700);
      return () => clearTimeout(t);
    }
  }, [step, onComplete]);

  const activePhase = step >= FLAT.length ? PHASES.length - 1 : FLAT[step].phaseIdx;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-10 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {company} · {role}
          </div>
          <h2 className="font-display text-xl md:text-2xl font-medium text-foreground/90">
            Pricing your career asset
          </h2>
        </div>

        <div className="space-y-8">
          {PHASES.map((phase, pi) => {
            const phaseStart = PHASES.slice(0, pi).reduce((n, p) => n + p.steps.length, 0);
            const stepsDoneInPhase = Math.max(0, Math.min(phase.steps.length, step - phaseStart));
            const isActive = pi === activePhase && step < FLAT.length;
            const isComplete = pi < activePhase || step >= FLAT.length;
            const stateDot = isComplete
              ? "bg-primary"
              : isActive
                ? "bg-foreground/70"
                : "bg-border";

            return (
              <div key={phase.key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${stateDot} ${
                      isActive ? "animate-pulse" : ""
                    }`}
                  />
                  <span
                    className={`font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                      isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {phase.title}
                  </span>
                </div>

                <ul className="pl-5 space-y-1.5">
                  {phase.steps.map((s, si) => {
                    const globalIdx = phaseStart + si;
                    if (globalIdx > step) return null;
                    const isCurrent = globalIdx === step && step < FLAT.length;
                    return (
                      <li
                        key={s}
                        className={`text-sm transition-all duration-500 animate-fade-in ${
                          isCurrent
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            {s}
                            <span className="ml-1 text-foreground/50 animate-pulse">…</span>
                          </>
                        ) : (
                          <span className="opacity-70">{s}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

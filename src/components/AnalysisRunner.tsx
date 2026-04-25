import { useEffect, useState } from "react";
import { Check } from "lucide-react";

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
      "Preparing asset rating",
      "Generating next-step questions",
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
    const t = setTimeout(() => setStep((s) => s + 1), 750);
    return () => clearTimeout(t);
  }, [step, done]);

  useEffect(() => {
    if (step >= FLAT.length) {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
  }, [step, onComplete]);

  const activePhase = step >= FLAT.length ? PHASES.length - 1 : FLAT[step].phaseIdx;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center space-y-2 mb-14">
          <div className="text-xs text-muted-foreground">
            {company} · {role}
          </div>
          <h2 className="font-display text-2xl md:text-[26px] font-semibold tracking-tight">
            Pricing your career asset
          </h2>
        </div>

        <div className="space-y-10">
          {PHASES.map((phase, pi) => {
            const phaseStart = PHASES.slice(0, pi).reduce((n, p) => n + p.steps.length, 0);
            const isActive = pi === activePhase && step < FLAT.length;
            const isComplete = pi < activePhase || step >= FLAT.length;
            const isPending = !isActive && !isComplete;

            return (
              <div
                key={phase.key}
                className={`transition-opacity duration-500 ${
                  isPending ? "opacity-30" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="relative w-5 h-5 flex items-center justify-center shrink-0">
                    {isComplete ? (
                      <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </span>
                  <span
                    className={`text-[15px] font-medium tracking-tight ${
                      isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {phase.title}
                  </span>
                </div>

                {(isActive || isComplete) && (
                  <ul className="pl-8 space-y-2">
                    {phase.steps.map((s, si) => {
                      const globalIdx = phaseStart + si;
                      if (globalIdx > step) return null;
                      const isCurrent = globalIdx === step && step < FLAT.length;
                      return (
                        <li
                          key={s}
                          className={`text-[13.5px] leading-relaxed transition-colors animate-fade-in-soft ${
                            isCurrent ? "text-foreground/90" : "text-muted-foreground"
                          }`}
                        >
                          {s}
                          {isCurrent && (
                            <span className="ml-1 text-foreground/40 animate-pulse">…</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

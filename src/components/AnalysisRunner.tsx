import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";

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
  animationsEnabled: boolean;
  onComplete: () => void;
}

export function AnalysisRunner({ company, role, done, animationsEnabled, onComplete }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!animationsEnabled && done) {
      setStep(FLAT.length);
      return;
    }
    if (step >= FLAT.length) return;
    const isLast = step === FLAT.length - 1;
    if (isLast && !done) return;
    const t = setTimeout(() => setStep((s) => s + 1), 500);
    return () => clearTimeout(t);
  }, [step, done, animationsEnabled]);

  useEffect(() => {
    if (step >= FLAT.length) {
      const t = setTimeout(onComplete, animationsEnabled ? 280 : 0);
      return () => clearTimeout(t);
    }
  }, [step, onComplete, animationsEnabled]);

  const activePhase = step >= FLAT.length ? PHASES.length - 1 : FLAT[step].phaseIdx;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-10 sm:px-6 md:py-14 relative">
      <SignalGrid variant="analysis" pulses intensity="active" />

      <div className="relative z-10 grid w-full max-w-[1000px] items-center gap-8 animate-fade-in md:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-3 py-2 text-[12px] font-semibold text-muted-foreground shadow-soft backdrop-blur-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-breathe" />
            {company} · {role}
          </div>
          <h2 className="font-display text-[36px] font-[800] leading-[1.02] text-foreground md:text-[52px]">
            Pricing your career asset
          </h2>
          <p className="max-w-[420px] text-[15px] leading-[1.65] text-muted-foreground">
            $JOB is scanning public momentum, risk, hiring, and career leverage signals.
          </p>
          <div className="air-card hidden p-5 md:block">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              AI pricing status
            </div>
            <div className="mt-2 text-[23px] font-extrabold tracking-tight text-primary-strong">
              Gathering context
            </div>
          </div>
        </div>

        <div className="surface-floating relative overflow-hidden rounded-[34px] p-5 md:p-7">
          {/* subtle progress shimmer along top edge */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-shimmer-line" />
          </div>

          <div className="space-y-5">
            {PHASES.map((phase, pi) => {
              const phaseStart = PHASES.slice(0, pi).reduce((n, p) => n + p.steps.length, 0);
              const isActive = pi === activePhase && step < FLAT.length;
              const isComplete = pi < activePhase || step >= FLAT.length;
              const isPending = !isActive && !isComplete;

              return (
                <div
                  key={phase.key}
                  className={`transition-all duration-700 ${
                    isPending ? "opacity-35" : "opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3.5 mb-3.5">
                    <span className="relative w-6 h-6 flex items-center justify-center shrink-0">
                      {isComplete ? (
                        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                        </span>
                      ) : isActive ? (
                        <>
                          <span className="absolute w-6 h-6 rounded-full border-[1.5px] border-primary/40" />
                          <span className="absolute w-6 h-6 rounded-full border-[1.5px] border-primary border-r-transparent animate-spin" style={{ animationDuration: "1.4s" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                    </span>
                    <span
                      className={`text-[15px] font-semibold tracking-tight transition-colors ${
                        isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {phase.title}
                    </span>
                  </div>

                  {(isActive || isComplete) && (
                    <ul className="pl-[38px] space-y-2">
                      {phase.steps.map((s, si) => {
                        const globalIdx = phaseStart + si;
                        if (globalIdx > step) return null;
                        const isCurrent = globalIdx === step && step < FLAT.length;
                        return (
                          <li
                            key={s}
                            className={`rounded-[24px] border border-border/[0.035] bg-white/45 px-3 py-2 text-[13.5px] leading-relaxed transition-colors animate-fade-in-soft ${
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
    </div>
  );
}

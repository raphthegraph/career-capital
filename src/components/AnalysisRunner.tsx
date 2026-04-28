import { useEffect, useState } from "react";
import { Check, Search, Sparkles, TrendingUp } from "lucide-react";
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
      "Searching source-backed company signals",
      "Reading hiring and team evidence",
      "Checking risk and market indicators",
    ],
  },
  {
    key: "interpret",
    title: "Interpreting career asset",
    steps: [
      "Mapping evidence to your role",
      "Evaluating promotion and scope upside",
      "Separating sources from AI inference",
    ],
  },
  {
    key: "decide",
    title: "Forming recommendation",
    steps: [
      "Comparing stay vs leave scenarios",
      "Preparing sourced asset rating",
      "Generating personalized follow-up questions",
    ],
  },
];

const FLAT = PHASES.flatMap((p, pi) =>
  p.steps.map((s, si) => ({ label: s, phaseIdx: pi, stepIdx: si })),
);

const PHASE_ICONS = [Search, TrendingUp, Sparkles];

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
    const t = setTimeout(() => setStep((s) => s + 1), 650);
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

      <div className="relative z-10 grid w-full max-w-[980px] items-center gap-8 animate-fade-in md:grid-cols-[0.86fr_1.14fr]">
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
          <div className="hidden max-w-[360px] space-y-2 md:block">
            <div className="h-px w-full bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Signals are collected quietly first, then compressed into one career-asset read.
            </p>
          </div>
        </div>

        <div className="relative space-y-4">
          <div className="absolute -left-4 top-8 bottom-8 hidden w-px bg-gradient-to-b from-transparent via-primary/12 to-transparent md:block" />
            {PHASES.map((phase, pi) => {
              const phaseStart = PHASES.slice(0, pi).reduce((n, p) => n + p.steps.length, 0);
              const isActive = pi === activePhase && step < FLAT.length;
              const isComplete = pi < activePhase || step >= FLAT.length;
              const isPending = !isActive && !isComplete;
              const Icon = PHASE_ICONS[pi];

              return (
                <div
                  key={phase.key}
                  className={`rounded-[28px] border border-border/[0.028] bg-white/[0.34] px-4 py-4 backdrop-blur-2xl transition-all duration-700 md:px-5 ${
                    isPending ? "opacity-40" : "opacity-100 shadow-soft"
                  }`}
                >
                  <div className="flex items-center gap-3.5 mb-3.5">
                    <span className="relative w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-white/50">
                      {isComplete ? (
                        <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                        </span>
                      ) : isActive ? (
                        <>
                          <span className="absolute w-8 h-8 rounded-full border-[1.5px] border-primary/30" />
                          <span className="absolute w-8 h-8 rounded-full border-[1.5px] border-primary border-r-transparent animate-spin" style={{ animationDuration: "1.4s" }} />
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </>
                      ) : (
                        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
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
                    <ul className="pl-[46px] space-y-2">
                      {phase.steps.map((s, si) => {
                        const globalIdx = phaseStart + si;
                        if (globalIdx > step) return null;
                        const isCurrent = globalIdx === step && step < FLAT.length;
                        return (
                          <li
                            key={s}
                            className={`flex items-center gap-2 text-[13.5px] leading-relaxed transition-colors animate-fade-in-soft ${
                              isCurrent ? "text-foreground/90" : "text-muted-foreground"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "bg-primary animate-breathe" : "bg-primary/35"}`} />
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

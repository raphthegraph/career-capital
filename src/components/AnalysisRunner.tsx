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
      "Extracting the strongest public evidence",
      "Checking hiring, risk, and momentum",
    ],
  },
  {
    key: "interpret",
    title: "Interpreting career asset",
    steps: [
      "Mapping evidence to your role",
      "Pricing promotion and ownership upside",
      "Separating sources from AI inference",
    ],
  },
  {
    key: "decide",
    title: "Preparing sourced read",
    steps: [
      "Scoring the career asset",
      "Preparing sourced key signals",
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
    const t = setTimeout(() => setStep((s) => s + 1), 1320);
    return () => clearTimeout(t);
  }, [step, done, animationsEnabled]);

  useEffect(() => {
    if (step >= FLAT.length) {
      const t = setTimeout(onComplete, animationsEnabled ? 620 : 0);
      return () => clearTimeout(t);
    }
  }, [step, onComplete, animationsEnabled]);

  const activePhase = step >= FLAT.length ? PHASES.length - 1 : FLAT[step].phaseIdx;
  const visibleStep = Math.min(step + 1, FLAT.length);
  const rawProgress = Math.round((visibleStep / FLAT.length) * 100);
  const progress = done ? rawProgress : Math.min(rawProgress, 88);
  const activeLabel = step >= FLAT.length ? "Sourced read ready" : FLAT[step].label;

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
            $JOB is reading live sources, compressing evidence, and mapping it to your role.
          </p>
          <div className="air-card max-w-[420px] overflow-hidden p-4">
            <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Live pricing sequence</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/[0.08]">
              <div
                className="relative h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              >
                {animationsEnabled && (
                  <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-shimmer-line" />
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-foreground/78">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-breathe" />
              {activeLabel}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {done ? "Evidence is ready. Finishing the reveal sequence." : "Waiting for the live research layer to finish cleanly."}
            </p>
          </div>
          <div className="hidden max-w-[360px] space-y-2 md:block">
            <div className="h-px w-full bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              The sequence is paced so each source-backed signal has a moment to land.
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
                className={`relative overflow-hidden rounded-[28px] border border-border/[0.028] bg-white/[0.34] px-4 py-4 backdrop-blur-2xl transition-all duration-700 md:px-5 ${
                  isPending
                    ? "opacity-[0.38]"
                    : isActive
                      ? "scale-[1.012] bg-white/[0.5] opacity-100 shadow-floating"
                      : "opacity-100 shadow-soft"
                }`}
              >
                {isActive && animationsEnabled && (
                  <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent animate-shimmer-line" />
                )}
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

                <ul className="pl-[46px] space-y-2">
                    {phase.steps.map((s, si) => {
                      const globalIdx = phaseStart + si;
                      const isCurrent = globalIdx === step && step < FLAT.length;
                      const isStepComplete = globalIdx < step || step >= FLAT.length;
                      return (
                        <li
                          key={s}
                          className={`flex items-center gap-2 text-[13.5px] leading-relaxed transition-colors animate-fade-in-soft ${
                            isCurrent
                              ? "text-foreground/90"
                              : isStepComplete
                                ? "text-muted-foreground"
                                : "text-muted-foreground/45"
                          }`}
                        >
                          <span
                            className={`rounded-full ${
                              isCurrent
                                ? "h-2 w-2 bg-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.08)] animate-breathe"
                                : isStepComplete
                                  ? "h-1.5 w-1.5 bg-primary/35"
                                  : "h-1.5 w-1.5 bg-primary/12"
                            }`}
                          />
                          {s}
                          {isCurrent && (
                            <span className="ml-1 text-foreground/40 animate-pulse">…</span>
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

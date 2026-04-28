import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Analysis, DecisionContext, Intent } from "@/lib/job-types";
import { RatingPill } from "@/components/RatingPill";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";
import { getInvestmentThesis } from "@/lib/analysis-helpers";
import { ratingColorClass } from "@/lib/rating";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  animationsEnabled: boolean;
  onDecision: (d: DecisionContext) => void;
}

const SECTIONS = [
  { key: "bull", title: "Why to keep this job", field: "keep", accent: "text-buy", icon: TrendingUp },
  { key: "bear", title: "Why to be careful", field: "caution", accent: "text-short", icon: AlertTriangle },
  { key: "triggers", title: "What would change the rating", field: "triggers", accent: "text-hold", icon: ListChecks },
] as const;

const INTENT_OPTIONS: { id: Intent; label: string }[] = [
  { id: "stay", label: "Stay and grow here" },
  { id: "options", label: "Keep options open" },
  { id: "leave", label: "Prepare to leave" },
];

function getPrimaryQuestion(analysis: Analysis) {
  if (analysis.rating === "BUY") {
    return "This looks attractive. What upside are you optimizing for?";
  }
  if (analysis.rating === "SELL" || analysis.rating === "SHORT") {
    return "This looks risky. What move are you considering?";
  }
  return "This is conditional. What would make the next cycle worth it?";
}

function getIntentOptions(analysis: Analysis): { id: Intent; label: string }[] {
  if (analysis.rating === "BUY") {
    return [
      { id: "stay", label: "Push for promotion" },
      { id: "options", label: "Maximize exit value" },
      { id: "leave", label: "Compare bigger upside" },
    ];
  }
  if (analysis.rating === "SELL" || analysis.rating === "SHORT") {
    return [
      { id: "leave", label: "Plan a clean exit" },
      { id: "options", label: "Reduce risk first" },
      { id: "stay", label: "Renegotiate scope" },
    ];
  }
  return INTENT_OPTIONS;
}

const SUB_INTENT: Record<Intent, { question: string; options: string[]; placeholder: string }> = {
  stay: {
    question: "What matters most right now?",
    options: ["Get promoted faster", "Increase compensation", "Expand responsibility"],
    placeholder: "Or describe it in your own words…",
  },
  options: {
    question: "What kind of optionality do you want?",
    options: ["Stronger company, similar role", "Higher-growth startup", "More stable company"],
    placeholder: "Or describe it in your own words…",
  },
  leave: {
    question: "What kind of move are you considering?",
    options: ["Join another company", "Join a startup", "Start my own company"],
    placeholder: "Or describe it in your own words…",
  },
  other: {
    question: "What direction are you leaning?",
    options: ["Take time to reset", "Switch industries", "Try something completely new"],
    placeholder: "Or describe it in your own words…",
  },
};

const THIRD_QUESTION: Record<Intent, { question: string; options: string[]; placeholder: string }> = {
  stay: {
    question: "What's your biggest constraint?",
    options: ["No internal sponsor yet", "Comp ceiling at this level", "Unclear next role"],
    placeholder: "Or tell $JOB what matters most…",
  },
  options: {
    question: "What timeline are you optimizing for?",
    options: ["Move within 3 months", "Move within 6–12 months", "Just exploring quietly"],
    placeholder: "Or tell $JOB what matters most…",
  },
  leave: {
    question: "What would make this move successful?",
    options: ["Significant comp jump", "Faster path to leadership", "Equity / ownership upside"],
    placeholder: "Or tell $JOB what matters most…",
  },
  other: {
    question: "What would make this successful?",
    options: ["Clarity on next 6 months", "Lower personal risk", "Higher upside"],
    placeholder: "Or tell $JOB what matters most…",
  },
};

const OVERVIEW_DIMENSIONS = [
  { key: "careerDividend", label: "Career dividend" },
  { key: "momentum", label: "Momentum" },
  { key: "volatility", label: "Volatility" },
] as const;

function getStayStatement(company: string, role: string, analysis: Analysis) {
  if (analysis.wouldBuy === "Yes") {
    return `Would stay at ${company} as ${role}.`;
  }
  if (analysis.wouldBuy === "Conditional") {
    return `Would stay at ${company}, but only with clearer upside.`;
  }
  return `Would not stay at ${company} without a stronger path.`;
}

function scrollNearestIfNeeded(element: HTMLElement | null) {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function AnalysisDashboard({ company, role, analysis, animationsEnabled, onDecision }: Props) {
  const [showIntro, setShowIntro] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showBars, setShowBars] = useState(false);
  const [showThesis, setShowThesis] = useState(false);
  const [showIntent, setShowIntent] = useState(false);
  const stayStatement = getStayStatement(company, role, analysis);
  const handleThesisComplete = useCallback(() => setShowIntent(true), []);

  useEffect(() => {
    if (!animationsEnabled) {
      setShowIntro(true);
      setShowMetrics(true);
      setShowBars(true);
      setShowThesis(true);
      setShowIntent(true);
      return;
    }

    setShowIntro(false);
    setShowMetrics(false);
    setShowBars(false);
    setShowThesis(false);
    setShowIntent(false);

    const t1 = setTimeout(() => setShowIntro(true), 180);
    const t2 = setTimeout(() => setShowMetrics(true), 1150);
    const t3 = setTimeout(() => setShowBars(true), 1750);
    const t4 = setTimeout(() => setShowThesis(true), 2850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [animationsEnabled]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-28 relative">
      <SignalGrid variant="dashboard" />

      <div className="relative z-10 mx-auto w-full max-w-[980px] px-4 py-10 sm:px-6 md:py-14">
        <main className="space-y-12 md:space-y-16">
          {showIntro && (
            <section className="mx-auto max-w-[860px] space-y-5 text-center animate-fade-in-up">
              <div className="eyebrow">Final result</div>
              <h2 className="font-display text-[40px] font-[760] leading-[1.04] text-foreground text-elegant sm:text-[58px]">
                {stayStatement}
              </h2>
              <p className="mx-auto max-w-[680px] text-[16px] leading-[1.65] text-foreground/75 md:text-[18px]">
                {analysis.oneLineVerdict}
              </p>
              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                <span className="rounded-full border border-border/[0.035] bg-white/40 px-4 py-2 text-[13px] font-semibold text-foreground/75 shadow-soft backdrop-blur-2xl">
                  Pricing result: <span className={ratingColorClass(analysis.rating)}>{analysis.wouldBuy}</span>
                </span>
                <RatingPill rating={analysis.rating} size="lg" glow />
              </div>
            </section>
          )}

          {showMetrics && <ResultMetrics analysis={analysis} />}

          {showBars && (
            <DimensionBars analysis={analysis} animationsEnabled={animationsEnabled} />
          )}

          {showThesis && (
            <ThesisSequence
              analysis={analysis}
              animationsEnabled={animationsEnabled}
              onComplete={handleThesisComplete}
            />
          )}

          {showIntent && (
            <IntentFlow
              onDecide={onDecision}
              primaryQuestion={getPrimaryQuestion(analysis)}
              options={getIntentOptions(analysis)}
              subQuestions={SUB_INTENT}
              thirdQuestions={THIRD_QUESTION}
              animationsEnabled={animationsEnabled}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function ResultMetrics({ analysis }: { analysis: Analysis }) {
  return (
    <section className="mx-auto grid max-w-[760px] grid-cols-1 gap-3 animate-fade-in-up sm:grid-cols-3">
      <div className="rounded-[28px] border border-border/[0.03] bg-white/38 p-4 text-center shadow-soft backdrop-blur-2xl">
        <div className="eyebrow">Ticker</div>
        <div className="mt-1 font-mono text-[28px] font-semibold tracking-[0.08em] text-primary-strong">
          {analysis.ticker}
        </div>
      </div>
      <div className="rounded-[28px] border border-border/[0.03] bg-white/38 p-4 text-center shadow-soft backdrop-blur-2xl">
        <div className="eyebrow">Confidence</div>
        <div className="mt-1 text-[28px] font-semibold text-foreground">{analysis.confidence}%</div>
      </div>
      <div className="rounded-[28px] border border-border/[0.03] bg-white/38 p-4 text-center shadow-soft backdrop-blur-2xl">
        <div className="eyebrow">Asset score</div>
        <div className="mt-1 text-[28px] font-semibold text-foreground">
          {analysis.careerAssetScore}
        </div>
      </div>
    </section>
  );
}

function DimensionBars({
  analysis,
  animationsEnabled,
}: {
  analysis: Analysis;
  animationsEnabled: boolean;
}) {
  const [filled, setFilled] = useState(!animationsEnabled);

  useEffect(() => {
    if (!animationsEnabled) {
      setFilled(true);
      return;
    }
    setFilled(false);
    const t = setTimeout(() => setFilled(true), 280);
    return () => clearTimeout(t);
  }, [animationsEnabled]);

  return (
    <section className="mx-auto max-w-[780px] space-y-4 animate-fade-in-up">
      {OVERVIEW_DIMENSIONS.map((dimension, index) => {
        const value = analysis.dimensions[dimension.key].score;
        return (
          <div
            key={dimension.key}
            className="space-y-2"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="flex items-center justify-between gap-4 text-[13px]">
              <span className="font-semibold text-foreground/78">{dimension.label}</span>
              <span className="font-semibold text-primary-strong">{value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/45 shadow-soft backdrop-blur-xl">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
                style={{ width: filled ? `${Math.max(7, Math.min(100, value))}%` : "0%" }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* -------------------- Thesis sequence -------------------- */

function ThesisSequence({
  analysis,
  animationsEnabled,
  onComplete,
}: {
  analysis: Analysis;
  animationsEnabled: boolean;
  onComplete: () => void;
}) {
  const thesis = useMemo(() => getInvestmentThesis(analysis), [analysis]);
  // openMap = sections that have been opened (and stay open)
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [activeIdx, setActiveIdx] = useState(0); // currently focused section (1-based), 0 = none yet, >SECTIONS.length = done
  const [revealedPerSection, setRevealedPerSection] = useState<Record<number, number>>({});
  const sectionRefs = useRef([
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
  ]);

  useEffect(() => {
    if (!animationsEnabled) {
      setOpenMap({ 0: true, 1: true, 2: true });
      setRevealedPerSection({ 0: 3, 1: 3, 2: 3 });
      setActiveIdx(SECTIONS.length + 1);
      onComplete();
      return;
    }

    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < SECTIONS.length; i++) {
        if (cancelled) return;
        setActiveIdx(i + 1);
        // open and keep open
        setOpenMap((p) => ({ ...p, [i]: true }));
        // Give the section a beat to expand before scrolling so the flow feels intentional.
        await new Promise((r) => setTimeout(r, 420));
        scrollNearestIfNeeded(sectionRefs.current[i].current);

        const items = thesis[SECTIONS[i].field] ?? [];
        const total = Math.min(3, items?.length ?? 0);
        for (let j = 0; j < total; j++) {
          await new Promise((r) => setTimeout(r, 840));
          if (cancelled) return;
          setRevealedPerSection((prev) => ({ ...prev, [i]: j + 1 }));
        }
        await new Promise((r) => setTimeout(r, 900));
      }
      if (!cancelled) {
        setActiveIdx(SECTIONS.length + 1);
        setTimeout(onComplete, 520);
      }
    };
    const start = setTimeout(run, 360);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [thesis, animationsEnabled, onComplete]);

  const sequenceDone = activeIdx > SECTIONS.length;

  return (
    <section className="space-y-3 animate-fade-in-up">
      <div className="eyebrow text-center mb-6">Investment thesis</div>
      {SECTIONS.map((s, i) => {
        const items = thesis[s.field] ?? [];
        const Icon = s.icon;
        const revealed = revealedPerSection[i] ?? 0;
        const isOpened = openMap[i] === true;
        const isFocus = activeIdx === i + 1;
        // de-emphasize sections not yet visited (or completed sections when another is focused), but keep opened content visible
        const dim = !sequenceDone && !isFocus && !isOpened;
        const softDim = !sequenceDone && !isFocus && isOpened;
        const isAutoRevealing = isFocus;

        return (
          <div
            key={s.key}
            ref={sectionRefs.current[i]}
            className={`section-plain overflow-hidden transition-all duration-500 ${
              dim ? "opacity-50" : softDim ? "opacity-80" : "opacity-100"
            }`}
          >
            <button
              onClick={() => {
                if (!sequenceDone) return;
                setOpenMap((p) => ({ ...p, [i]: !p[i] }));
              }}
              disabled={!sequenceDone}
              className={`w-full flex items-center justify-between gap-3 border-t border-border/[0.055] px-1 py-5 text-left transition-colors sm:px-0 ${
                sequenceDone ? "cursor-pointer hover:text-primary" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint/55">
                  <Icon className={`h-4 w-4 ${s.accent}`} />
                </span>
                <span
                  className={`text-[16px] font-semibold tracking-tight ${
                    isOpened ? s.accent : "text-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-500 ${
                  isOpened ? "rotate-180" : ""
                } ${!sequenceDone ? "opacity-0" : "opacity-100"}`}
              />
            </button>
            {isOpened && (
              <div className="px-1 pb-6 space-y-3.5 sm:px-0">
                {items.slice(0, 3).map((it, j) => {
                  const visible = isAutoRevealing ? j < revealed : true;
                  if (!visible) return null;
                  return (
                    <p
                      key={j}
                      className="text-[15px] text-foreground/80 leading-[1.65] flex gap-3 animate-fade-in-soft"
                    >
                      <CheckCircle2 className={`mt-1 h-4 w-4 shrink-0 ${s.accent}`} />
                      <span className="flex-1">{it}</span>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* -------------------- Intent flow -------------------- */

function IntentFlow({
  onDecide,
  primaryQuestion,
  options,
  subQuestions,
  thirdQuestions,
  animationsEnabled,
}: {
  onDecide: (d: DecisionContext) => void;
  primaryQuestion: string;
  options: { id: Intent; label: string }[];
  subQuestions: Record<Intent, { question: string; options: string[]; placeholder: string }>;
  thirdQuestions: Record<Intent, { question: string; options: string[]; placeholder: string }>;
  animationsEnabled: boolean;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [intentLabel, setIntentLabel] = useState<string>("");
  const [sub, setSub] = useState<string | null>(null);
  const [third, setThird] = useState<string | null>(null);

  const q2Ref = useRef<HTMLDivElement>(null);
  const q3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (intent) {
      q2Ref.current?.scrollIntoView({
        behavior: animationsEnabled ? "smooth" : "auto",
        block: "center",
      });
    }
  }, [intent, animationsEnabled]);
  useEffect(() => {
    if (sub) {
      q3Ref.current?.scrollIntoView({
        behavior: animationsEnabled ? "smooth" : "auto",
        block: "center",
      });
    }
  }, [sub, animationsEnabled]);

  useEffect(() => {
    if (intent && sub && third) {
      onDecide({
        intent,
        subIntent: `${sub} → ${third}`,
        freeText: intent === "other" ? intentLabel : undefined,
      });
    }
  }, [intent, sub, third, intentLabel, onDecide]);

  const reset2 = () => {
    setSub(null);
    setThird(null);
  };
  const reset3 = () => setThird(null);

  return (
    <section className="space-y-6">
      <Question
        index={1}
        title={primaryQuestion}
        icon={Target}
        locked={!!intent}
        lockedAnswer={intentLabel}
        onChange={() => {
          setIntent(null);
          setIntentLabel("");
          reset2();
        }}
      >
        <SuggestionsWithFreeText
          items={options.map((o) => o.label)}
          placeholder="Or tell $JOB what you're considering…"
          onPick={(label) => {
            const found = options.find((o) => o.label === label);
            setIntent(found ? found.id : "other");
            setIntentLabel(label);
          }}
          onFreeText={(v) => {
            setIntent("other");
            setIntentLabel(v);
          }}
        />
      </Question>

      {intent && (
        <div ref={q2Ref}>
          <Question
            index={2}
            title={subQuestions[intent].question}
            icon={Compass}
            locked={!!sub}
            lockedAnswer={sub ?? ""}
            onChange={reset2}
          >
            <SuggestionsWithFreeText
              items={subQuestions[intent].options}
              placeholder={subQuestions[intent].placeholder}
              onPick={(v) => setSub(v)}
              onFreeText={(v) => setSub(v)}
            />
          </Question>
        </div>
      )}

      {intent && sub && (
        <div ref={q3Ref}>
          <Question
            index={3}
            title={thirdQuestions[intent].question}
            icon={ListChecks}
            locked={!!third}
            lockedAnswer={third ?? ""}
            onChange={reset3}
          >
            <SuggestionsWithFreeText
              items={thirdQuestions[intent].options}
              placeholder={thirdQuestions[intent].placeholder}
              onPick={(v) => setThird(v)}
              onFreeText={(v) => setThird(v)}
            />
          </Question>
        </div>
      )}
    </section>
  );
}

function Question({
  index,
  title,
  icon: Icon,
  locked,
  lockedAnswer,
  onChange,
  children,
}: {
  index: number;
  title: string;
  icon: LucideIcon;
  locked: boolean;
  lockedAnswer: string;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="section-plain animate-fade-in-up border-t border-border/[0.055] py-7">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/45 text-primary-strong shadow-soft backdrop-blur-2xl">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Question {index} of 3</div>
          <h3 className="mt-2 font-display text-[24px] font-[680] leading-[1.16] text-foreground md:text-[30px]">
            {title}
          </h3>
        </div>
      </div>
      {locked ? (
        <div className="rounded-[24px] border border-primary/10 bg-white/45 px-4 py-3.5 flex items-center justify-between gap-3 shadow-soft backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-strong" />
            <span className="text-[14.5px] text-foreground font-medium">{lockedAnswer}</span>
          </div>
          <button
            onClick={onChange}
            className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            change
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function SuggestionsWithFreeText({
  items,
  placeholder,
  onPick,
  onFreeText,
}: {
  items: string[];
  placeholder: string;
  onPick: (v: string) => void;
  onFreeText: (v: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {items.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            className="group w-full text-left px-4 py-4 rounded-[24px] border border-border/[0.035] bg-white/40 hover:bg-primary-tint/60 hover:border-primary/15 lift-on-hover animate-fade-in-soft flex items-center justify-between gap-3 shadow-soft backdrop-blur-2xl"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="text-[15px] font-medium text-foreground/95">{label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (v) onFreeText(v);
        }}
        className="rounded-full border border-border/[0.035] bg-white/50 flex items-center gap-2 p-2 pl-4 animate-fade-in-soft shadow-soft backdrop-blur-xl"
        style={{ animationDelay: `${items.length * 90 + 80}ms` }}
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-11 bg-transparent text-[14.5px] text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim()}
          className="h-10 w-10 rounded-[20px] bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

import { createRef, useEffect, useMemo, useRef, useState } from "react";
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
import { AssetSnapshot } from "@/components/AssetSnapshot";

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

function scrollNearestIfNeeded(element: HTMLElement | null) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const viewportBottom = window.innerHeight - 96;
  if (rect.bottom > viewportBottom || rect.top < 88) {
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

export function AnalysisDashboard({ company, role, analysis, animationsEnabled, onDecision }: Props) {
  const [showThesis, setShowThesis] = useState(false);
  const [showIntent, setShowIntent] = useState(false);

  useEffect(() => {
    if (!animationsEnabled) {
      setShowThesis(true);
      setShowIntent(true);
      return;
    }
    const t1 = setTimeout(() => setShowThesis(true), 400);
    const t2 = setTimeout(() => setShowIntent(true), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [animationsEnabled]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-28 relative">
      <SignalGrid variant="dashboard" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-7 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-12 md:space-y-16">
          <section className="surface-floating animate-fade-in-up rounded-[34px] p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <div className="eyebrow">Pricing result</div>
                <p
                  className={`font-display text-[44px] font-[720] leading-none md:text-[62px] ${ratingColorClass(
                    analysis.rating,
                  )}`}
                >
                  {analysis.wouldBuy}.
                </p>
                <p className="max-w-[680px] text-[16px] leading-[1.65] text-foreground/80 md:text-[18px]">
                  {analysis.oneLineVerdict}
                </p>
              </div>
              <RatingPill rating={analysis.rating} size="lg" glow />
            </div>
          </section>

          <AssetSnapshot
            company={company}
            role={role}
            analysis={analysis}
            className="lg:hidden"
          />

          {showThesis && <ThesisSequence analysis={analysis} animationsEnabled={animationsEnabled} />}

          {showIntent && (
            <IntentFlow
              onDecide={onDecision}
              options={INTENT_OPTIONS}
              subQuestions={SUB_INTENT}
              thirdQuestions={THIRD_QUESTION}
              animationsEnabled={animationsEnabled}
            />
          )}
        </main>

        <div className="hidden lg:block">
          <AssetSnapshot
            company={company}
            role={role}
            analysis={analysis}
            className="sticky top-24"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Thesis sequence -------------------- */

function ThesisSequence({
  analysis,
  animationsEnabled,
}: {
  analysis: Analysis;
  animationsEnabled: boolean;
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
      return;
    }

    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < SECTIONS.length; i++) {
        if (cancelled) return;
        setActiveIdx(i + 1);
        // open and keep open
        setOpenMap((p) => ({ ...p, [i]: true }));
        // give the section a beat to expand before scrolling
        await new Promise((r) => setTimeout(r, 220));
        scrollNearestIfNeeded(sectionRefs.current[i].current);

        const items = thesis[SECTIONS[i].field] ?? [];
        const total = Math.min(3, items?.length ?? 0);
        for (let j = 0; j < total; j++) {
          await new Promise((r) => setTimeout(r, 720));
          if (cancelled) return;
          setRevealedPerSection((prev) => ({ ...prev, [i]: j + 1 }));
        }
        // dwell so the user can read
        await new Promise((r) => setTimeout(r, 650));
      }
      if (!cancelled) setActiveIdx(SECTIONS.length + 1);
    };
    const start = setTimeout(run, 220);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [thesis, animationsEnabled]);

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
  options,
  subQuestions,
  thirdQuestions,
  animationsEnabled,
}: {
  onDecide: (d: DecisionContext) => void;
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
    if (!animationsEnabled) return;
    if (intent) q2Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [intent, animationsEnabled]);
  useEffect(() => {
    if (!animationsEnabled) return;
    if (sub) q3Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        title="Given this rating, what are you considering?"
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
    <div className="surface-floating animate-fade-in-up rounded-[34px] p-5 sm:p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[22px] bg-primary-tint/70 text-primary-strong shadow-soft">
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
        <div className="rounded-[26px] border border-primary/10 bg-primary-tint/60 px-4 py-3.5 flex items-center justify-between gap-3">
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
            className="group w-full text-left px-4 py-4 rounded-[26px] border border-border/[0.035] bg-white/45 hover:bg-primary-tint/60 hover:border-primary/15 lift-on-hover animate-fade-in-soft flex items-center justify-between gap-3"
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
        className="rounded-[28px] border border-border/[0.035] bg-white/55 flex items-center gap-2 p-2 pl-4 animate-fade-in-soft shadow-soft backdrop-blur-xl"
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

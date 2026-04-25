import { useEffect, useRef, useState } from "react";
import type { Analysis, DecisionContext, Intent } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { Button } from "@/components/ui/button";
import { ChevronDown, ArrowRight, Sparkles } from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  onDecision: (d: DecisionContext) => void;
}

const SECTIONS = [
  { key: "bull", title: "Why to keep this job", field: "bullCase", accent: "text-buy", dotClass: "bg-buy" },
  { key: "bear", title: "Why to be careful", field: "bearCase", accent: "text-short", dotClass: "bg-short" },
  { key: "triggers", title: "What would change the rating", field: "ratingChangeTriggers", accent: "text-hold", dotClass: "bg-hold" },
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

export function AnalysisDashboard({ company, role, analysis, onDecision }: Props) {
  const [showThesis, setShowThesis] = useState(false);
  const [showIntent, setShowIntent] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowThesis(true), 400);
    const t2 = setTimeout(() => setShowIntent(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen pb-32 relative">
      <SignalGrid />

      <div className="relative z-20 border-b hairline bg-background/70 backdrop-blur-xl sticky top-0">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[11px] bg-primary flex items-center justify-center font-mono text-[10.5px] font-semibold text-primary-foreground">
              {analysis.ticker.slice(0, 3)}
            </div>
            <div>
              <div className="text-[13.5px] font-semibold tracking-tight text-foreground">
                {company}
              </div>
              <div className="text-[11.5px] text-muted-foreground">{role}</div>
            </div>
          </div>
          <RatingPill rating={analysis.rating} size="md" />
        </div>
      </div>

      <div className="relative z-10 container py-20 max-w-2xl space-y-24">
        <section className="text-center space-y-5 animate-fade-in-up">
          <p
            className={`font-display text-[36px] md:text-[52px] font-[680] tracking-[-0.04em] leading-[1.05] ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
          <p className="text-[16px] md:text-[18px] text-foreground/80 max-w-xl mx-auto leading-[1.6]">
            {analysis.oneLineVerdict}
          </p>
        </section>

        {showThesis && <ThesisSequence analysis={analysis} />}

        {showIntent && (
          <IntentFlow
            onDecide={onDecision}
            options={INTENT_OPTIONS}
            subQuestions={SUB_INTENT}
            thirdQuestions={THIRD_QUESTION}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------- Thesis sequence -------------------- */

function ThesisSequence({ analysis }: { analysis: Analysis }) {
  // openMap = sections that have been opened (and stay open)
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [activeIdx, setActiveIdx] = useState(0); // currently focused section (1-based), 0 = none yet, >SECTIONS.length = done
  const [revealedPerSection, setRevealedPerSection] = useState<Record<number, number>>({});
  const sectionRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < SECTIONS.length; i++) {
        if (cancelled) return;
        setActiveIdx(i + 1);
        // open and keep open
        setOpenMap((p) => ({ ...p, [i]: true }));
        // give the section a beat to expand before scrolling
        await new Promise((r) => setTimeout(r, 250));
        sectionRefs[i].current?.scrollIntoView({ behavior: "smooth", block: "center" });

        const items = (analysis as any)[SECTIONS[i].field] as string[];
        const total = Math.min(3, items?.length ?? 0);
        for (let j = 0; j < total; j++) {
          await new Promise((r) => setTimeout(r, 850));
          if (cancelled) return;
          setRevealedPerSection((prev) => ({ ...prev, [i]: j + 1 }));
        }
        // dwell so the user can read
        await new Promise((r) => setTimeout(r, 1400));
      }
      if (!cancelled) setActiveIdx(SECTIONS.length + 1);
    };
    const start = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [analysis]);

  const sequenceDone = activeIdx > SECTIONS.length;

  return (
    <section className="space-y-3 animate-fade-in-up">
      <div className="eyebrow text-center mb-6">Investment thesis</div>
      {SECTIONS.map((s, i) => {
        const items = ((analysis as any)[s.field] as string[]) ?? [];
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
            ref={sectionRefs[i]}
            className={`surface rounded-[22px] overflow-hidden transition-all duration-700 ${
              dim ? "opacity-50" : softDim ? "opacity-80" : "opacity-100"
            } ${isFocus ? "ring-1 ring-primary/15 shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.35)]" : ""}`}
          >
            <button
              onClick={() => {
                if (!sequenceDone) return;
                setOpenMap((p) => ({ ...p, [i]: !p[i] }));
              }}
              disabled={!sequenceDone}
              className={`w-full flex items-center justify-between gap-3 px-7 py-6 text-left transition-colors ${
                sequenceDone ? "hover:bg-background/40 cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${s.dotClass}`} />
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
              <div className="px-7 pb-7 space-y-3.5">
                {items.slice(0, 3).map((it, j) => {
                  const visible = isAutoRevealing ? j < revealed : true;
                  if (!visible) return null;
                  return (
                    <p
                      key={j}
                      className="text-[15px] text-foreground/85 leading-[1.65] flex gap-3 animate-fade-in-soft"
                    >
                      <span className={`shrink-0 mt-2 w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
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
}: {
  onDecide: (d: DecisionContext) => void;
  options: { id: Intent; label: string }[];
  subQuestions: Record<Intent, { question: string; options: string[]; placeholder: string }>;
  thirdQuestions: Record<Intent, { question: string; options: string[]; placeholder: string }>;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [intentLabel, setIntentLabel] = useState<string>("");
  const [sub, setSub] = useState<string | null>(null);
  const [third, setThird] = useState<string | null>(null);

  const q2Ref = useRef<HTMLDivElement>(null);
  const q3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (intent) q2Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [intent]);
  useEffect(() => {
    if (sub) q3Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [sub]);

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
    <section className="space-y-14">
      <Question
        index={1}
        title="Given this rating, what are you considering?"
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
  locked,
  lockedAnswer,
  onChange,
  children,
}: {
  index: number;
  title: string;
  locked: boolean;
  lockedAnswer: string;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-7 animate-fade-in-up max-w-xl mx-auto">
      <div className="text-center space-y-3">
        <div className="eyebrow">Question {index} of 3</div>
        <h3 className="font-display text-[24px] md:text-[30px] font-[680] tracking-[-0.03em] leading-[1.18] text-foreground">
          {title}
        </h3>
      </div>
      {locked ? (
        <div className="surface rounded-[16px] px-5 py-4 flex items-center justify-between gap-3 border border-primary/20 bg-primary-tint/60">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            className="group w-full text-left px-5 py-4 rounded-[16px] surface hover:bg-primary-tint/50 hover:border-primary/25 lift-on-hover animate-fade-in-soft flex items-center justify-between gap-3"
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
        className="surface-elevated rounded-[16px] flex items-center gap-2 p-2 pl-5 animate-fade-in-soft"
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
          className="h-10 w-10 rounded-[12px] bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

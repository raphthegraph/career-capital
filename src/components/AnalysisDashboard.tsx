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
    const t1 = setTimeout(() => setShowThesis(true), 350);
    const t2 = setTimeout(() => setShowIntent(true), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen pb-32 relative">
      <SignalGrid />

      {/* refined header */}
      <div className="relative z-20 border-b hairline bg-background/70 backdrop-blur-xl sticky top-0">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-primary/25 border border-primary/30 flex items-center justify-center font-mono text-[10.5px] font-semibold text-primary-strong">
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
        {/* verdict line */}
        <section className="text-center space-y-5 animate-fade-in-up">
          <p
            className={`font-display text-[36px] md:text-[48px] font-[680] tracking-[-0.035em] leading-[1.05] ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
          <p className="text-[16px] md:text-[18px] text-foreground/80 max-w-xl mx-auto leading-[1.55]">
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [revealedPerSection, setRevealedPerSection] = useState<Record<number, number>>({});
  const [manualOpen, setManualOpen] = useState<Record<number, boolean>>({});
  const sectionRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < SECTIONS.length; i++) {
        if (cancelled) return;
        setActiveIdx(i + 1);
        sectionRefs[i].current?.scrollIntoView({ behavior: "smooth", block: "center" });
        const items = (analysis as any)[SECTIONS[i].field] as string[];
        const total = Math.min(3, items?.length ?? 0);
        for (let j = 0; j < total; j++) {
          await new Promise((r) => setTimeout(r, 700));
          if (cancelled) return;
          setRevealedPerSection((prev) => ({ ...prev, [i]: j + 1 }));
        }
        await new Promise((r) => setTimeout(r, 900));
      }
      if (!cancelled) setActiveIdx(SECTIONS.length + 1);
    };
    const start = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [analysis]);

  return (
    <section className="space-y-3 animate-fade-in-up">
      <div className="text-[10px] text-muted-foreground text-center mb-6 tracking-[0.18em] uppercase">
        Investment thesis
      </div>
      {SECTIONS.map((s, i) => {
        const items = ((analysis as any)[s.field] as string[]) ?? [];
        const revealed = revealedPerSection[i] ?? 0;
        const isAuto = activeIdx === i + 1;
        const isDone = activeIdx > i + 1;
        const isSequenceDone = activeIdx > SECTIONS.length;
        const userOpen = manualOpen[i];
        const open = isAuto || (isSequenceDone && (userOpen ?? false));

        return (
          <div
            key={s.key}
            ref={sectionRefs[i]}
            className={`surface rounded-[24px] overflow-hidden transition-all duration-500 ${
              open ? "" : isDone || isSequenceDone ? "opacity-80" : "opacity-55"
            }`}
          >
            <button
              onClick={() => {
                if (!isSequenceDone) return;
                setManualOpen((p) => ({ ...p, [i]: !p[i] }));
              }}
              disabled={!isSequenceDone}
              className={`w-full flex items-center justify-between gap-3 px-7 py-6 text-left transition-colors ${
                isSequenceDone ? "hover:bg-background/40 cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${s.dotClass}`} />
                <span
                  className={`text-[16px] font-semibold tracking-tight ${
                    open ? s.accent : "text-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                } ${!isSequenceDone ? "opacity-0" : ""}`}
              />
            </button>
            {open && (
              <div className="px-7 pb-7 space-y-3.5">
                {items.slice(0, 3).map((it, j) => {
                  const visible = isAuto ? j < revealed : true;
                  if (!visible) return null;
                  return (
                    <p
                      key={j}
                      className="text-[15px] text-foreground/85 leading-[1.6] flex gap-3 animate-fade-in-soft"
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
      {/* Q1 */}
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

      {/* Q2 */}
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

      {/* Q3 */}
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
        <div className="text-[10px] text-muted-foreground tracking-[0.18em] uppercase">
          Question {index} of 3
        </div>
        <h3 className="font-display text-[24px] md:text-[30px] font-[680] tracking-[-0.03em] leading-[1.18] text-foreground">
          {title}
        </h3>
      </div>
      {locked ? (
        <div className="surface rounded-[18px] px-5 py-4 flex items-center justify-between gap-3 border border-primary/30 bg-primary-tint/60">
          <span className="text-[14.5px] text-foreground font-medium">{lockedAnswer}</span>
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
            className="group w-full text-left px-5 py-4 rounded-[18px] surface hover:bg-primary-tint/60 hover:border-primary/30 lift-on-hover animate-fade-in-soft"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-[15px] font-medium text-foreground/95">{label}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (v) onFreeText(v);
        }}
        className="surface-elevated rounded-[18px] flex items-center gap-2 p-2 pl-5 animate-fade-in-soft"
        style={{ animationDelay: `${items.length * 80 + 80}ms` }}
      >
        <Sparkles className="w-4 h-4 text-primary-strong shrink-0" />
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
          className="h-10 w-10 rounded-[14px] bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

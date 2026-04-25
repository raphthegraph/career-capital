import { useEffect, useRef, useState } from "react";
import type { Analysis, DecisionContext, Intent } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ArrowRight } from "lucide-react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  onDecision: (d: DecisionContext) => void;
}

const SECTIONS = [
  {
    key: "bull" as const,
    title: "Why to keep this job",
    field: "bullCase" as const,
    accent: "text-buy",
    dotClass: "bg-buy",
  },
  {
    key: "bear" as const,
    title: "Why to be careful",
    field: "bearCase" as const,
    accent: "text-short",
    dotClass: "bg-short",
  },
  {
    key: "triggers" as const,
    title: "What would change the rating",
    field: "ratingChangeTriggers" as const,
    accent: "text-hold",
    dotClass: "bg-hold",
  },
];

const INTENT_OPTIONS: { id: Intent; label: string }[] = [
  { id: "stay", label: "Stay and grow here" },
  { id: "options", label: "Keep options open" },
  { id: "leave", label: "Prepare to leave" },
  { id: "other", label: "Something else" },
];

const SUB_INTENT: Record<Exclude<Intent, "other">, { question: string; options: string[] }> = {
  stay: {
    question: "What matters most right now?",
    options: [
      "Get promoted faster",
      "Increase compensation",
      "Expand responsibility",
      "Build stronger internal visibility",
      "Other",
    ],
  },
  options: {
    question: "What kind of optionality do you want?",
    options: [
      "Similar role at a stronger company",
      "Higher-growth startup",
      "More stable company",
      "Founder path later",
      "Other",
    ],
  },
  leave: {
    question: "What kind of move are you considering?",
    options: [
      "Join another company",
      "Join a startup",
      "Start my own company",
      "Take time to reset",
      "Other",
    ],
  },
};

// Third-question library — narrows the recommendation further
const THIRD_QUESTION: Record<Intent, { question: string; options: string[] }> = {
  stay: {
    question: "What's your biggest constraint?",
    options: [
      "Limited time outside work",
      "No internal sponsor yet",
      "Comp ceiling at this level",
      "Unclear next role",
      "Other",
    ],
  },
  options: {
    question: "What timeline are you optimizing for?",
    options: [
      "Move within 3 months",
      "Move within 6–12 months",
      "Just exploring quietly",
      "Wait for the right signal",
      "Other",
    ],
  },
  leave: {
    question: "What would make this move successful?",
    options: [
      "Significant comp jump",
      "Faster path to leadership",
      "Equity / ownership upside",
      "Better learning environment",
      "Other",
    ],
  },
  other: {
    question: "What would make this successful for you?",
    options: [
      "Clarity on next 6 months",
      "Lower personal risk",
      "Higher upside",
      "Better day-to-day energy",
      "Other",
    ],
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
    <div className="min-h-screen pb-32">
      {/* minimal header */}
      <div className="border-b border-border/50 bg-background/70 backdrop-blur-md sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground">
              {company} · {role}
            </div>
            <div className="font-mono text-sm font-medium text-foreground/90">{analysis.ticker}</div>
          </div>
          <RatingPill rating={analysis.rating} size="md" />
        </div>
      </div>

      <div className="container py-16 max-w-2xl space-y-20">
        {/* verdict line */}
        <section className="text-center space-y-4 animate-fade-in-up">
          <p
            className={`font-display text-3xl md:text-4xl font-semibold tracking-tight ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
          <p className="text-[15px] md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {analysis.oneLineVerdict}
          </p>
        </section>

        {/* investment thesis — auto-sequenced */}
        {showThesis && <ThesisSequence analysis={analysis} />}

        {/* AI-native intent flow */}
        {showIntent && (
          <IntentFlow
            onDecide={(d) => onDecision(d)}
            options={INTENT_OPTIONS}
            subQuestions={SUB_INTENT}
            thirdQuestions={THIRD_QUESTION}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------- Thesis sequence (auto open/close) -------------------- */

function ThesisSequence({ analysis }: { analysis: Analysis }) {
  // 0 = none, 1..3 = which is currently active, 4 = sequence done
  const [activeIdx, setActiveIdx] = useState(0);
  const [revealedPerSection, setRevealedPerSection] = useState<Record<number, number>>({});
  const [manualOpen, setManualOpen] = useState<Record<number, boolean>>({});
  const sectionRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // Drive auto sequence
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
        // pause then close (de-emphasize)
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
      <div className="text-[11px] text-muted-foreground text-center mb-5 tracking-wide">
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
            className={`surface rounded-2xl overflow-hidden transition-all duration-500 ${
              open ? "" : isDone || isSequenceDone ? "opacity-70" : "opacity-50"
            }`}
          >
            <button
              onClick={() => {
                if (!isSequenceDone) return;
                setManualOpen((p) => ({ ...p, [i]: !p[i] }));
              }}
              disabled={!isSequenceDone}
              className={`w-full flex items-center justify-between gap-3 px-6 py-5 text-left transition-colors ${
                isSequenceDone ? "hover:bg-card/40 cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
                <span
                  className={`text-[15px] font-medium tracking-tight ${
                    open ? s.accent : "text-foreground/90"
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
              <div className="px-6 pb-6 space-y-3">
                {items.slice(0, 3).map((it, j) => {
                  const visible = isAuto ? j < revealed : true;
                  if (!visible) return null;
                  return (
                    <p
                      key={j}
                      className="text-[14.5px] text-foreground/85 leading-relaxed flex gap-3 animate-fade-in-soft"
                    >
                      <span className={`shrink-0 mt-2 w-1 h-1 rounded-full ${s.dotClass}`} />
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

/* -------------------- Intent flow (3 questions) -------------------- */

function IntentFlow({
  onDecide,
  options,
  subQuestions,
  thirdQuestions,
}: {
  onDecide: (d: DecisionContext) => void;
  options: { id: Intent; label: string }[];
  subQuestions: Record<Exclude<Intent, "other">, { question: string; options: string[] }>;
  thirdQuestions: Record<Intent, { question: string; options: string[] }>;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [otherText, setOtherText] = useState("");
  const [sub, setSub] = useState<string | null>(null);
  const [subText, setSubText] = useState("");
  const [third, setThird] = useState<string | null>(null);
  const [thirdText, setThirdText] = useState("");

  const q2Ref = useRef<HTMLDivElement>(null);
  const q3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (intent) q2Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [intent]);
  useEffect(() => {
    if (sub) q3Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [sub]);

  // When all 3 answered → submit
  useEffect(() => {
    if (intent && sub && third) {
      const composed = `${sub} → ${third}`;
      onDecide({
        intent,
        subIntent: composed,
        freeText: intent === "other" ? otherText : undefined,
      });
    }
  }, [intent, sub, third, otherText, onDecide]);

  return (
    <section className="space-y-12">
      {/* Q1 */}
      <Question
        index={1}
        title="Given this rating, what are you considering?"
        locked={!!intent}
        lockedAnswer={intent ? options.find((o) => o.id === intent)?.label ?? "" : ""}
        onChange={() => {
          setIntent(null);
          setSub(null);
          setThird(null);
          setOtherText("");
          setSubText("");
          setThirdText("");
        }}
      >
        <Options
          items={options.map((o) => o.label)}
          onPick={(label) => {
            const found = options.find((o) => o.label === label);
            if (found) setIntent(found.id);
          }}
        />
      </Question>

      {/* Q2 */}
      {intent && (
        <div ref={q2Ref}>
          {intent === "other" ? (
            <Question
              index={2}
              title="Tell $JOB what you're thinking…"
              locked={!!sub}
              lockedAnswer={sub ?? ""}
              onChange={() => {
                setSub(null);
                setThird(null);
                setSubText("");
                setThirdText("");
              }}
            >
              <FreeText
                value={otherText}
                onChange={setOtherText}
                placeholder="e.g. take a sabbatical, switch industries, go solo…"
                onSubmit={(v) => setSub(v)}
              />
            </Question>
          ) : (
            <Question
              index={2}
              title={subQuestions[intent].question}
              locked={!!sub}
              lockedAnswer={sub ?? ""}
              onChange={() => {
                setSub(null);
                setThird(null);
                setSubText("");
                setThirdText("");
              }}
            >
              <OptionsWithOther
                items={subQuestions[intent].options}
                otherValue={subText}
                onOtherChange={setSubText}
                onPick={(v) => setSub(v)}
              />
            </Question>
          )}
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
            onChange={() => {
              setThird(null);
              setThirdText("");
            }}
          >
            <OptionsWithOther
              items={thirdQuestions[intent].options}
              otherValue={thirdText}
              onOtherChange={setThirdText}
              onPick={(v) => setThird(v)}
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
    <div className="space-y-5 animate-fade-in-up max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="text-[11px] text-muted-foreground tracking-wide">
          Question {index} of 3
        </div>
        <h3 className="font-display text-xl md:text-2xl font-medium tracking-tight">{title}</h3>
      </div>
      {locked ? (
        <div className="surface rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
          <span className="text-[14.5px] text-foreground/90">{lockedAnswer}</span>
          <button
            onClick={onChange}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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

function Options({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {items.map((label, i) => (
        <button
          key={label}
          onClick={() => onPick(label)}
          className="w-full text-left px-5 py-4 rounded-xl border border-border/60 bg-card/30 hover:bg-card/60 hover:border-foreground/30 transition-all animate-fade-in-soft"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="text-[14.5px] text-foreground/90">{label}</span>
        </button>
      ))}
    </div>
  );
}

function OptionsWithOther({
  items,
  otherValue,
  onOtherChange,
  onPick,
}: {
  items: string[];
  otherValue: string;
  onOtherChange: (v: string) => void;
  onPick: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((label, i) => {
        if (label === "Other") {
          return (
            <form
              key={label}
              onSubmit={(e) => {
                e.preventDefault();
                const v = otherValue.trim();
                if (v) onPick(v);
              }}
              className="flex gap-2 animate-fade-in-soft"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Input
                value={otherValue}
                onChange={(e) => onOtherChange(e.target.value)}
                placeholder="Other…"
                className="h-12 bg-background/40 rounded-xl border-border/60"
              />
              <Button
                type="submit"
                disabled={!otherValue.trim()}
                variant="outline"
                className="h-12 w-12 p-0 rounded-xl border-border/60"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          );
        }
        return (
          <button
            key={label}
            onClick={() => onPick(label)}
            className="w-full text-left px-5 py-3.5 rounded-xl border border-border/60 bg-card/30 hover:bg-card/60 hover:border-foreground/30 transition-all animate-fade-in-soft"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-[14.5px] text-foreground/90">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FreeText({
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSubmit: (v: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (v) onSubmit(v);
      }}
      className="space-y-3"
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 bg-background/40 rounded-xl border-border/60"
      />
      <Button
        type="submit"
        disabled={!value.trim()}
        className="w-full h-12 gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-95"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </form>
  );
}

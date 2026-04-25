import { useEffect, useState } from "react";
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
    border: "border-buy/30",
  },
  {
    key: "bear" as const,
    title: "Why to be careful",
    field: "bearCase" as const,
    accent: "text-short",
    border: "border-short/30",
  },
  {
    key: "triggers" as const,
    title: "What would change the rating",
    field: "ratingChangeTriggers" as const,
    accent: "text-hold",
    border: "border-hold/30",
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
      "Similar role at stronger company",
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

export function AnalysisDashboard({ company, role, analysis, onDecision }: Props) {
  const [showThesis, setShowThesis] = useState(false);
  const [showIntent, setShowIntent] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowThesis(true), 400);
    const t2 = setTimeout(() => setShowIntent(true), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen pb-24">
      {/* minimal header */}
      <div className="border-b border-border/60 bg-background/60 backdrop-blur sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {company} · {role}
            </div>
            <div className="font-mono text-base font-semibold">{analysis.ticker}</div>
          </div>
          <RatingPill rating={analysis.rating} size="md" />
        </div>
      </div>

      <div className="container py-16 max-w-2xl space-y-16">
        {/* verdict line */}
        <section className="text-center space-y-4 animate-fade-in-up">
          <p
            className={`font-display text-3xl md:text-4xl font-semibold ${ratingColorClass(
              analysis.rating,
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
          <p className="text-lg text-muted-foreground italic max-w-xl mx-auto leading-relaxed">
            "{analysis.oneLineVerdict}"
          </p>
        </section>

        {/* investment thesis — 3 expandable cards */}
        {showThesis && (
          <section className="space-y-3 animate-fade-in-up">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center mb-4">
              Investment Thesis
            </div>
            {SECTIONS.map((s, i) => (
              <ThesisCard
                key={s.key}
                title={s.title}
                items={(analysis as any)[s.field] as string[]}
                accent={s.accent}
                border={s.border}
                delay={i * 120}
              />
            ))}
          </section>
        )}

        {/* AI-native intent flow */}
        {showIntent && (
          <IntentFlow
            onDecide={(d) => onDecision(d)}
            options={INTENT_OPTIONS}
            subQuestions={SUB_INTENT}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------- Thesis card -------------------- */

function ThesisCard({
  title,
  items,
  accent,
  border,
  delay,
}: {
  title: string;
  items: string[];
  accent: string;
  border: string;
  delay: number;
}) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!open) return;
    setRevealed(0);
    items.slice(0, 3).forEach((_, i) => {
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 200 + i * 280);
    });
  }, [open, items]);

  return (
    <div
      className={`rounded-xl border ${open ? border : "border-border/60"} bg-card/30 backdrop-blur transition-colors animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-card/40 transition-colors"
      >
        <span className={`font-display text-base md:text-lg font-medium ${open ? accent : "text-foreground"}`}>
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 space-y-2.5 border-t border-border/40 pt-4">
          {items.slice(0, 3).map((it, i) =>
            i < revealed ? (
              <p
                key={i}
                className="text-sm md:text-[15px] text-foreground/85 leading-relaxed animate-fade-in-up flex gap-2"
              >
                <span className={`shrink-0 ${accent}`}>·</span>
                <span>{it}</span>
              </p>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------- Intent flow -------------------- */

function IntentFlow({
  onDecide,
  options,
  subQuestions,
}: {
  onDecide: (d: DecisionContext) => void;
  options: { id: Intent; label: string }[];
  subQuestions: Record<Exclude<Intent, "other">, { question: string; options: string[] }>;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [otherText, setOtherText] = useState("");
  const [subText, setSubText] = useState("");

  // Step 1
  if (!intent) {
    return (
      <section className="space-y-6 animate-fade-in-up">
        <h3 className="font-display text-xl md:text-2xl font-medium text-center">
          Given this rating, what are you considering?
        </h3>
        <div className="space-y-2 max-w-md mx-auto">
          {options.map((o, i) => (
            <button
              key={o.id}
              onClick={() => setIntent(o.id)}
              className="w-full text-left px-5 py-4 rounded-lg border border-border/60 bg-card/30 hover:bg-card/60 hover:border-foreground/30 transition-all animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="text-[15px]">{o.label}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Step 2 — "other" → freetext only
  if (intent === "other") {
    return (
      <section className="space-y-6 animate-fade-in-up max-w-md mx-auto">
        <Locked label={options.find((o) => o.id === "other")!.label} onChange={() => setIntent(null)} />
        <h3 className="font-display text-xl font-medium text-center">
          Tell $JOB what you're thinking…
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = otherText.trim();
            if (!v) return;
            onDecide({ intent: "other", subIntent: v, freeText: v });
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="e.g. take a sabbatical, switch industries…"
            className="h-12 bg-background/40"
          />
          <Button
            type="submit"
            disabled={!otherText.trim()}
            className="w-full h-11 gap-2 bg-primary text-primary-foreground"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </section>
    );
  }

  const sub = subQuestions[intent];

  return (
    <section className="space-y-6 animate-fade-in-up max-w-md mx-auto">
      <Locked
        label={options.find((o) => o.id === intent)!.label}
        onChange={() => {
          setIntent(null);
          setSubText("");
        }}
      />
      <h3 className="font-display text-xl font-medium text-center">{sub.question}</h3>
      <div className="space-y-2">
        {sub.options.map((o, i) => {
          const isOther = o === "Other";
          if (isOther) {
            return (
              <form
                key={o}
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = subText.trim();
                  if (!v) return;
                  onDecide({ intent, subIntent: v, freeText: v });
                }}
                className="flex gap-2 animate-fade-in-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <Input
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                  placeholder="Other…"
                  className="h-11 bg-background/40"
                />
                <Button
                  type="submit"
                  disabled={!subText.trim()}
                  variant="outline"
                  className="h-11"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            );
          }
          return (
            <button
              key={o}
              onClick={() => onDecide({ intent, subIntent: o })}
              className="w-full text-left px-5 py-3.5 rounded-lg border border-border/60 bg-card/30 hover:bg-card/60 hover:border-foreground/30 transition-all animate-fade-in-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="text-[15px]">{o}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Locked({ label, onChange }: { label: string; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-border/60 bg-card/20 text-sm">
      <span className="text-muted-foreground">
        Considering: <span className="text-foreground">{label}</span>
      </span>
      <button
        onClick={onChange}
        className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        change
      </button>
    </div>
  );
}

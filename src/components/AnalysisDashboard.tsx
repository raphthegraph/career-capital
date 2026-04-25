import type { Analysis, Decision } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { TrendingUp, TrendingDown, Zap, ArrowRightLeft, Building2, ChevronDown, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  onDecision: (d: Decision) => void;
}

type SectionKey = "bull" | "bear" | "triggers";

export function AnalysisDashboard({ company, role, analysis, onDecision }: Props) {
  // Sequential reveal of sections — user clicks to advance.
  const [unlocked, setUnlocked] = useState<number>(1); // first section auto-open
  const [decisionRevealed, setDecisionRevealed] = useState(false);

  // When all 3 sections unlocked, reveal decision after a beat
  useEffect(() => {
    if (unlocked >= 3 && !decisionRevealed) {
      const t = setTimeout(() => setDecisionRevealed(true), 600);
      return () => clearTimeout(t);
    }
  }, [unlocked, decisionRevealed]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="container py-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-mono">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {company} · {role}
              </div>
              <div className="text-2xl font-bold">{analysis.ticker}</div>
            </div>
            <RatingPill rating={analysis.rating} size="lg" />
          </div>
          <div className="font-mono text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Asset Score
            </div>
            <div className={`text-2xl font-bold ${ratingColorClass(analysis.rating)}`}>
              {analysis.careerAssetScore.toFixed(0)}
              <span className="text-xs text-muted-foreground ml-2">
                · {analysis.confidence}% conf.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 max-w-4xl space-y-8">
        {analysis._warning && (
          <div className="card-terminal rounded p-3 font-mono text-xs text-hold border-hold/40">
            ⚠ {analysis._warning}
          </div>
        )}

        {/* Verdict line */}
        <section className="text-center space-y-3 animate-fade-in-up">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Verdict
          </div>
          <p
            className={`font-display text-3xl md:text-5xl font-bold ${ratingColorClass(
              analysis.rating
            )}`}
          >
            {analysis.wouldBuy}.
          </p>
          <p className="text-lg text-foreground/90 italic max-w-2xl mx-auto">
            "{analysis.oneLineVerdict}"
          </p>
          <div className="font-mono text-xs text-muted-foreground pt-2">
            Read each section below — click to continue.
          </div>
        </section>

        {/* Sequential narrative sections */}
        <section className="space-y-3">
          <NarrativeSection
            index={0}
            unlocked={unlocked >= 1}
            isCurrent={unlocked === 1}
            onContinue={() => setUnlocked((u) => Math.max(u, 2))}
            title="Why this job works"
            icon={TrendingUp}
            accent="text-buy"
            border="border-buy/40"
            items={analysis.bullCase}
            evidence={analysis.evidence.momentumSignals}
            evidenceLabel="Momentum signals"
            continueLabel="Show what could break it"
          />
          <NarrativeSection
            index={1}
            unlocked={unlocked >= 2}
            isCurrent={unlocked === 2}
            onContinue={() => setUnlocked((u) => Math.max(u, 3))}
            title="Why this job breaks"
            icon={TrendingDown}
            accent="text-short"
            border="border-short/40"
            items={analysis.bearCase}
            evidence={analysis.evidence.riskSignals}
            evidenceLabel="Risk signals"
            continueLabel="Show what changes the rating"
          />
          <NarrativeSection
            index={2}
            unlocked={unlocked >= 3}
            isCurrent={unlocked === 3}
            onContinue={() => setDecisionRevealed(true)}
            title="What changes the rating"
            icon={Zap}
            accent="text-hold"
            border="border-hold/40"
            items={analysis.ratingChangeTriggers}
            evidence={[...analysis.evidence.hiringSignals, ...analysis.evidence.companySignals]}
            evidenceLabel="Watch signals"
            continueLabel="Make a decision"
          />
        </section>

        {/* Decision */}
        {decisionRevealed && (
          <section className="pt-8 animate-fade-in-up">
            <div className="text-center mb-2 space-y-2">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Trade Ticket
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                What would you do with this position?
              </h2>
            </div>

            {/* Allocation banner */}
            <div className="card-terminal rounded-lg p-4 mb-6 mt-4 flex items-center justify-between">
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">Your portfolio:</span>{" "}
                <span className="text-foreground font-bold">
                  100% allocated to {analysis.ticker}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full w-full bg-buy" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">100%</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <DecisionCard
                title="Stay & Double Down"
                tag="DOUBLE DOWN"
                desc="Maximize upside. Promotion path, leverage, comp."
                accent="bg-buy"
                hoverGlow="hover:shadow-[0_0_30px_hsl(var(--buy)/0.4)]"
                onClick={() => onDecision("increase")}
                icon={TrendingUp}
              />
              <DecisionCard
                title="Start Transitioning"
                tag="REBALANCE"
                desc="Quietly explore higher-yield career assets."
                accent="bg-hold"
                hoverGlow="hover:shadow-[0_0_30px_hsl(var(--hold)/0.4)]"
                onClick={() => onDecision("reduce")}
                icon={ArrowRightLeft}
              />
              <DecisionCard
                title="Exit & Reallocate"
                tag="LIQUIDATE"
                desc="Liquidate. Redeploy your career capital."
                accent="bg-short"
                hoverGlow="hover:shadow-[0_0_30px_hsl(var(--short)/0.4)]"
                onClick={() => onDecision("exit")}
                icon={Building2}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* -------------------- Sequential narrative section -------------------- */

function NarrativeSection({
  index,
  unlocked,
  isCurrent,
  onContinue,
  title,
  icon: Icon,
  accent,
  border,
  items,
  evidence,
  evidenceLabel,
  continueLabel,
}: {
  index: number;
  unlocked: boolean;
  isCurrent: boolean;
  onContinue: () => void;
  title: string;
  icon: any;
  accent: string;
  border: string;
  items: string[];
  evidence: string[];
  evidenceLabel: string;
  continueLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);

  // Auto-open when this section unlocks
  useEffect(() => {
    if (unlocked && !open) {
      setOpen(true);
    }
  }, [unlocked, open]);

  // Stagger insight reveals when opened
  useEffect(() => {
    if (!open) return;
    setRevealed(0);
    items.forEach((_, i) => {
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 200 + i * 260);
    });
  }, [open, items]);

  if (!unlocked) {
    return (
      <div className="card-terminal rounded-lg p-5 opacity-40 select-none">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border border-dashed border-border" />
          <div className="font-display text-lg font-bold text-muted-foreground">
            {String(index + 1).padStart(2, "0")} · Locked
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-terminal rounded-lg overflow-hidden border ${
        open ? border : "border-border"
      } transition-all animate-fade-in-up`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-card/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${accent}`} />
          <h3 className="font-display text-xl md:text-2xl font-bold">{title}</h3>
          <span className="font-mono text-xs text-muted-foreground">· {items.length} insights</span>
        </div>
        <div
          className={`shrink-0 w-8 h-8 rounded-full grid place-items-center border border-border ${
            open ? "rotate-180" : ""
          } transition-transform`}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-6 space-y-5 border-t border-border/60">
          <ul className="space-y-2.5 pt-4">
            {items.map((it, i) =>
              i < revealed ? (
                <li
                  key={i}
                  className="flex gap-3 text-sm md:text-base text-foreground/90 animate-fade-in-up"
                >
                  <span className={`font-mono shrink-0 ${accent}`}>›</span>
                  <span>{it}</span>
                </li>
              ) : null
            )}
          </ul>

          {revealed >= items.length && evidence.length > 0 && (
            <div className="border-t border-border/60 pt-4 animate-fade-in">
              <div className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${accent}`}>
                {evidenceLabel}
              </div>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                {evidence.slice(0, 4).map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    · {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isCurrent && revealed >= items.length && (
            <div className="pt-4 flex justify-end animate-fade-in">
              <button
                onClick={onContinue}
                className={`font-mono text-xs px-4 py-2 rounded border ${border} ${accent} hover:bg-card/60 transition-colors flex items-center gap-2`}
              >
                {continueLabel} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionCard({
  title,
  tag,
  desc,
  accent,
  hoverGlow,
  onClick,
  icon: Icon,
}: {
  title: string;
  tag: string;
  desc: string;
  accent: string;
  hoverGlow: string;
  onClick: () => void;
  icon: any;
}) {
  return (
    <button
      onClick={onClick}
      className={`card-terminal rounded-lg p-6 text-left transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:border-primary/60 ${hoverGlow}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-5 h-5 text-foreground/60 group-hover:text-foreground transition" />
        <span
          className={`font-mono text-[10px] px-2 py-0.5 rounded ${accent} text-background font-bold`}
        >
          {tag}
        </span>
      </div>
      <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-foreground/85">{desc}</p>
      <div className="mt-4 font-mono text-xs text-primary opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
        EXECUTE <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  );
}

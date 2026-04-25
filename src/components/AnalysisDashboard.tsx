import type { Analysis, Decision } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Zap, ArrowRightLeft, Building2, ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  onDecision: (d: Decision) => void;
}

export function AnalysisDashboard({ company, role, analysis, onDecision }: Props) {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="container py-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-mono">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{company} · {role}</div>
              <div className="text-2xl font-bold">{analysis.ticker}</div>
            </div>
            <RatingPill rating={analysis.rating} size="lg" />
          </div>
          <div className="flex items-center gap-6 font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Asset Score</div>
              <div className={`text-2xl font-bold ${ratingColorClass(analysis.rating)}`}>{analysis.careerAssetScore.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</div>
              <div className="text-2xl font-bold">{analysis.confidence}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10 space-y-10">
        {analysis._warning && (
          <div className="card-terminal rounded p-3 font-mono text-xs text-hold border-hold/40">
            ⚠ {analysis._warning}
          </div>
        )}

        {/* Hero verdict line */}
        <section className="text-center space-y-3 animate-fade-in-up">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Verdict
          </div>
          <p className={`font-display text-3xl md:text-5xl font-bold ${ratingColorClass(analysis.rating)}`}>
            {analysis.wouldBuy}.
          </p>
          <p className="text-lg text-foreground/90 italic max-w-2xl mx-auto">"{analysis.oneLineVerdict}"</p>
        </section>

        {/* Mini chart */}
        <section className="card-terminal rounded-lg p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Price Action · 12M Synthetic</h2>
            <span className="font-mono text-xs text-muted-foreground">{analysis.ticker}</span>
          </div>
          <PriceChart data={analysis.chartData} rating={analysis.rating} />
        </section>

        {/* Three expandable narrative sections */}
        <section className="space-y-3">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Full Analysis · expand to read
          </div>
          <ExpandableSection
            title="Why this job works"
            icon={TrendingUp}
            accent="text-buy"
            border="border-buy/40"
            items={analysis.bullCase}
            evidence={analysis.evidence.momentumSignals}
            evidenceLabel="Momentum signals"
            defaultOpen
          />
          <ExpandableSection
            title="Why this job breaks"
            icon={TrendingDown}
            accent="text-short"
            border="border-short/40"
            items={analysis.bearCase}
            evidence={analysis.evidence.riskSignals}
            evidenceLabel="Risk signals"
          />
          <ExpandableSection
            title="What changes the rating"
            icon={Zap}
            accent="text-hold"
            border="border-hold/40"
            items={analysis.ratingChangeTriggers}
            evidence={[...analysis.evidence.hiringSignals, ...analysis.evidence.companySignals]}
            evidenceLabel="Watch signals"
          />
        </section>

        {/* Decision section */}
        <section className="pt-4">
          <div className="text-center mb-6 space-y-2">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Trade Ticket</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Given this rating, what would you do?
            </h2>
            <p className="text-sm text-muted-foreground">Pick a stance. We'll generate a personalized playbook next.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <DecisionCard
              title="Stay & Double Down"
              tag="DOUBLE DOWN"
              desc="Maximize upside in this role — promotion path, leverage, comp."
              micro="Best if your asset score is strong and you see a clear path to 10x impact here."
              accent="bg-buy"
              onClick={() => onDecision("increase")}
              icon={TrendingUp}
            />
            <DecisionCard
              title="Start Transitioning"
              tag="REBALANCE"
              desc="Quietly explore higher-yield career assets before you have to."
              micro="Best when momentum is fading or alternatives clearly outperform your current role."
              accent="bg-hold"
              onClick={() => onDecision("reduce")}
              icon={ArrowRightLeft}
            />
            <DecisionCard
              title="Exit & Reallocate"
              tag="LIQUIDATE"
              desc="Liquidate this position. Redeploy your career capital."
              micro="Best when risk dominates upside, or you're ready to start something of your own."
              accent="bg-short"
              onClick={() => onDecision("exit")}
              icon={Building2}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ExpandableSection({
  title,
  icon: Icon,
  accent,
  border,
  items,
  evidence,
  evidenceLabel,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  accent: string;
  border: string;
  items: string[];
  evidence: string[];
  evidenceLabel: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [revealed, setRevealed] = useState(defaultOpen ? items.length : 0);

  const toggle = () => {
    if (!open) {
      setOpen(true);
      // staggered reveal
      setRevealed(0);
      items.forEach((_, i) => {
        setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 120 + i * 180);
      });
    } else {
      setOpen(false);
    }
  };

  return (
    <div className={`card-terminal rounded-lg overflow-hidden border ${open ? border : "border-border"} transition-colors`}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-card/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${accent}`} />
          <h3 className="font-display text-xl md:text-2xl font-bold">{title}</h3>
          <span className="font-mono text-xs text-muted-foreground">· {items.length} insights</span>
        </div>
        <div className={`shrink-0 w-8 h-8 rounded-full grid place-items-center border border-border ${open ? "rotate-180" : ""} transition-transform`}>
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

          {evidence.length > 0 && (
            <div className="border-t border-border/60 pt-4">
              <div className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${accent}`}>
                {evidenceLabel}
              </div>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                {evidence.slice(0, 6).map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground">· {e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ title, tag, desc, micro, accent, onClick, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className="card-terminal rounded-lg p-6 text-left hover:scale-[1.02] hover:border-primary/60 transition-all group relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-5 h-5 text-foreground/60 group-hover:text-foreground transition" />
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${accent} text-background font-bold`}>{tag}</span>
      </div>
      <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-foreground/85 mb-3">{desc}</p>
      <p className="text-xs text-muted-foreground italic">{micro}</p>
      <div className="mt-4 font-mono text-xs text-primary opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
        EXECUTE <Plus className="w-3 h-3" />
      </div>
    </button>
  );
}

function PriceChart({ data, rating }: { data: { month: string; price: number }[]; rating: string }) {
  const w = 700, h = 220, pad = 30;
  const max = Math.max(...data.map((d) => d.price));
  const min = Math.min(...data.map((d) => d.price));
  const range = max - min || 1;
  const dx = (w - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => ({
    x: pad + i * dx,
    y: pad + (h - pad * 2) - ((d.price - min) / range) * (h - pad * 2),
    p: d.price,
    m: d.month,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const trendUp = last.p >= first.p;
  const color = useMemo(() => {
    if (rating === "BUY") return "hsl(var(--buy))";
    if (rating === "HOLD") return "hsl(var(--hold))";
    if (rating === "SELL") return "hsl(var(--sell))";
    return "hsl(var(--short))";
  }, [rating]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-4xl font-bold">{last.p.toFixed(2)}</span>
        <span className={`font-mono text-sm ${trendUp ? "text-buy" : "text-short"}`}>
          {trendUp ? "▲" : "▼"} {(last.p - first.p).toFixed(2)} ({(((last.p - first.p) / first.p) * 100).toFixed(1)}%)
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={pad}
            x2={w - pad}
            y1={pad + (i * (h - pad * 2)) / 3}
            y2={pad + (i * (h - pad * 2)) / 3}
            stroke="hsl(var(--terminal-grid))"
            strokeDasharray="2 4"
          />
        ))}
        <path d={`${path} L ${last.x} ${h - pad} L ${first.x} ${h - pad} Z`} fill="url(#chart-fill)" />
        <path d={path} stroke={color} strokeWidth="2" fill="none" />
        <circle cx={last.x} cy={last.y} r="4" fill={color} className="animate-price-pulse" />
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text key={i} x={p.x} y={h - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10" fontFamily="monospace">
              {p.m}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

import type { Analysis, Decision } from "@/lib/job-types";
import { RatingPill, ratingColorClass } from "@/components/RatingPill";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, Zap, ArrowRightLeft, Target, Building2 } from "lucide-react";
import { useMemo } from "react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  onDecision: (d: Decision) => void;
}

const dims = [
  { key: "careerDividend", label: "Career Dividend", desc: "Compensation, stability, learning", icon: TrendingUp },
  { key: "momentum", label: "Momentum", desc: "Growth, news, hiring velocity", icon: Zap },
  { key: "volatility", label: "Volatility", desc: "Layoffs, regulation, strategy shifts", icon: AlertTriangle },
  { key: "upsideOptionality", label: "Upside Optionality", desc: "Promotion, equity, future roles", icon: Target },
  { key: "exitLiquidity", label: "Exit Liquidity", desc: "Convertibility to better opportunities", icon: ArrowRightLeft },
] as const;

export function AnalysisDashboard({ company, role, analysis, onDecision }: Props) {
  return (
    <div className="min-h-screen pb-32">
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
            <div className="hidden md:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</div>
              <div className="text-2xl font-bold">100%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {analysis._warning && (
          <div className="card-terminal rounded p-3 font-mono text-xs text-hold border-hold/40">
            ⚠ {analysis._warning}
          </div>
        )}

        {/* Asset Snapshot */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="card-terminal rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Price Action · 12M Synthetic</h2>
              <span className="font-mono text-xs text-muted-foreground">{analysis.ticker}</span>
            </div>
            <PriceChart data={analysis.chartData} rating={analysis.rating} />
          </div>
          <div className="card-terminal rounded-lg p-6 space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Verdict</h2>
            <p className={`font-display text-2xl font-bold ${ratingColorClass(analysis.rating)}`}>
              {analysis.wouldBuy}.
            </p>
            <p className="text-foreground/90 italic">"{analysis.oneLineVerdict}"</p>
            <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <div className="text-muted-foreground uppercase tracking-wider">Position</div>
                <div className="text-base font-bold">100% allocated</div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wider">Recommended</div>
                <div className={`text-base font-bold ${ratingColorClass(analysis.rating)}`}>{analysis.rating}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Dimensions */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Career Asset Breakdown</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {dims.map(({ key, label, desc, icon: Icon }) => {
              const d = analysis.dimensions[key];
              return (
                <div key={key} className="card-terminal rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-[10px] text-muted-foreground">{d.signalCount} signals</span>
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-bold">{d.score.toFixed(0)}</div>
                    <ScoreBar score={d.score} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed border-t border-border pt-3">
                    {d.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Thesis */}
        <section className="grid lg:grid-cols-3 gap-4">
          <ThesisCard title="Bull Case" items={analysis.bullCase} icon={TrendingUp} color="text-buy" />
          <ThesisCard title="Bear Case" items={analysis.bearCase} icon={TrendingDown} color="text-short" />
          <ThesisCard title="Rating Triggers" items={analysis.ratingChangeTriggers} icon={Zap} color="text-hold" />
        </section>

        {/* Evidence */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Evidence Panel</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <EvidenceCard title="Momentum" items={analysis.evidence.momentumSignals} accent="text-buy" />
            <EvidenceCard title="Risk" items={analysis.evidence.riskSignals} accent="text-short" />
            <EvidenceCard title="Hiring" items={analysis.evidence.hiringSignals} accent="text-hold" />
            <EvidenceCard title="Company" items={analysis.evidence.companySignals} accent="text-terminal-cyan" />
          </div>
        </section>

        {/* Decision */}
        <section className="pt-6">
          <div className="text-center mb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Trade Ticket</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Given this asset rating, what would you do?
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <DecisionCard
              title="Increase Position"
              tag="DOUBLE DOWN"
              desc="I want to maximize upside in this role."
              accent="bg-buy"
              onClick={() => onDecision("increase")}
              icon={TrendingUp}
            />
            <DecisionCard
              title="Reduce Position"
              tag="REBALANCE"
              desc="I want to explore better opportunities."
              accent="bg-hold"
              onClick={() => onDecision("reduce")}
              icon={ArrowRightLeft}
            />
            <DecisionCard
              title="Exit Position"
              tag="LIQUIDATE"
              desc="I want to leave and reallocate my career capital."
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

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-buy" : score >= 50 ? "bg-hold" : "bg-short";
  return (
    <div className="h-1 bg-muted rounded mt-1 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
    </div>
  );
}

function ThesisCard({ title, items, icon: Icon, color }: { title: string; items: string[]; icon: any; color: string }) {
  return (
    <div className="card-terminal rounded-lg p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className={`font-mono ${color}`}>›</span>
            <span className="text-foreground/90">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceCard({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div className="card-terminal rounded p-4 space-y-2">
      <div className={`font-mono text-[10px] uppercase tracking-widest ${accent}`}>{title}</div>
      <ul className="space-y-1.5">
        {items.length === 0 ? (
          <li className="text-xs text-muted-foreground italic">No signals.</li>
        ) : (
          items.map((it, i) => (
            <li key={i} className="text-xs text-foreground/80 leading-relaxed">· {it}</li>
          ))
        )}
      </ul>
    </div>
  );
}

function DecisionCard({ title, tag, desc, accent, onClick, icon: Icon }: any) {
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
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 font-mono text-xs text-primary opacity-0 group-hover:opacity-100 transition">
        EXECUTE →
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
        {/* grid lines */}
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

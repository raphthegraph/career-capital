import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Analysis, Decision, IncreaseData, ReduceData, ExitData } from "@/lib/job-types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowRightLeft, Sparkles, Building2 } from "lucide-react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  decision: Decision;
  onBack: () => void;
  onRestart: () => void;
}

const TITLES: Record<Decision, { title: string; tagline: string; loading: string; tag: string; accent: string }> = {
  increase: {
    title: "Stay & Double Down",
    tagline: "Repricing your upside…",
    loading: "Building your repricing playbook",
    tag: "DOUBLE DOWN",
    accent: "bg-buy",
  },
  reduce: {
    title: "Start Transitioning",
    tagline: "Scanning alternative career assets…",
    loading: "Sourcing higher-yield opportunities",
    tag: "REBALANCE",
    accent: "bg-hold",
  },
  exit: {
    title: "Exit & Reallocate",
    tagline: "Simulating full career reallocation…",
    loading: "Modeling pivot scenarios and timeline",
    tag: "LIQUIDATE",
    accent: "bg-short",
  },
};

export function Recommendations({ company, role, analysis, decision, onBack, onRestart }: Props) {
  const [data, setData] = useState<IncreaseData | ReduceData | ExitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const meta = TITLES[decision];

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    (async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke("recommend-action", {
          body: { decision, company, role, analysis },
        });
        if (cancelled) return;
        if (err) {
          console.error(err);
          setError("Could not generate recommendations.");
          return;
        }
        setData(res?.data ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError("Network error.");
      }
    })();
    return () => { cancelled = true; };
  }, [decision, company, role]);

  // animated dots
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 400);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <div className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2 font-mono text-xs">
            <ArrowLeft className="w-4 h-4" /> Back to analysis
          </Button>
          <div className="font-mono text-xs">
            <span className="text-muted-foreground">{analysis.ticker} · </span>
            <span className={`px-2 py-0.5 rounded ${meta.accent} text-background font-bold`}>{meta.tag}</span>
          </div>
          <Button variant="ghost" onClick={onRestart} className="font-mono text-xs">New analysis</Button>
        </div>
      </div>

      <div className="container py-10 space-y-8">
        <header className="text-center space-y-3">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{meta.title}</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">
            {meta.tagline.replace("…", "")}
            <span className="text-primary">{".".repeat((tick % 4))}</span>
          </h1>
        </header>

        {!data && !error && <LoadingPanel label={meta.loading} />}
        {error && <div className="card-terminal rounded p-6 text-short font-mono text-sm">{error}</div>}

        {data && decision === "increase" && <IncreaseView data={data as IncreaseData} />}
        {data && decision === "reduce" && <ReduceView data={data as ReduceData} />}
        {data && decision === "exit" && <ExitView data={data as ExitData} company={company} />}
      </div>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  const lines = [
    "Loading market context…",
    "Cross-referencing public signals…",
    "Synthesizing recommendations…",
    "Generating personalized output…",
  ];
  return (
    <div className="card-terminal rounded-lg p-8 max-w-2xl mx-auto space-y-4 relative overflow-hidden scan-line">
      <div className="font-mono text-sm text-primary blink">▶ {label}_</div>
      <ul className="space-y-2 font-mono text-xs text-muted-foreground">
        {lines.map((l, i) => (
          <li key={l} className="animate-fade-in" style={{ animationDelay: `${i * 250}ms` }}>· {l}</li>
        ))}
      </ul>
      <div className="h-1 bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{
            width: "40%",
            backgroundImage: "linear-gradient(90deg, transparent, hsl(var(--primary)) 50%, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

// --- INCREASE ---
function IncreaseView({ data }: { data: IncreaseData }) {
  const sections = [
    { title: "Promotion Strategy", items: data.promotionStrategy, accent: "text-buy" },
    { title: "Skills to Build", items: data.skillsToBuild, accent: "text-terminal-cyan" },
    { title: "Internal Moves", items: data.internalMoves, accent: "text-hold" },
    { title: "Relationship Map", items: data.relationshipMap, accent: "text-primary" },
  ];
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="card-terminal rounded-lg p-5">
            <div className={`font-mono text-xs uppercase tracking-widest mb-3 ${s.accent}`}>{s.title}</div>
            <ul className="space-y-2">
              {s.items.map((it, i) => (
                <li key={i} className="text-sm flex gap-2"><span className={s.accent}>›</span><span>{it}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card-terminal rounded-lg p-6">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">30 / 60 / 90 — Day Plan</div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { l: "Day 0–30", items: data.plan30 },
            { l: "Day 31–60", items: data.plan60 },
            { l: "Day 61–90", items: data.plan90 },
          ].map((x) => (
            <div key={x.l}>
              <div className="font-mono text-2xl font-bold mb-2">{x.l}</div>
              <ul className="space-y-1.5 text-sm text-foreground/90">
                {x.items.map((it, i) => <li key={i}>· {it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Highlight icon={TrendingUp} label="Increase Dividend" body={data.increaseDividend} accent="text-buy" />
        <Highlight icon={TrendingDown} label="Reduce Volatility" body={data.reduceVolatility} accent="text-hold" />
        <Highlight icon={Sparkles} label="Unlock Upside" body={data.unlockUpside} accent="text-primary" />
      </div>
    </div>
  );
}

function Highlight({ icon: Icon, label, body, accent }: any) {
  return (
    <div className="card-terminal rounded-lg p-5">
      <Icon className={`w-5 h-5 mb-2 ${accent}`} />
      <div className={`font-mono text-xs uppercase tracking-widest ${accent} mb-2`}>{label}</div>
      <p className="text-sm text-foreground/90">{body}</p>
    </div>
  );
}

// --- REDUCE ---
function ReduceView({ data }: { data: ReduceData }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Alternative Career Assets · {data.companies.length} matches</div>
      <div className="grid gap-4">
        {data.companies.map((c, i) => (
          <div key={i} className="card-terminal rounded-lg p-6 grid md:grid-cols-[1fr_2fr] gap-6 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-display text-2xl font-bold">{c.name}</h3>
              </div>
              <div className="font-mono text-xs text-muted-foreground">TICKER · {c.ticker}</div>
              <div className="inline-block px-2 py-1 rounded bg-secondary font-mono text-xs">{c.suggestedRole}</div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-foreground/90">{c.thesis}</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <KV label="Upside" v={c.upside} c="text-buy" />
                <KV label="Risk" v={c.risk} c="text-short" />
                <KV label="Liquidity" v={c.liquidity} c="text-terminal-cyan" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KV({ label, v, c }: { label: string; v: string; c: string }) {
  return (
    <div className="border border-border rounded p-2">
      <div className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${c}`}>{label}</div>
      <div className="text-foreground/90">{v}</div>
    </div>
  );
}

// --- EXIT ---
function ExitView({ data, company }: { data: ExitData; company: string }) {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <section>
        <div className="font-mono text-xs uppercase tracking-widest text-buy mb-3">Startup Ideas</div>
        <div className="grid md:grid-cols-2 gap-4">
          {data.startupIdeas.map((s, i) => (
            <div key={i} className="card-terminal rounded-lg p-5">
              <div className="font-display text-xl font-bold mb-2">{s.name}</div>
              <p className="text-sm text-foreground/90 mb-3">{s.pitch}</p>
              <div className="font-mono text-xs text-muted-foreground border-t border-border pt-3">
                FIT · {s.fit}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="font-mono text-xs uppercase tracking-widest text-hold mb-3">Career Pivots</div>
        <div className="grid md:grid-cols-3 gap-4">
          {data.careerPivots.map((p, i) => (
            <div key={i} className="card-terminal rounded-lg p-5">
              <div className="font-semibold mb-2">{p.path}</div>
              <p className="text-sm text-foreground/90 mb-3">{p.why}</p>
              <div className="font-mono text-xs text-muted-foreground border-t border-border pt-3">
                LEVERAGE · {p.leverage}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">If you exit this position…</div>
        <div className="card-terminal rounded-lg p-6">
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="absolute left-0 right-0 top-6 h-px bg-border hidden md:block" />
            {[
              { l: "Month 0", t: data.timeline.month0, c: "bg-primary" },
              { l: "Month 3", t: data.timeline.month3, c: "bg-hold" },
              { l: "Month 6", t: data.timeline.month6, c: "bg-terminal-cyan" },
              { l: "Month 12", t: data.timeline.month12, c: "bg-buy" },
            ].map((m, i) => (
              <div key={i} className="relative animate-fade-in-up" style={{ animationDelay: `${i * 120}ms` }}>
                <div className={`w-3 h-3 rounded-full ${m.c} mb-3 relative z-10`} />
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">{m.l}</div>
                <p className="text-sm">{m.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

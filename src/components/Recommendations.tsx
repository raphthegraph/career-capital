import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Analysis,
  ChatMessage,
  Decision,
  ExitData,
  IncreaseData,
  ReduceData,
} from "@/lib/job-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  decision: Decision;
  onBack: () => void;
  onRestart: () => void;
}

const META: Record<
  Decision,
  { title: string; tagline: string; tag: string; accent: string; phases: { label: string; preview: string }[] }
> = {
  increase: {
    title: "Stay & Double Down",
    tagline: "Repricing your upside",
    tag: "DOUBLE DOWN",
    accent: "bg-buy",
    phases: [
      { label: "Identifying promotion levers", preview: "Mapping scope you can claim this quarter…" },
      { label: "Mapping internal opportunities", preview: "Cross-team initiatives with executive visibility…" },
      { label: "Drafting 30/60/90 plan", preview: "Sequencing wins for max promo impact…" },
    ],
  },
  reduce: {
    title: "Start Transitioning",
    tagline: "Scanning higher-yield assets",
    tag: "REBALANCE",
    accent: "bg-hold",
    phases: [
      { label: "Sourcing alternative assets", preview: "Companies with strong momentum in your space…" },
      { label: "Scoring fit & liquidity", preview: "Where your brand converts best…" },
      { label: "Ranking by upside / risk", preview: "Top 3 alternatives surfacing…" },
    ],
  },
  exit: {
    title: "Exit & Reallocate",
    tagline: "Modeling full reallocation",
    tag: "LIQUIDATE",
    accent: "bg-short",
    phases: [
      { label: "Generating startup ideas", preview: "Adjacent to your domain expertise…" },
      { label: "Mapping career pivots", preview: "Higher-leverage paths with your background…" },
      { label: "Simulating 12-month timeline", preview: "Month-by-month reallocation arc…" },
    ],
  },
};

export function Recommendations({
  company,
  role,
  analysis,
  decision,
  onBack,
  onRestart,
}: Props) {
  const [data, setData] = useState<IncreaseData | ReduceData | ExitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = META[decision];

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
    return () => {
      cancelled = true;
    };
  }, [decision, company, role]);

  return (
    <div className="min-h-screen pb-12">
      <div className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2 font-mono text-xs">
            <ArrowLeft className="w-4 h-4" /> Back to analysis
          </Button>
          <div className="font-mono text-xs">
            <span className="text-muted-foreground">{analysis.ticker} · </span>
            <span className={`px-2 py-0.5 rounded ${meta.accent} text-background font-bold`}>
              {meta.tag}
            </span>
          </div>
          <Button variant="ghost" onClick={onRestart} className="font-mono text-xs">
            New analysis
          </Button>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {!data && !error && <StreamingLoader meta={meta} />}
        {error && (
          <div className="card-terminal rounded p-6 text-short font-mono text-sm">{error}</div>
        )}

        {data && (
          <Workspace
            company={company}
            role={role}
            analysis={analysis}
            decision={decision}
            data={data}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------- Streaming loader (left steps + right preview) -------------------- */

function StreamingLoader({ meta }: { meta: typeof META[Decision] }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= meta.phases.length) return;
    const id = setTimeout(() => setStep((s) => s + 1), 1300);
    return () => clearTimeout(id);
  }, [step, meta.phases.length]);

  return (
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 max-w-5xl mx-auto">
      {/* LEFT — phase steps */}
      <div className="card-terminal rounded-lg p-6 relative overflow-hidden scan-line">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          {meta.title}
        </div>
        <h2 className="font-display text-2xl font-bold mb-6">{meta.tagline}…</h2>
        <ol className="space-y-3">
          {meta.phases.map((p, i) => {
            const state = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <li key={p.label} className="font-mono text-sm flex items-start gap-3">
                <span className="w-5 pt-0.5 shrink-0">
                  {state === "done" ? (
                    <span className="text-buy">✓</span>
                  ) : state === "active" ? (
                    <span className="text-primary blink">▶</span>
                  ) : (
                    <span className="text-muted-foreground">·</span>
                  )}
                </span>
                <span
                  className={
                    state === "pending"
                      ? "text-muted-foreground"
                      : state === "active"
                      ? "text-foreground"
                      : "text-foreground/70"
                  }
                >
                  {p.label}
                  {state === "active" && <span className="ml-1 text-primary blink">_</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* RIGHT — live output appearing */}
      <div className="card-terminal rounded-lg p-6 min-h-[280px]">
        <div className="font-mono text-xs uppercase tracking-widest text-buy mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-buy blink" />
          Live output
        </div>
        <ul className="space-y-3">
          {meta.phases.map((p, i) =>
            i <= step ? (
              <li
                key={p.label}
                className="text-sm text-foreground/90 animate-fade-in-up flex gap-2"
              >
                <span className="text-primary font-mono">›</span>
                <span>{p.preview}</span>
              </li>
            ) : null
          )}
          {step < meta.phases.length && (
            <li className="font-mono text-xs text-muted-foreground italic">generating next insight…</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* -------------------- 2-column workspace (plan + chat) -------------------- */

function Workspace({
  company,
  role,
  analysis,
  decision,
  data,
}: {
  company: string;
  role: string;
  analysis: Analysis;
  decision: Decision;
  data: IncreaseData | ReduceData | ExitData;
}) {
  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 max-w-6xl mx-auto">
      {/* LEFT — concise plan */}
      <div className="space-y-4 animate-fade-in-up">
        {decision === "increase" && <IncreasePlan data={data as IncreaseData} />}
        {decision === "reduce" && <ReducePlan data={data as ReduceData} />}
        {decision === "exit" && <ExitPlan data={data as ExitData} />}
      </div>

      {/* RIGHT — chat */}
      <div
        className="lg:sticky lg:top-24 self-start animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <ChatPanel
          company={company}
          role={role}
          analysis={analysis}
          decision={decision}
          recommendation={data}
        />
      </div>
    </div>
  );
}

/* -------------------- Plan variants — each shows 3-5 key actions with expandable detail -------------------- */

function PlanCard({
  title,
  accent,
  border,
  children,
  defaultOpen = false,
  delay = 0,
}: {
  title: string;
  accent: string;
  border: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  delay?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`card-terminal rounded-lg overflow-hidden border ${
        open ? border : "border-border"
      } transition-colors animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-card/60 transition-colors"
      >
        <div className={`font-mono text-xs uppercase tracking-widest ${accent}`}>{title}</div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-5 border-t border-border/60 pt-4">{children}</div>}
    </div>
  );
}

function KeyActions({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="space-y-2">
      {items.slice(0, 5).map((it, i) => (
        <li
          key={i}
          className="flex gap-2 text-sm text-foreground/90 animate-fade-in-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className={`font-mono shrink-0 ${accent}`}>›</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function IncreasePlan({ data }: { data: IncreaseData }) {
  // Top 3-5 key actions = first item from each plan
  const headline = [
    data.promotionStrategy[0],
    data.skillsToBuild[0],
    data.internalMoves[0],
    data.plan30[0],
  ].filter(Boolean);

  return (
    <>
      <div className="card-terminal rounded-lg p-5 animate-fade-in-up">
        <div className="font-mono text-xs uppercase tracking-widest text-buy mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> Key actions · this quarter
        </div>
        <KeyActions items={headline as string[]} accent="text-buy" />
      </div>

      <PlanCard title="Promotion strategy" accent="text-buy" border="border-buy/40" delay={100}>
        <KeyActions items={data.promotionStrategy} accent="text-buy" />
      </PlanCard>
      <PlanCard title="Skills to build" accent="text-terminal-cyan" border="border-primary/40" delay={150}>
        <KeyActions items={data.skillsToBuild} accent="text-terminal-cyan" />
      </PlanCard>
      <PlanCard title="30 / 60 / 90 plan" accent="text-primary" border="border-primary/40" delay={200}>
        <div className="space-y-4">
          {[
            { l: "Day 0–30", items: data.plan30 },
            { l: "Day 31–60", items: data.plan60 },
            { l: "Day 61–90", items: data.plan90 },
          ].map((x) => (
            <div key={x.l}>
              <div className="font-mono text-xs text-muted-foreground mb-1.5">{x.l}</div>
              <KeyActions items={x.items} accent="text-primary" />
            </div>
          ))}
        </div>
      </PlanCard>

      <div className="grid sm:grid-cols-3 gap-3 pt-2">
        <Pill icon={TrendingUp} label="Dividend" body={data.increaseDividend} accent="text-buy" />
        <Pill icon={TrendingDown} label="Volatility" body={data.reduceVolatility} accent="text-hold" />
        <Pill icon={Sparkles} label="Upside" body={data.unlockUpside} accent="text-primary" />
      </div>
    </>
  );
}

function ReducePlan({ data }: { data: ReduceData }) {
  return (
    <>
      <div className="card-terminal rounded-lg p-5 animate-fade-in-up">
        <div className="font-mono text-xs uppercase tracking-widest text-hold mb-3">
          Alternative assets · top {data.companies.length}
        </div>
        <p className="text-sm text-foreground/80">
          Each is a higher-yield candidate to rebalance into. Click to expand.
        </p>
      </div>

      {data.companies.map((c, i) => (
        <PlanCard
          key={i}
          title={`${i + 1}. ${c.name} · ${c.ticker}`}
          accent="text-hold"
          border="border-hold/40"
          defaultOpen={i === 0}
          delay={i * 100}
        >
          <div className="space-y-3">
            <div className="inline-block px-2 py-1 rounded bg-secondary font-mono text-xs">
              {c.suggestedRole}
            </div>
            <p className="text-sm text-foreground/90">{c.thesis}</p>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <KV label="Upside" v={c.upside} c="text-buy" />
              <KV label="Risk" v={c.risk} c="text-short" />
              <KV label="Liquidity" v={c.liquidity} c="text-terminal-cyan" />
            </div>
          </div>
        </PlanCard>
      ))}
    </>
  );
}

function ExitPlan({ data }: { data: ExitData }) {
  return (
    <>
      <PlanCard title="Startup ideas" accent="text-buy" border="border-buy/40" defaultOpen delay={0}>
        <div className="space-y-4">
          {data.startupIdeas.map((s, i) => (
            <div key={i} className="border-l-2 border-buy/40 pl-3">
              <div className="font-display text-base font-bold mb-1">{s.name}</div>
              <p className="text-sm text-foreground/90 mb-1">{s.pitch}</p>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                FIT · {s.fit}
              </div>
            </div>
          ))}
        </div>
      </PlanCard>

      <PlanCard title="Career pivots" accent="text-hold" border="border-hold/40" delay={100}>
        <div className="space-y-3">
          {data.careerPivots.map((p, i) => (
            <div key={i}>
              <div className="font-semibold text-sm mb-1">{p.path}</div>
              <p className="text-sm text-foreground/85">{p.why}</p>
              <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                LEVERAGE · {p.leverage}
              </div>
            </div>
          ))}
        </div>
      </PlanCard>

      <PlanCard title="Reallocation timeline" accent="text-primary" border="border-primary/40" delay={200}>
        <div className="space-y-3">
          {[
            { l: "Month 0", t: data.timeline.month0, c: "bg-primary" },
            { l: "Month 3", t: data.timeline.month3, c: "bg-hold" },
            { l: "Month 6", t: data.timeline.month6, c: "bg-terminal-cyan" },
            { l: "Month 12", t: data.timeline.month12, c: "bg-buy" },
          ].map((m, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className={`w-2 h-2 rounded-full ${m.c} mt-2 shrink-0`} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                  {m.l}
                </div>
                <p className="text-sm">{m.t}</p>
              </div>
            </div>
          ))}
        </div>
      </PlanCard>
    </>
  );
}

function Pill({ icon: Icon, label, body, accent }: any) {
  return (
    <div className="card-terminal rounded p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <div className={`font-mono text-[10px] uppercase tracking-widest ${accent}`}>{label}</div>
      </div>
      <p className="text-xs text-foreground/85">{body}</p>
    </div>
  );
}

function KV({ label, v, c }: { label: string; v: string; c: string }) {
  return (
    <div className="border border-border rounded p-2">
      <div className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${c}`}>{label}</div>
      <div className="text-foreground/90 text-xs">{v}</div>
    </div>
  );
}

/* -------------------- Chat panel -------------------- */

function ChatPanel({
  company,
  role,
  analysis,
  decision,
  recommendation,
}: {
  company: string;
  role: string;
  analysis: Analysis;
  decision: Decision;
  recommendation: any;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `I've priced ${analysis.ticker} as ${analysis.rating}. Ask me anything — promotion levers, comp negotiation, exit timing, or how to validate a pivot.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("career-chat", {
        body: { company, role, decision, analysis, recommendation, messages: next },
      });
      if (error) throw error;
      setMessages([
        ...next,
        { role: "assistant", content: data?.reply ?? "No response." },
      ]);
    } catch (e) {
      console.error(e);
      setMessages([
        ...next,
        { role: "assistant", content: "Couldn't reach the AI — try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions =
    decision === "increase"
      ? ["What's the fastest promo lever?", "How do I negotiate scope?"]
      : decision === "reduce"
      ? ["Which company has best upside?", "How do I de-risk the move?"]
      : ["Which idea has best market fit?", "How do I validate before quitting?"];

  return (
    <div className="card-terminal rounded-lg flex flex-col h-[560px] overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          $JOB · advisor chat
        </div>
        <span className="font-mono text-[10px] text-buy blink">● ONLINE</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`animate-fade-in-up flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary/15 border border-primary/30 text-foreground"
                  : "bg-background/60 border border-border text-foreground/90"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-background/60 border border-border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground">
              thinking<span className="blink">_</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-3 border-t border-border space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="text-[11px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your career strategy…"
            className="h-10 bg-background/60 font-mono text-sm"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="bg-primary text-background hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Analysis, ChatMessage, DecisionContext, Recommendation } from "@/lib/job-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, AlertTriangle, Sparkles, Calendar, Compass } from "lucide-react";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  decision: DecisionContext;
  onBack: () => void;
  onRestart: () => void;
}

const LOAD_STEPS = [
  "Understanding your intent",
  "Repricing your current role",
  "Comparing alternative paths",
  "Creating recommendation",
];

export function Recommendations({
  company,
  role,
  analysis,
  decision,
  onBack,
  onRestart,
}: Props) {
  const [data, setData] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setData((res?.data as Recommendation) ?? null);
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
      <div className="border-b border-border/60 bg-background/60 backdrop-blur sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2 font-mono text-xs">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="font-mono text-[11px] text-muted-foreground">
            {analysis.ticker} · {decision.subIntent}
          </div>
          <Button variant="ghost" onClick={onRestart} className="font-mono text-xs">
            New analysis
          </Button>
        </div>
      </div>

      <div className="container py-16 max-w-2xl space-y-16">
        {!data && !error && <Loading />}
        {error && (
          <div className="rounded-lg border border-short/40 bg-card/30 p-6 text-short text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            <RecommendationView data={data} />
            <ChatPanel
              company={company}
              role={role}
              analysis={analysis}
              decision={decision}
              recommendation={data}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------- Loading -------------------- */

function Loading() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= LOAD_STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="max-w-md mx-auto space-y-8 animate-fade-in py-8">
      <h2 className="font-display text-xl md:text-2xl font-medium text-center">
        Building your next move…
      </h2>
      <ul className="space-y-3">
        {LOAD_STEPS.map((s, i) => {
          if (i > step) return null;
          const isCurrent = i === step;
          return (
            <li
              key={s}
              className={`flex items-center gap-3 text-sm animate-fade-in-up ${
                isCurrent ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCurrent ? "bg-foreground/70 animate-pulse" : "bg-primary"
                }`}
              />
              {s}
              {isCurrent && <span className="text-foreground/40 animate-pulse">…</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------- Recommendation -------------------- */

function RecommendationView({ data }: { data: Recommendation }) {
  return (
    <section className="space-y-12 animate-fade-in-up">
      <div className="text-center space-y-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Recommended move
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-semibold leading-tight max-w-xl mx-auto">
          {data.recommendedMove}
        </h2>
      </div>

      <Block title="Why" icon={Sparkles} accent="text-buy">
        {data.why.slice(0, 3).map((w, i) => (
          <Bullet key={i} text={w} dotClass="text-buy" />
        ))}
      </Block>

      <Block title="Next 30 days" icon={Calendar} accent="text-primary">
        {data.next30Days.slice(0, 3).map((w, i) => (
          <Bullet key={i} text={w} dotClass="text-primary" />
        ))}
      </Block>

      <Block title="Watch-outs" icon={AlertTriangle} accent="text-short">
        {data.watchOuts.slice(0, 2).map((w, i) => (
          <Bullet key={i} text={w} dotClass="text-short" />
        ))}
      </Block>

      <Block title="Alternative paths" icon={Compass} accent="text-hold">
        <div className="space-y-3">
          {data.alternativePaths.slice(0, 3).map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="font-medium text-[15px]">{p.label}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </div>
      </Block>
    </section>
  );
}

function Block({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: any;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="space-y-2 pl-5">{children}</div>
    </div>
  );
}

function Bullet({ text, dotClass }: { text: string; dotClass: string }) {
  return (
    <p className="text-[15px] text-foreground/90 leading-relaxed flex gap-2">
      <span className={`shrink-0 ${dotClass}`}>·</span>
      <span>{text}</span>
    </p>
  );
}

/* -------------------- Chat -------------------- */

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
  decision: DecisionContext;
  recommendation: Recommendation;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      setMessages([...next, { role: "assistant", content: data?.reply ?? "No response." }]);
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

  return (
    <section className="pt-8 border-t border-border/60 space-y-5">
      <div className="text-center space-y-1">
        <h3 className="font-display text-xl font-medium">Ask $JOB about your next move</h3>
        <p className="text-sm text-muted-foreground">
          Promotion, switching companies, startup ideas, salary negotiation…
        </p>
      </div>

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="rounded-xl border border-border/60 bg-card/20 max-h-[420px] overflow-y-auto p-4 space-y-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex animate-fade-in-up ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary/15 text-foreground"
                    : "bg-background/60 text-foreground/90 border border-border/60"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-2.5 text-sm font-mono text-muted-foreground">
                thinking<span className="animate-pulse">…</span>
              </div>
            </div>
          )}
        </div>
      )}

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
          placeholder="Ask about promotion, switching companies, startup ideas, salary negotiation…"
          className="h-12 bg-background/40"
          disabled={loading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          className="h-12 w-12 bg-primary text-primary-foreground hover:opacity-90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </section>
  );
}

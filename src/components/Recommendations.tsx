import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Analysis, ChatMessage, DecisionContext, Recommendation } from "@/lib/job-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowUp, AlertTriangle, Sparkles, Calendar, Compass } from "lucide-react";

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
  "Generating recommendation",
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
    <div className="min-h-screen pb-40">
      <div className="border-b border-border/50 bg-background/70 backdrop-blur-md sticky top-0 z-20">
        <div className="container py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-xs h-9">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div className="text-[11px] text-muted-foreground truncate max-w-[60%]">
            {analysis.ticker} · {decision.subIntent}
          </div>
          <Button variant="ghost" onClick={onRestart} className="text-xs h-9">
            New analysis
          </Button>
        </div>
      </div>

      <div className="container py-16 max-w-2xl space-y-16">
        {!data && !error && <Loading />}
        {error && (
          <div className="surface rounded-2xl p-6 text-short text-sm">{error}</div>
        )}
        {data && <RecommendationView data={data} />}
      </div>

      {/* Floating chat */}
      {data && (
        <FloatingChat
          company={company}
          role={role}
          analysis={analysis}
          decision={decision}
          recommendation={data}
        />
      )}
    </div>
  );
}

/* -------------------- Loading -------------------- */

function Loading() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= LOAD_STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 800);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="max-w-md mx-auto space-y-8 animate-fade-in py-10">
      <h2 className="font-display text-2xl md:text-[26px] font-semibold text-center tracking-tight">
        Building your next move…
      </h2>
      <ul className="space-y-3.5">
        {LOAD_STEPS.map((s, i) => {
          if (i > step) return null;
          const isCurrent = i === step;
          return (
            <li
              key={s}
              className={`flex items-center gap-3 text-[14.5px] animate-fade-in-soft ${
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

/* -------------------- Recommendation (sequential reveal) -------------------- */

const SECTION_DELAYS = [0, 600, 1300, 2100, 2900];

function RecommendationView({ data }: { data: Recommendation }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    const timers = SECTION_DELAYS.map((d, i) =>
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), d + 100),
    );
    return () => timers.forEach(clearTimeout);
  }, [data]);

  return (
    <section className="space-y-14">
      {revealed >= 1 && (
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="text-[11px] text-muted-foreground tracking-wide">Recommended move</div>
          <h2 className="font-display text-2xl md:text-[32px] font-semibold leading-[1.15] tracking-tight max-w-xl mx-auto">
            {data.recommendedMove}
          </h2>
        </div>
      )}

      {revealed >= 2 && (
        <Block title="Why this move" icon={Sparkles} accent="text-buy" dot="bg-buy">
          {data.why.slice(0, 3).map((w, i) => (
            <Bullet key={i} text={w} dot="bg-buy" />
          ))}
        </Block>
      )}

      {revealed >= 3 && (
        <Block title="Next 30 days" icon={Calendar} accent="text-primary" dot="bg-primary">
          {data.next30Days.slice(0, 3).map((w, i) => (
            <Bullet key={i} text={w} dot="bg-primary" />
          ))}
        </Block>
      )}

      {revealed >= 4 && (
        <Block title="Watch-outs" icon={AlertTriangle} accent="text-short" dot="bg-short">
          {data.watchOuts.slice(0, 2).map((w, i) => (
            <Bullet key={i} text={w} dot="bg-short" />
          ))}
        </Block>
      )}

      {revealed >= 5 && (
        <Block title="Alternative paths" icon={Compass} accent="text-hold" dot="bg-hold">
          <div className="space-y-3.5">
            {data.alternativePaths.slice(0, 3).map((p, i) => (
              <div key={i} className="space-y-1.5 animate-fade-in-soft" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-medium text-[15px] text-foreground/95">{p.label}</div>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>
        </Block>
      )}
    </section>
  );
}

function Block({
  title,
  icon: Icon,
  accent,
  dot,
  children,
}: {
  title: string;
  icon: any;
  accent: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className="text-[11px] text-muted-foreground tracking-wide">{title}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Bullet({ text, dot }: { text: string; dot: string }) {
  return (
    <p className="text-[14.5px] text-foreground/90 leading-relaxed flex gap-3">
      <span className={`shrink-0 mt-2 w-1 h-1 rounded-full ${dot}`} />
      <span className="flex-1">{text}</span>
    </p>
  );
}

/* -------------------- Floating Chat -------------------- */

function FloatingChat({
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
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const content = input.trim();
    if (!content || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setOpen(true);
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
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="container max-w-2xl pb-6 pt-4 pointer-events-auto">
        {open && messages.length > 0 && (
          <div className="mb-3 surface-elevated rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
              <span className="text-[11px] text-muted-foreground tracking-wide">
                Chat with $JOB
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                hide
              </button>
            </div>
            <div
              ref={scrollRef}
              className="max-h-[360px] overflow-y-auto p-4 space-y-3"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex animate-fade-in-soft ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary/15 text-foreground"
                        : "bg-background/60 text-foreground/90 border border-border/50"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
                    thinking<span className="animate-pulse">…</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="surface-elevated rounded-2xl flex items-center gap-2 p-2 pl-4"
          onFocus={() => messages.length > 0 && setOpen(true)}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask $JOB about your next move"
            className="flex-1 h-11 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:opacity-95"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

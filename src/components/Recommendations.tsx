import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Analysis, ChatMessage, DecisionContext, Recommendation } from "@/lib/job-types";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Compass,
  Sparkles,
} from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";
import { SourceChips } from "@/components/SourceChips";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  decision: DecisionContext;
  animationsEnabled: boolean;
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
  animationsEnabled,
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
          body: { decision, company, role, analysis, analysisId: analysis.analysisId },
        });
        if (cancelled) return;
        if (err) {
          console.error(err);
          setError("Could not generate recommendations.");
          return;
        }
        const recommendation = (res?.data ?? res) as Recommendation | null;
        if (!recommendation?.recommendedMove) {
          setError("Could not generate recommendations.");
          return;
        }
        setData(recommendation);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decision, company, role, analysis, analysis.analysisId]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-44 relative">
      <SignalGrid variant="recommendation" />

      <div className="relative z-10 mx-auto w-full max-w-[920px] px-4 py-10 sm:px-6 md:py-14">
        <main className="min-w-0 space-y-8">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={onRestart}
              className="h-9 rounded-full text-[12px] text-muted-foreground hover:bg-primary-tint hover:text-foreground"
            >
              New analysis
            </Button>
          </div>

          {!data && !error && <Loading />}
          {error && (
            <div className="air-card p-6 text-short text-sm">{error}</div>
          )}
          {data && (
            <RecommendationView
              data={data}
              analysis={analysis}
              decision={decision}
              animationsEnabled={animationsEnabled}
            />
          )}
        </main>
      </div>

      {data && (
        <FloatingChat
          company={company}
          role={role}
          analysis={analysis}
          decision={decision}
          recommendation={data}
          animationsEnabled={animationsEnabled}
        />
      )}
    </div>
  );
}

function Loading() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= LOAD_STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 540);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="mx-auto max-w-md space-y-8 animate-fade-in px-2 py-8 text-center">
      <h2 className="font-display text-[28px] md:text-[34px] font-[720] text-foreground">
        Composing your next move…
      </h2>
      <ul className="mx-auto max-w-[320px] space-y-3.5 text-left">
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
                  isCurrent ? "bg-primary animate-breathe" : "bg-primary/60"
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

// slower section reveal — let user read each block
const SECTION_DELAYS = [0, 760, 1580, 2400, 3220];

function scrollNearestIfNeeded(element: HTMLElement | null) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const viewportBottom = window.innerHeight - 120;
  if (rect.bottom > viewportBottom || rect.top < 88) {
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function RecommendationView({
  data,
  analysis,
  decision,
  animationsEnabled,
}: {
  data: Recommendation;
  analysis: Analysis;
  decision: DecisionContext;
  animationsEnabled: boolean;
}) {
  const [revealed, setRevealed] = useState(0);
  const refs = useRef([
    { current: null as HTMLDivElement | null },
    { current: null as HTMLDivElement | null },
    { current: null as HTMLDivElement | null },
    { current: null as HTMLDivElement | null },
    { current: null as HTMLDivElement | null },
  ]);

  useEffect(() => {
    if (!animationsEnabled) {
      setRevealed(SECTION_DELAYS.length);
      return;
    }

    setRevealed(0);
    const timers = SECTION_DELAYS.map((d, i) =>
      setTimeout(() => {
        setRevealed((r) => Math.max(r, i + 1));
        // gentle scroll to focus newly revealed section
        setTimeout(() => {
          scrollNearestIfNeeded(refs.current[i].current);
        }, 180);
      }, d + 100),
    );
    return () => timers.forEach(clearTimeout);
  }, [data, animationsEnabled]);

  // a section is "focused" if it is the most recently revealed one
  const focusIdx = revealed - 1;
  const researchSummary = analysis.keySignals?.slice(0, 2).map((signal) => signal.roleImpact || signal.impact) ?? [];
  const recommendationSources = data.sourceUrls?.length
    ? data.sourceUrls
    : analysis.keySignals?.flatMap((signal) => signal.sourceUrls ?? []).slice(0, 4) ?? [];
  const personalizationBasis = data.personalizationBasis?.filter(Boolean).slice(0, 4) ?? [];

  return (
    <section className="mx-auto max-w-[820px] space-y-10">
      <div ref={refs.current[0]} className={revealed >= 1 ? (focusIdx === 0 ? "dim-active" : "") : "hidden"}>
        {revealed >= 1 && (
          <div className="space-y-6 animate-fade-in-up py-2 text-center">
            <h2 className="font-display text-[40px] md:text-[56px] font-[760] leading-[1.06] text-foreground text-elegant">
              {data.recommendedMove}
            </h2>
            <div className="mx-auto grid max-w-[760px] gap-3 text-left md:grid-cols-2">
              <div className="rounded-[28px] border border-border/[0.035] bg-white/38 p-4 shadow-soft backdrop-blur-2xl">
                <div className="eyebrow">Because you said</div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/78">
                  {decision.intent} · {decision.subIntent}
                  {decision.freeText ? ` · ${decision.freeText}` : ""}
                </p>
              </div>
              <div className="rounded-[28px] border border-border/[0.035] bg-white/38 p-4 shadow-soft backdrop-blur-2xl">
                <div className="eyebrow">Because research shows</div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/78">
                  {researchSummary[0] ?? analysis.oneLineVerdict}
                </p>
              </div>
            </div>
            {personalizationBasis.length > 0 && (
              <div className="mx-auto flex max-w-[760px] flex-wrap justify-center gap-2">
                {personalizationBasis.map((basis) => (
                  <span
                    key={basis}
                    className="rounded-full border border-primary/10 bg-white/42 px-3 py-1.5 text-[11.5px] font-semibold text-primary-strong shadow-soft backdrop-blur-xl"
                  >
                    {basis}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-center">
              <SourceChips urls={recommendationSources} sources={analysis.sources ?? []} />
            </div>
          </div>
        )}
      </div>

      <div ref={refs.current[1]} className={revealed >= 2 ? (focusIdx === 1 ? "dim-active" : focusIdx > 1 ? "dim" : "") : "hidden"}>
        {revealed >= 2 && (
          <Block title="Why this move" icon={Sparkles} accent="text-buy">
            {data.why.slice(0, 3).map((w, i) => (
              <Bullet key={i} text={w} icon={CheckCircle2} accent="text-buy" />
            ))}
          </Block>
        )}
      </div>

      <div ref={refs.current[2]} className={revealed >= 3 ? (focusIdx === 2 ? "dim-active" : focusIdx > 2 ? "dim" : "") : "hidden"}>
        {revealed >= 3 && (
          <Block title="Next 30 days" icon={Calendar} accent="text-primary-strong">
            {data.next30Days.slice(0, 3).map((w, i) => (
              <Bullet key={i} text={w} icon={Calendar} accent="text-primary-strong" />
            ))}
          </Block>
        )}
      </div>

      <div ref={refs.current[3]} className={revealed >= 4 ? (focusIdx === 3 ? "dim-active" : focusIdx > 3 ? "dim" : "") : "hidden"}>
        {revealed >= 4 && (
          <Block title="Watch-outs" icon={AlertTriangle} accent="text-short">
            {data.watchOuts.slice(0, 2).map((w, i) => (
              <Bullet key={i} text={w} icon={AlertTriangle} accent="text-short" />
            ))}
          </Block>
        )}
      </div>

      <div ref={refs.current[4]} className={revealed >= 5 ? (focusIdx === 4 ? "dim-active" : "") : "hidden"}>
        {revealed >= 5 && (
          <Block title="Alternative paths" icon={Compass} accent="text-hold">
            <div className="space-y-3">
              {data.alternativePaths.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="section-row space-y-1.5 animate-fade-in-soft py-4"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="font-semibold text-[14.5px] text-foreground tracking-tight">
                    {p.label}
                  </div>
                  <p className="text-[14px] text-muted-foreground leading-[1.6]">{p.detail}</p>
                </div>
              ))}
            </div>
          </Block>
        )}
      </div>
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
  icon: LucideIcon;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-plain space-y-5 animate-fade-in-up border-t border-border/[0.055] py-5">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className="eyebrow">{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Bullet({
  text,
  icon: Icon,
  accent,
}: {
  text: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <p className="text-[15.5px] text-foreground/80 leading-[1.65] flex gap-3">
      <Icon className={`mt-1 h-4 w-4 shrink-0 ${accent}`} />
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
  animationsEnabled,
}: {
  company: string;
  role: string;
  analysis: Analysis;
  decision: DecisionContext;
  recommendation: Recommendation;
  animationsEnabled: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const streamAssistantReply = async (baseMessages: ChatMessage[], reply: string) => {
    if (!animationsEnabled) {
      setMessages([...baseMessages, { role: "assistant", content: reply }]);
      return;
    }

    const assistantIndex = baseMessages.length;
    setMessages([...baseMessages, { role: "assistant", content: "" }]);

    let cursor = 0;
    while (cursor < reply.length) {
      cursor = Math.min(reply.length, cursor + 3 + Math.floor(Math.random() * 5));
      const visibleReply = reply.slice(0, cursor);
      setMessages((current) =>
        current.map((message, index) =>
          index === assistantIndex ? { ...message, content: visibleReply } : message,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  };

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
        body: { company, role, decision, analysis, recommendation, messages: next, analysisId: analysis.analysisId },
      });
      if (error) throw error;
      await streamAssistantReply(next, data?.reply ?? "No response.");
    } catch (e) {
      console.error(e);
      await streamAssistantReply(next, "Couldn't reach the AI. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none" />

      <div className="relative px-6 pb-7 pt-4 pointer-events-auto flex justify-center">
        <div className="w-full max-w-[760px] space-y-3">
          {open && messages.length > 0 && (
            <div className="air-card overflow-hidden rounded-[30px] animate-fade-in-up">
              <div className="flex items-center justify-between px-5 py-3.5 border-b hairline">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-3.5 h-3.5 text-primary ${loading ? "animate-breathe" : ""}`} />
                  <span className="text-[12px] font-semibold tracking-tight text-foreground">
                    {loading ? "$JOB is writing" : "Chat with $JOB"}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  hide
                </button>
              </div>
              <div ref={scrollRef} className="max-h-[min(440px,52vh)] overflow-y-auto p-5 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex animate-fade-in-soft ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-[24px] px-4 py-3 text-[14px] leading-[1.6] whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/60 text-foreground/90 border border-border/[0.06]"
                      }`}
                    >
                      {m.content}
                      {loading && m.role === "assistant" && i === messages.length - 1 && (
                        <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-primary" />
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-[24px] px-4 py-2.5 text-[13px] text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-breathe" />
                      thinking
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="surface-floating rounded-full flex items-center gap-2 p-2 pl-6"
            onFocus={() => messages.length > 0 && setOpen(true)}
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask $JOB about your next move"
              className="flex-1 h-12 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-11 w-11 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 glow-primary"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

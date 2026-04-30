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
import { isMobileViewport } from "@/lib/viewport";

interface Props {
  company: string;
  role: string;
  analysis: Analysis;
  decision: DecisionContext;
  animationsEnabled: boolean;
  onRestart: () => void;
}

const LOAD_STEPS = [
  "Reading your answers",
  "Repricing stay vs leave",
  "Building your 30-day plan",
  "Grounding the recommendation",
];
const MIN_RECOMMENDATION_VISIBLE_MS = 9200;

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
    const startedAt = Date.now();
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
        if (animationsEnabled) {
          const remaining = MIN_RECOMMENDATION_VISIBLE_MS - (Date.now() - startedAt);
          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
          }
          if (cancelled) return;
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
  }, [decision, company, role, analysis, analysis.analysisId, animationsEnabled]);

  return (
    <div className="relative min-h-[100svh] pb-44">
      <SignalGrid variant="recommendation" intensity={!data && !error ? "active" : "quiet"} />

      <div className="relative z-10 mx-auto w-full max-w-[920px] px-4 pb-10 pt-[calc(5.75rem+env(safe-area-inset-top))] sm:px-6 sm:py-10 md:py-14">
        <main className="min-w-0 space-y-8">
          <div className="flex justify-start sm:justify-end">
            <Button
              variant="ghost"
              onClick={onRestart}
              className="h-9 rounded-full text-[12px] text-muted-foreground hover:bg-primary-tint hover:text-foreground"
            >
              New analysis
            </Button>
          </div>

          {!data && !error && (
            <Loading
              company={company}
              role={role}
              decision={decision}
              animationsEnabled={animationsEnabled}
            />
          )}
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

function Loading({
  company,
  role,
  decision,
  animationsEnabled,
}: {
  company: string;
  role: string;
  decision: DecisionContext;
  animationsEnabled: boolean;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!animationsEnabled) {
      setStep(LOAD_STEPS.length);
      return;
    }
    if (step >= LOAD_STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, LOAD_STEPS.length - 1)), 1800);
    return () => clearTimeout(t);
  }, [step, animationsEnabled]);

  const isFinished = !animationsEnabled;
  const activeStep = Math.min(step, LOAD_STEPS.length - 1);
  const progress = isFinished
    ? 100
    : Math.min(92, Math.round(((activeStep + 1) / LOAD_STEPS.length) * 100));
  const activeLabel = LOAD_STEPS[activeStep];

  return (
    <div className="mx-auto grid w-full max-w-[900px] items-center gap-7 px-0 py-4 animate-fade-in sm:px-2 sm:py-8 md:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5 text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/60 px-3 py-2 text-[12px] font-semibold text-muted-foreground shadow-soft backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-breathe" />
          {company} · {role}
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-[32px] font-[780] leading-[1.06] text-foreground sm:text-[38px] md:text-[48px]">
            Preparing your next move
          </h2>
          <p className="max-w-[430px] text-[15px] leading-[1.65] text-muted-foreground">
            $JOB is using your answers to turn the asset read into a focused decision memo.
          </p>
        </div>
        <div className="air-card inline-flex max-w-full items-center gap-2 rounded-[24px] px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate text-[13px] font-semibold text-foreground/78">
            {decision.intent} · {decision.subIntent}
          </span>
        </div>
        <div className="air-card max-w-[430px] overflow-hidden p-4">
          <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>Decision engine</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/[0.08]">
            <div
              className="relative h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            >
              {animationsEnabled && (
                <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-shimmer-line" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-foreground/78">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-breathe" />
            {activeLabel}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {LOAD_STEPS.map((label, index) => {
          const isComplete = index < activeStep || isFinished || !animationsEnabled;
          const isCurrent = index === activeStep && !isFinished && animationsEnabled;
          return (
            <div
              key={label}
              className={`relative overflow-hidden rounded-[28px] border border-border/[0.03] px-4 py-4 backdrop-blur-2xl transition-all duration-700 animate-fade-in-soft ${
                isCurrent
                  ? "scale-[1.012] bg-white/[0.52] opacity-100 shadow-floating"
                  : isComplete
                    ? "bg-white/[0.4] opacity-[0.85] shadow-soft"
                    : "bg-white/[0.24] opacity-[0.45]"
              }`}
            >
              {isCurrent && (
                <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent animate-shimmer-line" />
              )}
              <div className="flex items-center gap-3">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/55">
                  {isComplete ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                    </span>
                  ) : (
                    <>
                      <span className="absolute h-8 w-8 rounded-full border-[1.5px] border-primary/25" />
                      <span className="absolute h-8 w-8 rounded-full border-[1.5px] border-primary border-r-transparent animate-spin" style={{ animationDuration: "1.5s" }} />
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </>
                  )}
                </span>
                <div>
                  <div className="text-[15px] font-semibold tracking-tight text-foreground">
                    {label}
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted-foreground">
                    {isCurrent ? "working through your context…" : isComplete ? "complete" : "queued"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// slower section reveal — let user read each block
const SECTION_DELAYS = [0, 1400, 3000, 4800, 6600];
const CHAT_THINKING_STEPS = [
  "reading your question",
  "checking the memo",
  "grounding the answer",
  "writing a concise reply",
];

function scrollNearestIfNeeded(element: HTMLElement | null) {
  if (isMobileViewport()) return;
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s*\((https?:\/\/[^\s)]+)\)/g, " (source)")
    .replace(/https?:\/\/\S+/g, "source")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenWords(value: string, maxWords: number) {
  const cleaned = stripMarkdown(value);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function getDisplayHeadline(data: Recommendation, decision: DecisionContext, analysis: Analysis) {
  const headline = stripMarkdown(data.headline ?? "");
  if (headline && headline.length <= 54) return headline;

  if (decision.intent === "leave") return analysis.rating === "BUY" ? "Compare bigger upside" : "Leave with a plan";
  if (decision.intent === "stay") return "Stay, but make it compound";
  if (decision.intent === "other") return "Turn the next step into proof";
  return analysis.wouldBuy === "Yes" ? "Stay, keep options open" : "Stay, test the market";
}

function getBecauseYouSaid(data: Recommendation, decision: DecisionContext) {
  const fromAi = (data.becauseYouSaid ?? [])
    .map((item) => shortenWords(item, 11))
    .filter(Boolean)
    .slice(0, 3);
  if (fromAi.length >= 2) return fromAi;

  const intentLabel: Record<DecisionContext["intent"], string> = {
    stay: "You are open to staying.",
    options: "You want optionality.",
    leave: "You are considering leaving.",
    other: "You have a custom path in mind.",
  };
  const parts = decision.subIntent
    .split(/\s*(?:→|->|·)\s*/)
    .map((part) => shortenWords(part, 8))
    .filter(Boolean);

  return [
    intentLabel[decision.intent],
    ...parts,
    ...(decision.freeText ? [shortenWords(decision.freeText, 10)] : []),
  ].slice(0, 3);
}

function getBecauseResearchShows(data: Recommendation, analysis: Analysis) {
  const fromAi = (data.becauseResearchShows ?? [])
    .map((item) => shortenWords(item, 13))
    .filter(Boolean)
    .slice(0, 3);
  if (fromAi.length >= 2) return fromAi;

  const fromBasis = (data.personalizationBasis ?? [])
    .filter((item) => /public|research|signal|source|evidence/i.test(item))
    .map((item) => shortenWords(item, 13));
  const fromSignals = (analysis.keySignals ?? [])
    .map((signal) => shortenWords(signal.roleImpact || signal.impact, 13));

  return [...fromBasis, ...fromSignals, shortenWords(analysis.oneLineVerdict, 13)].filter(Boolean).slice(0, 3);
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
  const headline = getDisplayHeadline(data, decision, analysis);
  const becauseYouSaid = getBecauseYouSaid(data, decision);
  const becauseResearchShows = getBecauseResearchShows(data, analysis);

  return (
    <section className="mx-auto max-w-[880px] space-y-10">
      <div ref={refs.current[0]} className={revealed >= 1 ? (focusIdx === 0 ? "dim-active" : "") : "hidden"}>
        {revealed >= 1 && (
          <div className="space-y-7 animate-fade-in-up py-2 text-center">
            <div className="space-y-4">
              <div className="eyebrow">Recommended move</div>
              <h2 className="break-words font-display text-[36px] font-[780] leading-[1.05] text-foreground text-elegant sm:text-[48px] md:text-[62px] md:leading-[1.02]">
                {headline}
              </h2>
              <p className="mx-auto max-w-[720px] text-[16px] leading-[1.65] text-foreground/76 md:text-[18px]">
                {stripMarkdown(data.recommendedMove)}
              </p>
            </div>
            <div className="mx-auto grid max-w-[820px] gap-3 text-left md:grid-cols-2">
              <SummaryCard title="Because you said" items={becauseYouSaid} icon={Sparkles} accent="text-primary-strong" />
              <SummaryCard title="Because research shows" items={becauseResearchShows} icon={CheckCircle2} accent="text-buy" />
            </div>
          </div>
        )}
      </div>

      <div ref={refs.current[1]} className={revealed >= 2 ? (focusIdx === 1 ? "dim-active" : "") : "hidden"}>
        {revealed >= 2 && (
          <Block title="Why this move" icon={Sparkles} accent="text-buy">
            <div className="grid gap-3 md:grid-cols-3">
              {data.why.slice(0, 3).map((w, i) => (
                <MiniCard key={i} index={i + 1} text={w} accent="text-buy" />
              ))}
            </div>
          </Block>
        )}
      </div>

      <div ref={refs.current[2]} className={revealed >= 3 ? (focusIdx === 2 ? "dim-active" : "") : "hidden"}>
        {revealed >= 3 && (
          <Block title="Next 30 days" icon={Calendar} accent="text-primary-strong">
            <div className="space-y-2.5">
              {data.next30Days.slice(0, 3).map((w, i) => (
                <ActionRow key={i} index={i + 1} text={w} icon={Calendar} accent="text-primary-strong" />
              ))}
            </div>
          </Block>
        )}
      </div>

      <div ref={refs.current[3]} className={revealed >= 4 ? (focusIdx === 3 ? "dim-active" : "") : "hidden"}>
        {revealed >= 4 && (
          <Block title="Watch-outs" icon={AlertTriangle} accent="text-short">
            <div className="grid gap-3 md:grid-cols-2">
              {data.watchOuts.slice(0, 2).map((w, i) => (
                <MiniCard key={i} index={i + 1} text={w} accent="text-short" />
              ))}
            </div>
          </Block>
        )}
      </div>

      <div ref={refs.current[4]} className={revealed >= 5 ? (focusIdx === 4 ? "dim-active" : "") : "hidden"}>
        {revealed >= 5 && (
          <Block title="Alternative paths" icon={Compass} accent="text-hold">
            <div className="grid gap-3 md:grid-cols-3">
              {data.alternativePaths.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-[28px] border border-border/[0.065] bg-white/[0.84] p-4 shadow-soft backdrop-blur-2xl transition-all duration-500 hover:-translate-y-0.5 hover:bg-white/[0.9] hover:shadow-elevated animate-fade-in-soft"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-tint text-[12px] font-semibold text-primary-strong">
                      {i + 1}
                    </span>
                    <div className="font-semibold text-[14.5px] text-foreground tracking-tight">
                      {stripMarkdown(p.label)}
                    </div>
                  </div>
                  <p className="text-[14px] text-foreground/82 leading-[1.6]">{stripMarkdown(p.detail)}</p>
                </div>
              ))}
            </div>
          </Block>
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  items,
  icon: Icon,
  accent,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="rounded-[28px] border border-border/[0.06] bg-white/[0.82] p-4 shadow-soft backdrop-blur-2xl md:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${accent}`} />
        <span className="eyebrow">{title}</span>
      </div>
      <div className="space-y-2.5">
        {items.slice(0, 3).map((item) => (
          <p key={item} className="flex gap-2.5 text-[14.5px] leading-[1.55] text-foreground/86">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent}`} />
            <span>{item}</span>
          </p>
        ))}
      </div>
    </div>
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

function MiniCard({
  index,
  text,
  accent,
}: {
  index: number;
  text: string;
  accent: string;
}) {
  return (
    <div className="min-h-[150px] space-y-3 rounded-[28px] border border-border/[0.065] bg-white/[0.84] p-4 shadow-soft backdrop-blur-2xl transition-all duration-500 hover:-translate-y-0.5 hover:bg-white/[0.9] hover:shadow-elevated animate-fade-in-soft">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/55 text-[12px] font-semibold ${accent}`}>
        {index}
      </span>
      <p className="text-[14px] leading-[1.6] text-foreground/86">{stripMarkdown(text)}</p>
    </div>
  );
}

function ActionRow({
  index,
  text,
  icon: Icon,
  accent,
}: {
  index: number;
  text: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="rounded-[26px] border border-border/[0.065] bg-white/[0.84] p-4 shadow-soft backdrop-blur-2xl transition-all duration-500 hover:-translate-y-0.5 hover:bg-white/[0.9] hover:shadow-elevated">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[12px] font-semibold text-primary-strong">
          {index}
        </span>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${accent}`} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Action {index}
            </span>
          </div>
          <p className="text-[15px] leading-[1.62] text-foreground/88">{stripMarkdown(text)}</p>
        </div>
      </div>
    </div>
  );
}

function cleanChatLine(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-*]\s+/, "")
    .replace(/\s*\((https?:\/\/[^\s)]+)\)/g, " (source)")
    .replace(/https?:\/\/\S+/g, "source")
    .replace(/\s+/g, " ")
    .trim();
}

function formatChatText(value: string) {
  const lines = value
    .split(/\n+/)
    .map(cleanChatLine)
    .filter(Boolean);

  if (lines.length === 0) return { intro: "", bullets: [] };
  if (lines.length === 1) {
    const [firstSentence, ...rest] = lines[0].split(/(?<=\.)\s+/);
    const bullets = rest.filter(Boolean).slice(0, 3);
    return { intro: firstSentence, bullets };
  }

  return {
    intro: lines[0],
    bullets: lines.slice(1, 4),
  };
}

function ChatMessageText({ content }: { content: string }) {
  const formatted = formatChatText(content);
  if (!formatted.intro && formatted.bullets.length === 0) return null;

  return (
    <div className="space-y-2">
      {formatted.intro && <p>{formatted.intro}</p>}
      {formatted.bullets.length > 0 && (
        <ul className="space-y-1.5">
          {formatted.bullets.map((bullet, index) => (
            <li key={`${index}-${bullet}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/55" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [thinkingStep, setThinkingStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading || !animationsEnabled) {
      setThinkingStep(0);
      return;
    }
    const t = setInterval(
      () => setThinkingStep((current) => (current + 1) % CHAT_THINKING_STEPS.length),
      820,
    );
    return () => clearInterval(t);
  }, [loading, animationsEnabled]);

  const streamAssistantReply = async (baseMessages: ChatMessage[], reply: string) => {
    if (!animationsEnabled) {
      setMessages([...baseMessages, { role: "assistant", content: reply }]);
      return;
    }

    const assistantIndex = baseMessages.length;
    setMessages([...baseMessages, { role: "assistant", content: "" }]);

    let cursor = 0;
    while (cursor < reply.length) {
      cursor = Math.min(reply.length, cursor + 2 + Math.floor(Math.random() * 4));
      const visibleReply = reply.slice(0, cursor);
      setMessages((current) =>
        current.map((message, index) =>
          index === assistantIndex ? { ...message, content: visibleReply } : message,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 28));
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

      <div className="relative flex justify-center px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 pointer-events-auto sm:px-6 sm:pb-7">
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
              <div ref={scrollRef} className="max-h-[min(420px,52dvh)] space-y-3 overflow-y-auto p-4 sm:max-h-[min(440px,52vh)] sm:p-5">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex animate-fade-in-soft ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-[22px] px-4 py-3 text-[14px] leading-[1.6] sm:max-w-[88%] sm:rounded-[24px] ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                          : "bg-white/60 text-foreground/90 border border-border/[0.06]"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <ChatMessageText content={m.content} />
                      ) : (
                        m.content
                      )}
                      {loading && m.role === "assistant" && i === messages.length - 1 && (
                        <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-primary" />
                      )}
                    </div>
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="rounded-[24px] border border-border/[0.05] bg-white/58 px-4 py-3 text-[13px] text-muted-foreground shadow-soft backdrop-blur-xl">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-breathe" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/55 animate-breathe [animation-delay:160ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-breathe [animation-delay:320ms]" />
                        </span>
                        <span>{CHAT_THINKING_STEPS[thinkingStep]}</span>
                      </div>
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
            className="surface-floating flex items-center gap-2 rounded-[30px] p-2 pl-4 sm:rounded-full sm:pl-6"
            onFocus={() => messages.length > 0 && setOpen(true)}
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask $JOB about your next move"
              className="h-11 min-w-0 flex-1 bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-12 sm:text-[15px]"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 glow-primary sm:h-11 sm:w-11"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

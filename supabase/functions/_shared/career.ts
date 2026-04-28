import type { ResearchPacket, ResearchSource, SourceBackedClaim, SourceQuality } from "./tavily.ts";

export type Rating = "BUY" | "HOLD" | "SELL" | "SHORT";
export type WouldBuy = "Yes" | "No" | "Conditional";
export type InsightLevel =
  | "strong"
  | "rising"
  | "neutral"
  | "limited"
  | "blocked"
  | "high"
  | "low"
  | "declining"
  | "weak";
export type SignalSentiment = "positive" | "negative" | "neutral" | "mixed";

export interface Dimension {
  score: number;
  explanation: string;
  signalCount: number;
}

export interface QualitativeInsight {
  label: string;
  value: string;
  level: InsightLevel;
  detail: string;
}

export interface JobKeySignal {
  label: string;
  detail: string;
  impact: string;
  evidence: string;
  sentiment: SignalSentiment;
  sourceUrls: string[];
  roleImpact?: string;
  confidenceReason?: string;
}

export interface InvestmentThesis {
  keep: string[];
  caution: string[];
  triggers: string[];
}

export interface AnalysisSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
}

export interface CareerAnalysis {
  ticker: string;
  rating: Rating;
  wouldBuy: WouldBuy;
  confidence: number;
  oneLineVerdict: string;
  careerAssetScore: number;
  dimensions: {
    careerDividend: Dimension;
    momentum: Dimension;
    volatility: Dimension;
    upsideOptionality: Dimension;
    exitLiquidity: Dimension;
  };
  qualitativeInsights: QualitativeInsight[];
  keySignals: JobKeySignal[];
  investmentThesis: InvestmentThesis;
  bullCase: string[];
  bearCase: string[];
  ratingChangeTriggers: string[];
  evidence: {
    momentumSignals: string[];
    riskSignals: string[];
    hiringSignals: string[];
    companySignals: string[];
  };
  sources: AnalysisSource[];
  chartData: { month: string; price: number }[];
  researchQuality?: SourceQuality;
  evidenceMap?: Record<string, SourceBackedClaim[]>;
  _warning?: string;
  analysisId?: string;
  _cached?: boolean;
}

export interface DecisionContext {
  intent: "stay" | "options" | "leave" | "other";
  subIntent: string;
  freeText?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Recommendation {
  recommendedMove: string;
  why: string[];
  next30Days: string[];
  watchOuts: string[];
  alternativePaths: { label: string; detail: string }[];
  personalizationBasis?: string[];
  sourceUrls?: string[];
}

interface AnalysisProfile {
  rating: Rating;
  wouldBuy: WouldBuy;
  confidence: number;
  oneLineVerdict: string;
  careerAssetScore: number;
  dimensions: CareerAnalysis["dimensions"];
  qualitativeInsights: QualitativeInsight[];
  keySignals: JobKeySignal[];
  investmentThesis: InvestmentThesis;
  evidence: CareerAnalysis["evidence"];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function takeStrings(value: unknown, count: number, fallback: string[]) {
  if (!Array.isArray(value)) return fallback.slice(0, count);

  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, count);

  if (cleaned.length >= count) return cleaned;
  return [...cleaned, ...fallback.slice(cleaned.length, count)];
}

function toStringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function takeUrls(value: unknown, fallback: string[] = []) {
  const urls = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item)).slice(0, 5)
    : [];

  return urls.length ? urls : fallback.slice(0, 5);
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function toInsightLevel(sentiment: SignalSentiment): InsightLevel {
  switch (sentiment) {
    case "positive":
      return "strong";
    case "negative":
      return "high";
    case "mixed":
      return "limited";
    default:
      return "neutral";
  }
}

function toInsightValue(sentiment: SignalSentiment) {
  switch (sentiment) {
    case "positive":
      return "Supportive";
    case "negative":
      return "Pressured";
    case "mixed":
      return "Mixed";
    default:
      return "Watch";
  }
}

export function normalizeValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeCompanyRole(company: string, role: string) {
  return {
    company: company.trim(),
    role: role.trim(),
    normalizedCompany: normalizeValue(company),
    normalizedRole: normalizeValue(role),
  };
}

export function makeTicker(company: string, role: string) {
  const companyPart = company.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "JOB";
  const rolePart =
    role
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "X";
  return `${companyPart}-${rolePart}`;
}

function inferIntentFromText(value: string): DecisionContext["intent"] | null {
  const normalized = normalizeValue(value);
  if (!normalized) return null;

  if (
    normalized.includes("stay") ||
    normalized.includes("internal") ||
    normalized.includes("double down") ||
    normalized.includes("scope")
  ) {
    return "stay";
  }

  if (
    normalized.includes("leave") ||
    normalized.includes("exit") ||
    normalized.includes("quit") ||
    normalized.includes("resign")
  ) {
    return "leave";
  }

  if (
    normalized.includes("option") ||
    normalized.includes("market") ||
    normalized.includes("explore") ||
    normalized.includes("interview") ||
    normalized.includes("search")
  ) {
    return "options";
  }

  if (
    normalized.includes("other") ||
    normalized.includes("something else")
  ) {
    return "other";
  }

  return null;
}

function toDecisionIntent(value: unknown): DecisionContext["intent"] | null {
  if (value === "stay" || value === "options" || value === "leave" || value === "other") {
    return value;
  }

  if (typeof value === "string") {
    return inferIntentFromText(value);
  }

  return null;
}

function toQuestionAnswerText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.answer === "string" && record.answer.trim()) {
    return record.answer.trim();
  }
  if (typeof record.value === "string" && record.value.trim()) {
    return record.value.trim();
  }
  if (typeof record.content === "string" && record.content.trim()) {
    return record.content.trim();
  }

  return "";
}

export function normalizeDecisionInput(args: {
  decision?: unknown;
  questionAnswers?: unknown;
}): DecisionContext {
  const decisionInput = args.decision && typeof args.decision === "object"
    ? (args.decision as Record<string, unknown>)
    : null;

  const normalizedDecision = decisionInput
    ? {
      intent: toDecisionIntent(decisionInput.intent),
      subIntent: toOptionalString(decisionInput.subIntent),
      freeText: toOptionalString(decisionInput.freeText) || undefined,
    }
    : null;

  if (normalizedDecision?.intent && normalizedDecision.subIntent) {
    return {
      intent: normalizedDecision.intent,
      subIntent: normalizedDecision.subIntent,
      ...(normalizedDecision.freeText ? { freeText: normalizedDecision.freeText } : {}),
    };
  }

  const answers = Array.isArray(args.questionAnswers)
    ? args.questionAnswers.map(toQuestionAnswerText).filter(Boolean)
    : [];

  const first = answers[0] ?? "";
  const second = answers[1] ?? "";
  const third = answers[2] ?? "";
  const intent = toDecisionIntent(normalizedDecision?.intent ?? first) ?? "options";
  const subIntent = [second, third].filter(Boolean).join(" -> ") || second || third || first ||
    "Keep options open";
  const freeText = normalizedDecision?.freeText ??
    (intent === "other" ? first || third || second : third || undefined);

  return {
    intent,
    subIntent,
    ...(freeText ? { freeText } : {}),
  };
}

export function normalizeChatMessagesInput(args: {
  message?: unknown;
  messages?: unknown;
}): ChatTurn[] {
  const normalizedMessages = Array.isArray(args.messages)
    ? args.messages
        .map((message) => {
          if (!message || typeof message !== "object") return null;
          const record = message as Record<string, unknown>;
          const content = toOptionalString(record.content);
          if (!content) return null;

          return {
            role: record.role === "assistant" ? "assistant" : "user",
            content,
          } satisfies ChatTurn;
        })
        .filter((message): message is ChatTurn => Boolean(message))
    : [];

  if (normalizedMessages.length > 0) {
    return normalizedMessages;
  }

  const singleMessage = toOptionalString(args.message);
  if (!singleMessage) return [];

  return [{ role: "user", content: singleMessage }];
}

const INTENT_BRIEF: Record<DecisionContext["intent"], string> = {
  stay: "The user is leaning toward staying, but wants the current seat to compound faster.",
  options: "The user wants optionality and needs a stronger market read before committing.",
  leave: "The user is preparing to leave and needs a deliberate exit thesis rather than a reactive jump.",
  other: "The user has a custom path in mind and needs the recommendation to respect that nuance.",
};

export function decisionFocus(decision?: DecisionContext | null) {
  if (!decision) return "No follow-up decision context yet.";

  const focus = [decision.subIntent, decision.freeText]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" | ");

  return [
    INTENT_BRIEF[decision.intent],
    focus ? `Personal focus: ${focus}.` : "",
  ].filter(Boolean).join(" ");
}

export function buildPersonalizationBrief(args: {
  company: string;
  role: string;
  analysis?: Partial<CareerAnalysis> | null;
  decision?: DecisionContext | null;
}) {
  const topSignals = args.analysis?.keySignals
    ?.slice(0, 3)
    .map((signal) => `${signal.label}: ${signal.impact}`)
    .join(" | ");

  const thesisKeep = args.analysis?.investmentThesis?.keep?.slice(0, 2).join(" | ");
  const thesisCaution = args.analysis?.investmentThesis?.caution?.slice(0, 2).join(" | ");

  return [
    `User is evaluating whether to stay in ${args.role} at ${args.company}.`,
    args.analysis?.rating
      ? `Current asset read: ${args.analysis.rating} / would buy ${args.analysis.wouldBuy ?? "Conditional"} / score ${args.analysis.careerAssetScore ?? "unknown"} / confidence ${args.analysis.confidence ?? "unknown"}.`
      : "",
    args.analysis?.oneLineVerdict ? `Verdict: ${args.analysis.oneLineVerdict}` : "",
    `Decision context: ${decisionFocus(args.decision)}`,
    topSignals ? `Most personal career-impact signals: ${topSignals}` : "",
    thesisKeep ? `Reasons to keep compounding: ${thesisKeep}` : "",
    thesisCaution ? `Reasons to be careful: ${thesisCaution}` : "",
  ].filter(Boolean).join("\n");
}

export function buildChartData(score: number, seedInput: string) {
  const random = seededRandom(hashString(seedInput));
  const start = 42 + random() * 18;
  const target = clamp(score, 15, 96);

  return MONTHS.map((month, index) => {
    const progress = index / (MONTHS.length - 1);
    const trend = start + (target - start) * progress;
    const noise = (random() - 0.5) * 6;
    return {
      month,
      price: Number(clamp(trend + noise, 8, 99).toFixed(1)),
    };
  });
}

function sourceSummaries(sources: AnalysisSource[]) {
  return sources
    .filter((source) => source.url && source.title)
    .slice(0, 6);
}

function toSourceList(value: unknown, fallback: AnalysisSource[]) {
  if (!Array.isArray(value)) return sourceSummaries(fallback);

  const cleaned = value
    .map((source) => {
      if (!source || typeof source !== "object") return null;
      return {
        title: toStringValue((source as { title?: unknown }).title, ""),
        url: toStringValue((source as { url?: unknown }).url, ""),
        snippet: toStringValue((source as { snippet?: unknown }).snippet, ""),
        sourceType: toStringValue((source as { sourceType?: unknown }).sourceType, "other"),
      } satisfies AnalysisSource;
    })
    .filter((source): source is AnalysisSource => Boolean(source?.url && source?.title));

  return cleaned.length ? sourceSummaries(cleaned) : sourceSummaries(fallback);
}

function mergeDimension(value: unknown, fallback: Dimension): Dimension {
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<Dimension>;

  return {
    score: Math.round(clamp(toFiniteNumber(input.score, fallback.score), 0, 100)),
    explanation: toStringValue(input.explanation, fallback.explanation),
    signalCount: Math.max(1, Math.round(toFiniteNumber(input.signalCount, fallback.signalCount))),
  };
}

function toKeySignals(value: unknown, fallback: JobKeySignal[]) {
  if (!Array.isArray(value)) return fallback.slice(0, 5);

  const cleaned = value
    .map((signal) => {
      if (!signal || typeof signal !== "object") return null;
      const next = signal as {
        label?: unknown;
        detail?: unknown;
        impact?: unknown;
        evidence?: unknown;
        sentiment?: unknown;
        sourceUrls?: unknown;
        roleImpact?: unknown;
        confidenceReason?: unknown;
      };

      const sentiment =
        next.sentiment === "positive" ||
        next.sentiment === "negative" ||
        next.sentiment === "neutral" ||
        next.sentiment === "mixed"
          ? next.sentiment
          : "neutral";

      return {
        label: toStringValue(next.label, ""),
        detail: toStringValue(next.detail, ""),
        impact: toStringValue(next.impact, ""),
        evidence: toStringValue(next.evidence, ""),
        sentiment,
        sourceUrls: Array.isArray(next.sourceUrls)
          ? next.sourceUrls.filter((item): item is string => typeof item === "string").slice(0, 3)
          : [],
        roleImpact: toOptionalString(next.roleImpact),
        confidenceReason: toOptionalString(next.confidenceReason),
      } satisfies JobKeySignal;
    })
    .filter((signal): signal is JobKeySignal => Boolean(signal?.label && signal?.impact && signal?.evidence))
    .slice(0, 5);

  return cleaned.length >= 3 ? cleaned : fallback.slice(0, 5);
}

function toEvidenceMap(value: unknown): Record<string, SourceBackedClaim[]> | undefined {
  if (!value || typeof value !== "object") return undefined;

  const output: Record<string, SourceBackedClaim[]> = {};
  for (const [bucket, rawClaims] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(rawClaims)) continue;
    const claims = rawClaims
      .map((claim) => {
        if (!claim || typeof claim !== "object") return null;
        const next = claim as Record<string, unknown>;
        const sourceUrl = toOptionalString(next.sourceUrl);
        const claimText = toOptionalString(next.claim);
        if (!sourceUrl || !claimText) return null;
        return {
          bucket,
          claim: claimText,
          sourceTitle: toStringValue(next.sourceTitle, sourceUrl),
          sourceUrl,
          sourceType: toStringValue(next.sourceType, "other"),
        } satisfies SourceBackedClaim;
      })
      .filter((claim): claim is SourceBackedClaim => Boolean(claim))
      .slice(0, 3);
    if (claims.length) output[bucket] = claims;
  }

  return Object.keys(output).length ? output : undefined;
}

function toQualitativeInsights(
  value: unknown,
  fallback: QualitativeInsight[],
  keySignals: JobKeySignal[],
) {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((insight) => {
        if (!insight || typeof insight !== "object") return null;
        const next = insight as {
          label?: unknown;
          value?: unknown;
          level?: unknown;
          detail?: unknown;
        };
        const level =
          next.level === "strong" ||
          next.level === "rising" ||
          next.level === "neutral" ||
          next.level === "limited" ||
          next.level === "blocked" ||
          next.level === "high" ||
          next.level === "low" ||
          next.level === "declining" ||
          next.level === "weak"
            ? next.level
            : "neutral";

        return {
          label: toStringValue(next.label, ""),
          value: toStringValue(next.value, ""),
          level,
          detail: toStringValue(next.detail, ""),
        } satisfies QualitativeInsight;
      })
      .filter((insight): insight is QualitativeInsight => Boolean(insight?.label && insight?.detail))
      .slice(0, 5);

    if (cleaned.length >= 5) return cleaned;
  }

  const derived = keySignals.slice(0, 5).map((signal) => ({
    label: signal.label,
    value: toInsightValue(signal.sentiment),
    level: toInsightLevel(signal.sentiment),
    detail: `${signal.impact} Public evidence: ${signal.evidence}`,
  }));

  return [...derived, ...fallback].slice(0, 5);
}

function toInvestmentThesis(
  value: unknown,
  fallback: InvestmentThesis,
  legacyBullCase: unknown,
  legacyBearCase: unknown,
  legacyTriggers: unknown,
) {
  const bullCase = takeStrings(legacyBullCase, 3, fallback.keep);
  const bearCase = takeStrings(legacyBearCase, 3, fallback.caution);
  const triggers = takeStrings(legacyTriggers, 3, fallback.triggers);

  if (!value || typeof value !== "object") {
    return {
      keep: bullCase,
      caution: bearCase,
      triggers,
    };
  }

  const input = value as Partial<InvestmentThesis>;
  return {
    keep: takeStrings(input.keep, 3, bullCase),
    caution: takeStrings(input.caution, 3, bearCase),
    triggers: takeStrings(input.triggers, 3, triggers),
  };
}

function toEvidence(
  value: unknown,
  fallback: CareerAnalysis["evidence"],
) {
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<CareerAnalysis["evidence"]>;
  return {
    momentumSignals: takeStrings(input.momentumSignals, 3, fallback.momentumSignals),
    riskSignals: takeStrings(input.riskSignals, 3, fallback.riskSignals),
    hiringSignals: takeStrings(input.hiringSignals, 3, fallback.hiringSignals),
    companySignals: takeStrings(input.companySignals, 3, fallback.companySignals),
  };
}

function hydrateProfile(
  company: string,
  role: string,
  profile: AnalysisProfile,
  sources: AnalysisSource[] = [],
): CareerAnalysis {
  return {
    ticker: makeTicker(company, role),
    rating: profile.rating,
    wouldBuy: profile.wouldBuy,
    confidence: profile.confidence,
    oneLineVerdict: profile.oneLineVerdict,
    careerAssetScore: profile.careerAssetScore,
    dimensions: profile.dimensions,
    qualitativeInsights: profile.qualitativeInsights,
    keySignals: profile.keySignals,
    investmentThesis: profile.investmentThesis,
    bullCase: profile.investmentThesis.keep,
    bearCase: profile.investmentThesis.caution,
    ratingChangeTriggers: profile.investmentThesis.triggers,
    evidence: profile.evidence,
    sources,
    chartData: buildChartData(profile.careerAssetScore, `${company}|${role}`),
  };
}

const demoProfiles: Record<string, AnalysisProfile> = {
  "n26|product manager": {
    rating: "HOLD",
    wouldBuy: "Conditional",
    confidence: 72,
    oneLineVerdict:
      "N26 Product Manager is a decent compounding seat, but regulatory drag and org unpredictability cap conviction.",
    careerAssetScore: 66,
    dimensions: {
      careerDividend: { score: 70, explanation: "Strong product scope and fintech rigor still compound." , signalCount: 4 },
      momentum: { score: 64, explanation: "Customer relevance remains, but momentum is uneven.", signalCount: 4 },
      volatility: { score: 49, explanation: "Fintech regulation keeps execution risk elevated.", signalCount: 4 },
      upsideOptionality: { score: 63, explanation: "Good PM brand transfer, but internal leverage is not obvious.", signalCount: 3 },
      exitLiquidity: { score: 82, explanation: "Fintech PM experience converts well into adjacent growth roles.", signalCount: 4 },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Crowded", level: "neutral", detail: "A thinner leadership bench can help, but reorg risk makes that path inconsistent." },
      { label: "Regulatory risk", value: "Elevated", level: "high", detail: "Compliance pressure can slow launches and add internal friction to roadmap work." },
      { label: "Hiring momentum", value: "Measured", level: "neutral", detail: "Selective hiring suggests discipline rather than breakout expansion." },
      { label: "Learning upside", value: "Strong", level: "strong", detail: "Regulated product work still sharpens judgment on trust, risk, and scale." },
      { label: "Exit opportunities", value: "Strong", level: "strong", detail: "N26 still travels well across European fintech and product teams." },
    ],
    keySignals: [
      {
        label: "Regulated product surface",
        detail: "Operating in a heavily regulated category raises the bar for PM decisions.",
        impact: "You build durable judgment, but every launch can take longer and require more stakeholder drag.",
        evidence: "Public reporting and company positioning consistently frame compliance as a core operating constraint.",
        sentiment: "mixed",
        sourceUrls: [],
      },
      {
        label: "Selective growth, not hypergrowth",
        detail: "The company still matters, but it no longer reads like an unconstrained scale story.",
        impact: "Your scope can stay meaningful, though the fastest internal promotion paths may be less predictable.",
        evidence: "Coverage and hiring signals point to steadier optimization rather than all-out expansion.",
        sentiment: "neutral",
        sourceUrls: [],
      },
      {
        label: "Strong fintech brand transfer",
        detail: "N26 remains a recognizable signal in digital banking and consumer fintech.",
        impact: "If you leave, your current seat should still convert into credible external PM conversations.",
        evidence: "Its public market position and category relevance continue to make it a notable operator brand.",
        sentiment: "positive",
        sourceUrls: [],
      },
    ],
    investmentThesis: {
      keep: [
        "You still compound real fintech judgment in a regulated product environment.",
        "The brand remains legible for future product moves across Europe.",
        "A steady seat is valuable if you can turn it into visible shipped outcomes.",
      ],
      caution: [
        "Regulatory pressure can slow your velocity and make wins harder to bank internally.",
        "Measured hiring can mean less obvious upward mobility in the near term.",
        "If leadership or strategic focus shifts, your roadmap may become more defensive than expansive.",
      ],
      triggers: [
        "Meaningful expansion in product hiring or new market bets would improve upside.",
        "A new round of regulatory or operational setbacks would push this closer to SELL.",
        "A clear scope increase or promotion sponsor materially upgrades the asset.",
      ],
    },
    evidence: {
      momentumSignals: [
        "Public positioning still emphasizes digital banking scale and customer relevance.",
        "The company remains a known player in European consumer fintech.",
        "Product and trust continue to be central to the operating narrative.",
      ],
      riskSignals: [
        "Regulatory scrutiny is a recurring fintech pressure source.",
        "Execution can be bottlenecked by compliance-heavy decision making.",
        "Strategic resets can hit product teams unevenly.",
      ],
      hiringSignals: [
        "Hiring appears selective rather than aggressively expansionary.",
        "Roles signal ongoing investment, but not unconstrained growth.",
        "Demand looks focused around critical bets rather than broad scaling.",
      ],
      companySignals: [
        "The company still carries category credibility in digital banking.",
        "Its operating environment remains competitive and regulated.",
        "Brand transfer remains one of the strongest parts of the asset.",
      ],
    },
  },
  "tesla|mechanical engineer": {
    rating: "BUY",
    wouldBuy: "Yes",
    confidence: 77,
    oneLineVerdict:
      "Tesla Mechanical Engineer is a high-volatility asset with outsized technical learning and strong external signal value.",
    careerAssetScore: 74,
    dimensions: {
      careerDividend: { score: 72, explanation: "Hard technical scope and ambitious programs still compound fast.", signalCount: 4 },
      momentum: { score: 78, explanation: "Execution tempo and product ambition remain unusually high.", signalCount: 4 },
      volatility: { score: 42, explanation: "Operating intensity and leadership risk make this a choppy asset.", signalCount: 4 },
      upsideOptionality: { score: 81, explanation: "Great seat if you can survive and point to shipped hardware.", signalCount: 4 },
      exitLiquidity: { score: 88, explanation: "Tesla engineering signal travels well into ambitious hardware orgs.", signalCount: 4 },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Earned", level: "strong", detail: "Visible shipped work matters more than tenure in this environment." },
      { label: "Regulatory risk", value: "Present", level: "neutral", detail: "Macro scrutiny exists, but day-to-day asset value is still driven by execution." },
      { label: "Hiring momentum", value: "Demanding", level: "rising", detail: "Engineering demand follows execution needs, not comfort." },
      { label: "Learning upside", value: "Very strong", level: "strong", detail: "You can compress years of systems learning into one intense chapter." },
      { label: "Exit opportunities", value: "Excellent", level: "strong", detail: "The signal is especially strong if you can show hard shipped outcomes." },
    ],
    keySignals: [
      {
        label: "High-output hardware cadence",
        detail: "The company still pushes fast on complex physical systems.",
        impact: "You can build unusually credible execution scars, which compounds your technical asset value quickly.",
        evidence: "Public coverage repeatedly highlights aggressive iteration across vehicles, manufacturing, and robotics.",
        sentiment: "positive",
        sourceUrls: [],
      },
      {
        label: "Leadership and operating volatility",
        detail: "The environment is intense and can change direction quickly.",
        impact: "Your learning rate is high, but your day-to-day predictability and sustainability are weaker.",
        evidence: "Tesla’s public operating narrative is tightly linked to rapid shifts and high executive intensity.",
        sentiment: "negative",
        sourceUrls: [],
      },
      {
        label: "Elite external signaling",
        detail: "Surviving and shipping in Tesla engineering is a meaningful market signal.",
        impact: "Your next job market often prices that experience at a premium if your work is concrete.",
        evidence: "The company remains one of the most legible high-intensity engineering brands in the market.",
        sentiment: "positive",
        sourceUrls: [],
      },
    ],
    investmentThesis: {
      keep: [
        "The technical learning curve is still unusually steep for mechanical engineers.",
        "Shipped hardware outcomes here materially improve your future market pricing.",
        "This seat pays off if you want intensity, speed, and difficult engineering problems.",
      ],
      caution: [
        "The operating environment can burn you out before the asset fully compounds.",
        "Volatility means your work can be redirected fast, which hurts predictability.",
        "This is a bad fit if you need stable pacing or a gentle management structure.",
      ],
      triggers: [
        "A strong project ship or platform launch improves the asset materially.",
        "Org churn or a personal sustainability ceiling pushes this toward HOLD.",
        "If your scope becomes maintenance-heavy, the upside shrinks quickly.",
      ],
    },
    evidence: {
      momentumSignals: [
        "Public product and robotics narratives signal continued ambition.",
        "Execution speed remains central to Tesla’s identity.",
        "Engineering work is still tightly tied to visible shipped outcomes.",
      ],
      riskSignals: [
        "The environment is known for intensity and unpredictability.",
        "Leadership concentration amplifies volatility risk.",
        "Program reprioritization can move quickly.",
      ],
      hiringSignals: [
        "Engineering demand stays linked to critical execution priorities.",
        "Hiring signals still reinforce a hard-operator culture.",
        "Role expectations skew toward ownership and pace.",
      ],
      companySignals: [
        "Tesla remains a globally legible engineering brand.",
        "Its product agenda stays highly visible in public markets.",
        "The upside is strongest when you can tie yourself to shipped systems.",
      ],
    },
  },
  "openai|research engineer": {
    rating: "BUY",
    wouldBuy: "Conditional",
    confidence: 81,
    oneLineVerdict:
      "OpenAI Research Engineer is a premium career asset if you can convert frontier access into visible leverage instead of disappearing into infrastructure.",
    careerAssetScore: 84,
    dimensions: {
      careerDividend: { score: 84, explanation: "Frontier-adjacent work compounds unusually fast.", signalCount: 4 },
      momentum: { score: 86, explanation: "The company remains in the center of AI market momentum.", signalCount: 4 },
      volatility: { score: 56, explanation: "The pace is fast and the stakes are high, but not random.", signalCount: 3 },
      upsideOptionality: { score: 90, explanation: "The next-step ceiling is exceptionally high if your work is visible.", signalCount: 4 },
      exitLiquidity: { score: 92, explanation: "Very few brands price research engineering this strongly right now.", signalCount: 4 },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Selective", level: "strong", detail: "Upside is high, but differentiation is judged against elite peers." },
      { label: "Regulatory risk", value: "Real", level: "neutral", detail: "Policy scrutiny is increasing, but the asset value is still exceptional." },
      { label: "Hiring momentum", value: "Strong", level: "strong", detail: "Frontier AI demand remains structurally high." },
      { label: "Learning upside", value: "Exceptional", level: "strong", detail: "The learning density is among the best in the market." },
      { label: "Exit opportunities", value: "Exceptional", level: "strong", detail: "This brand dramatically upgrades future AI optionality." },
    ],
    keySignals: [
      {
        label: "Frontier access",
        detail: "You are close to one of the highest-leverage technical surfaces in AI.",
        impact: "The learning and network effects can reprice your career faster than almost anywhere else.",
        evidence: "OpenAI remains central in public AI product, research, and platform narratives.",
        sentiment: "positive",
        sourceUrls: [],
      },
      {
        label: "Elite peer set",
        detail: "The bar is high and comparison pressure is real.",
        impact: "You need visible leverage or research adjacency, otherwise your title can underperform its headline value.",
        evidence: "The company’s public talent positioning and output profile imply a concentrated, high-caliber peer group.",
        sentiment: "mixed",
        sourceUrls: [],
      },
      {
        label: "Massive external optionality",
        detail: "A credible chapter here opens doors across labs, infra, startups, and product orgs.",
        impact: "Even a relatively short stint can materially improve your next-step market.",
        evidence: "OpenAI’s market position and technical visibility create unusually strong downstream signaling.",
        sentiment: "positive",
        sourceUrls: [],
      },
    ],
    investmentThesis: {
      keep: [
        "The learning density and external signaling are both top-tier.",
        "You can compound quickly if your work touches visible, high-leverage systems.",
        "This seat creates elite future optionality across the AI stack.",
      ],
      caution: [
        "The asset is weaker if your contribution becomes invisible or purely maintenance-oriented.",
        "You are competing inside an unusually high-talent environment.",
        "Regulatory and strategic scrutiny can reshape priorities quickly.",
      ],
      triggers: [
        "A visible platform, research, or shipped-model contribution upgrades the asset further.",
        "If your scope drifts away from high-leverage work, conviction drops toward HOLD.",
        "A strong sponsor or fast scope expansion meaningfully improves internal upside.",
      ],
    },
    evidence: {
      momentumSignals: [
        "OpenAI remains central to public AI product and infrastructure momentum.",
        "The company continues to shape frontier model and platform narratives.",
        "AI talent demand remains elevated around this category of work.",
      ],
      riskSignals: [
        "The operating environment is high-intensity and strategically sensitive.",
        "Policy and safety scrutiny can change constraints quickly.",
        "Competition for visible leverage inside the org is strong.",
      ],
      hiringSignals: [
        "Research-engineering style hiring remains a high-value capability signal.",
        "The market still prices frontier AI infrastructure and product execution aggressively.",
        "Public talent competition reinforces the value of this experience.",
      ],
      companySignals: [
        "OpenAI continues to have unusually strong external signaling power.",
        "The brand compounds best when paired with concrete visible work.",
        "Its market position expands downstream optionality across labs and startups.",
      ],
    },
  },
  "trade republic|product manager": {
    rating: "BUY",
    wouldBuy: "Conditional",
    confidence: 75,
    oneLineVerdict:
      "Trade Republic Product Manager is an attractive growth asset if you want consumer-fintech leverage, but it carries compliance and pace risk.",
    careerAssetScore: 73,
    dimensions: {
      careerDividend: { score: 76, explanation: "Consumer-fintech product exposure still compounds well.", signalCount: 4 },
      momentum: { score: 77, explanation: "Brand and category momentum remain supportive.", signalCount: 4 },
      volatility: { score: 52, explanation: "Regulatory and market swings create real execution drag.", signalCount: 3 },
      upsideOptionality: { score: 74, explanation: "Strong if you want more consumer fintech leverage.", signalCount: 3 },
      exitLiquidity: { score: 83, explanation: "The role converts well into adjacent fintech and marketplace seats.", signalCount: 4 },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Promising", level: "rising", detail: "Growth can create room, but you still need clear shipped wins." },
      { label: "Regulatory risk", value: "Elevated", level: "high", detail: "Market and compliance pressures can slow execution." },
      { label: "Hiring momentum", value: "Healthy", level: "rising", detail: "The company still reads like it is investing, not retrenching." },
      { label: "Learning upside", value: "Strong", level: "strong", detail: "You build consumer trust and financial-product judgment at scale." },
      { label: "Exit opportunities", value: "Strong", level: "strong", detail: "Strong transfer into European fintech and consumer product roles." },
    ],
    keySignals: [
      {
        label: "Consumer fintech relevance",
        detail: "The company sits in a category where trust, growth, and product quality all matter.",
        impact: "That makes shipped PM work especially valuable for your future market pricing.",
        evidence: "Trade Republic remains visible in public investing and retail-finance coverage.",
        sentiment: "positive",
        sourceUrls: [],
      },
      {
        label: "Compliance-heavy operating environment",
        detail: "Financial products face real scrutiny and process burden.",
        impact: "You gain strong judgment, but product velocity can suffer when compliance risk rises.",
        evidence: "Public fintech reporting consistently frames regulation as a meaningful execution variable.",
        sentiment: "mixed",
        sourceUrls: [],
      },
      {
        label: "Transferable PM narrative",
        detail: "The seat can tell a strong story around trust, scale, and monetization.",
        impact: "That improves your exit liquidity into other high-signal consumer roles.",
        evidence: "Its public category position supports a clear external product narrative.",
        sentiment: "positive",
        sourceUrls: [],
      },
    ],
    investmentThesis: {
      keep: [
        "You still build high-value product judgment in a trust-sensitive category.",
        "The company gives you a strong narrative if you want future fintech leverage.",
        "Growth plus brand relevance make this a decent asset to keep compounding.",
      ],
      caution: [
        "Compliance drag can slow launch velocity and reduce visible PM wins.",
        "If the roadmap becomes defensive, learning upside drops quickly.",
        "Conviction weakens if you want a less regulated or more expansive product surface.",
      ],
      triggers: [
        "Visible new launches or scope expansion would strengthen the BUY case.",
        "A harder regulatory or market shock would move this toward HOLD.",
        "A clearer path to staff-level ownership materially upgrades the asset.",
      ],
    },
    evidence: {
      momentumSignals: [
        "The company remains visible in consumer investing and fintech discussions.",
        "Its category still attracts product attention and user demand.",
        "Brand relevance supports continued PM signal value.",
      ],
      riskSignals: [
        "Regulation and market volatility can reshape priorities quickly.",
        "Trust-sensitive products require more operating discipline.",
        "Launch pace can be constrained by compliance realities.",
      ],
      hiringSignals: [
        "Hiring signals suggest continued product investment.",
        "The company still reads as an active builder rather than a shrinking asset.",
        "PM experience here remains legible in the external market.",
      ],
      companySignals: [
        "Trade Republic remains a notable European consumer-fintech brand.",
        "The role combines trust, growth, and product complexity.",
        "That mix makes the experience portable beyond the company itself.",
      ],
    },
  },
  "lemon markets|product designer": {
    rating: "HOLD",
    wouldBuy: "Conditional",
    confidence: 69,
    oneLineVerdict:
      "lemon.markets Product Designer is a thoughtful niche asset with startup upside, but its return profile depends heavily on business momentum.",
    careerAssetScore: 64,
    dimensions: {
      careerDividend: { score: 65, explanation: "You can still get broad ownership in a smaller team.", signalCount: 3 },
      momentum: { score: 60, explanation: "Startup momentum matters more here than brand power.", signalCount: 3 },
      volatility: { score: 48, explanation: "Small-company variance stays high.", signalCount: 4 },
      upsideOptionality: { score: 67, explanation: "Great if you want ownership and fintech design depth.", signalCount: 3 },
      exitLiquidity: { score: 70, explanation: "The niche is credible, though less instantly legible than bigger brands.", signalCount: 3 },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Flexible", level: "rising", detail: "Smaller teams can create scope faster than title changes." },
      { label: "Regulatory risk", value: "Meaningful", level: "neutral", detail: "Embedded-finance and fintech constraints still shape the work." },
      { label: "Hiring momentum", value: "Selective", level: "neutral", detail: "Small-team hiring says more about runway discipline than breakout growth." },
      { label: "Learning upside", value: "Strong", level: "strong", detail: "You likely get broad product and systems exposure." },
      { label: "Exit opportunities", value: "Good", level: "strong", detail: "The story is strongest if you can show end-to-end shipped ownership." },
    ],
    keySignals: [
      {
        label: "Small-team ownership",
        detail: "Design work in a smaller fintech environment often stretches across product, systems, and delivery.",
        impact: "That breadth can compound quickly if you want to become a high-agency product designer.",
        evidence: "Startup-stage public positioning typically emphasizes lean teams and end-to-end responsibility.",
        sentiment: "positive",
        sourceUrls: [],
      },
      {
        label: "Business-momentum sensitivity",
        detail: "Smaller companies have less room to hide if growth slows or strategy changes.",
        impact: "Your asset value is more exposed to company momentum than at a larger brand.",
        evidence: "Early-stage fintech outcomes are more tightly coupled to funding, demand, and strategic focus.",
        sentiment: "negative",
        sourceUrls: [],
      },
      {
        label: "Niche but credible fintech story",
        detail: "This seat can still tell a strong design story around complex financial products.",
        impact: "The payoff depends on how clearly you can show shipped systems and measurable user impact.",
        evidence: "Embedded-finance infrastructure remains a meaningful product-design narrative when backed by concrete outcomes.",
        sentiment: "mixed",
        sourceUrls: [],
      },
    ],
    investmentThesis: {
      keep: [
        "The ownership surface can be excellent if you want to compound range quickly.",
        "Fintech design depth remains valuable when paired with clear shipped outcomes.",
        "This is a decent asset if you want breadth more than prestige.",
      ],
      caution: [
        "Small-company volatility can reprice the role quickly in either direction.",
        "Brand power alone will not carry your next move; your portfolio proof matters more.",
        "If business momentum weakens, the seat can become narrower and more defensive fast.",
      ],
      triggers: [
        "Visible customer traction or stronger company momentum would improve the rating.",
        "A funding or strategy wobble would move this closer to SELL.",
        "If you can own end-to-end product bets, upside rises materially.",
      ],
    },
    evidence: {
      momentumSignals: [
        "Embedded-finance remains a relevant product surface.",
        "Broad ownership often exists in smaller product teams.",
        "Design leverage is strongest when teams stay close to customers and delivery.",
      ],
      riskSignals: [
        "Startup momentum risk is materially higher than at larger brands.",
        "Strategic changes can narrow the design surface quickly.",
        "External market conditions matter more for small fintechs.",
      ],
      hiringSignals: [
        "Selective hiring can reflect focus rather than breakout growth.",
        "Role breadth is often more informative than team size alone.",
        "Design signal improves when the company is still investing in product quality.",
      ],
      companySignals: [
        "The niche is credible but less instantly legible than a consumer giant.",
        "The story gets stronger when tied to measurable end-to-end ownership.",
        "Your portfolio proof matters more than the logo itself.",
      ],
    },
  },
};

export function getDemoFallbackAnalysis(company: string, role: string) {
  const key = `${normalizeValue(company)}|${normalizeValue(role)}`;
  const profile = demoProfiles[key];
  return profile ? hydrateProfile(company, role, profile) : null;
}

export function createGenericFallbackAnalysis(company: string, role: string) {
  const profile: AnalysisProfile = {
    rating: "HOLD",
    wouldBuy: "Conditional",
    confidence: 63,
    oneLineVerdict: `${role} at ${company} looks like a mid-conviction career asset: useful to compound, but not obvious to overweight.`,
    careerAssetScore: 62,
    dimensions: {
      careerDividend: {
        score: 68,
        explanation: "The role still appears to offer real learning and compensation signal.",
        signalCount: 3,
      },
      momentum: {
        score: 60,
        explanation: "Momentum looks mixed from the public surface area available.",
        signalCount: 3,
      },
      volatility: {
        score: 54,
        explanation: "There are enough unknowns that downside control matters.",
        signalCount: 3,
      },
      upsideOptionality: {
        score: 59,
        explanation: "Upside exists, but it depends on scope growth rather than logo alone.",
        signalCount: 3,
      },
      exitLiquidity: {
        score: 71,
        explanation: "The experience should still convert if you can point to concrete outcomes.",
        signalCount: 3,
      },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Unclear", level: "neutral", detail: "Public signals do not make the next internal step obvious yet." },
      { label: "Regulatory risk", value: "Watch", level: "neutral", detail: "External pressure could change how quickly the team can move." },
      { label: "Hiring momentum", value: "Mixed", level: "limited", detail: "The hiring picture is not strong enough to read as breakout growth." },
      { label: "Learning upside", value: "Good", level: "strong", detail: "There still appears to be enough surface area to build durable signal." },
      { label: "Exit opportunities", value: "Good", level: "strong", detail: "The asset is stronger if you can tie it to measurable shipped work." },
    ],
    keySignals: [
      {
        label: "Mixed public momentum",
        detail: "The company surface does not scream breakout or collapse.",
        impact: "That means you should treat this as a compounding seat, not an automatic career accelerator.",
        evidence: "Public signals look useful but not decisive across company, hiring, and market narratives.",
        sentiment: "neutral",
        sourceUrls: [],
      },
      {
        label: "Scope matters more than logo",
        detail: "Your upside depends on whether the role expands into visible ownership.",
        impact: "If you keep shipping meaningful work, the asset can still appreciate from here.",
        evidence: "Without clear public proof of expansion, role leverage is the biggest swing factor.",
        sentiment: "mixed",
        sourceUrls: [],
      },
      {
        label: "Portable outcome signal",
        detail: "Even a middling company seat can convert if the work is concrete.",
        impact: "Your external market improves most if you can turn this role into measurable storylines.",
        evidence: "Career value is often driven by shipped proof rather than company narrative alone.",
        sentiment: "positive",
        sourceUrls: [],
      },
    ],
    investmentThesis: {
      keep: [
        "There is still enough learning and signal here to compound intelligently.",
        "You do not need a perfect company narrative if your own outcomes stay sharp.",
        "This asset improves if you can turn it into visible ownership quickly.",
      ],
      caution: [
        "Public signals are not strong enough to justify blind loyalty.",
        "If your scope stagnates, the asset likely drifts sideways instead of up.",
        "A weaker company narrative raises the cost of staying too long without proof.",
      ],
      triggers: [
        "Visible scope expansion or stronger company momentum would improve the rating.",
        "A reorg, layoff, or strategic slowdown would move this toward SELL.",
        "Clear external pull from recruiters would increase the asset's exit liquidity.",
      ],
    },
    evidence: {
      momentumSignals: [
        "Public coverage suggests some ongoing activity rather than dormancy.",
        "There is still enough signal to treat the role seriously.",
        "Momentum is not strong enough to erase the downside questions.",
      ],
      riskSignals: [
        "The public picture still leaves material uncertainty.",
        "Strategic or market changes could narrow your upside quickly.",
        "Without better evidence, confidence should stay moderate.",
      ],
      hiringSignals: [
        "Hiring signals are present but not overwhelmingly expansionary.",
        "The role still appears relevant to the company surface area.",
        "Selective hiring suggests discipline more than breakout growth.",
      ],
      companySignals: [
        "The company narrative is useful, but not enough on its own.",
        "Your individual execution still matters most in repricing this asset.",
        "External portability depends on concrete outcomes you can point to.",
      ],
    },
  };

  return hydrateProfile(company, role, profile);
}

export function normalizeAnalysisPayload(args: {
  company: string;
  role: string;
  raw: unknown;
  sources?: AnalysisSource[];
  researchPacket?: ResearchPacket;
}) {
  const fallback = getDemoFallbackAnalysis(args.company, args.role) ??
    createGenericFallbackAnalysis(args.company, args.role);
  const input = args.raw && typeof args.raw === "object" ? (args.raw as Record<string, unknown>) : {};
  const sources = sourceSummaries(args.sources ?? []);
  const mergedSources = toSourceList(input.sources, sources.length ? sources : fallback.sources);
  const packetUrls = args.researchPacket
    ? Object.values(args.researchPacket.evidenceBuckets).flat().map((claim) => claim.sourceUrl)
    : [];
  const keySignals = toKeySignals(input.keySignals, fallback.keySignals).map((signal, index) => ({
    ...signal,
    sourceUrls: signal.sourceUrls.length
      ? signal.sourceUrls.slice(0, 3)
      : packetUrls[index]
        ? [packetUrls[index]]
      : mergedSources[index]?.url
        ? [mergedSources[index].url]
        : [],
    roleImpact: signal.roleImpact ||
      `${signal.impact} For a ${args.role}, this mostly affects scope, learning density, promotion leverage, or exit optionality.`,
    confidenceReason: signal.confidenceReason ||
      (signal.sourceUrls.length || packetUrls[index] || mergedSources[index]?.url
        ? "Grounded in the linked public source and interpreted for the role."
        : "Limited direct source coverage; treat this as an inference."),
  }));
  const investmentThesis = toInvestmentThesis(
    input.investmentThesis,
    fallback.investmentThesis,
    input.bullCase,
    input.bearCase,
    input.ratingChangeTriggers,
  );
  const qualitativeInsights = toQualitativeInsights(
    input.qualitativeInsights,
    fallback.qualitativeInsights,
    keySignals,
  );

  const rawResearchQuality = input.researchQuality;
  const researchQuality: SourceQuality =
    rawResearchQuality === "live" || rawResearchQuality === "limited" || rawResearchQuality === "fallback"
      ? rawResearchQuality
      : args.researchPacket?.sourceQuality ?? (mergedSources.length >= 2 ? "limited" : "fallback");
  const evidenceMap = toEvidenceMap(input.evidenceMap) ?? args.researchPacket?.evidenceBuckets;

  return {
    ticker: toStringValue(input.ticker, fallback.ticker),
    rating:
      input.rating === "BUY" ||
      input.rating === "HOLD" ||
      input.rating === "SELL" ||
      input.rating === "SHORT"
        ? input.rating
        : fallback.rating,
    wouldBuy:
      input.wouldBuy === "Yes" ||
      input.wouldBuy === "No" ||
      input.wouldBuy === "Conditional"
        ? input.wouldBuy
        : fallback.wouldBuy,
    confidence: Math.round(clamp(toFiniteNumber(input.confidence, fallback.confidence), 0, 100)),
    oneLineVerdict: toStringValue(input.oneLineVerdict, fallback.oneLineVerdict),
    careerAssetScore: Math.round(
      clamp(toFiniteNumber(input.careerAssetScore, fallback.careerAssetScore), 0, 100),
    ),
    dimensions: {
      careerDividend: mergeDimension(input.dimensions && (input.dimensions as Record<string, unknown>).careerDividend, fallback.dimensions.careerDividend),
      momentum: mergeDimension(input.dimensions && (input.dimensions as Record<string, unknown>).momentum, fallback.dimensions.momentum),
      volatility: mergeDimension(input.dimensions && (input.dimensions as Record<string, unknown>).volatility, fallback.dimensions.volatility),
      upsideOptionality: mergeDimension(
        input.dimensions && (input.dimensions as Record<string, unknown>).upsideOptionality,
        fallback.dimensions.upsideOptionality,
      ),
      exitLiquidity: mergeDimension(input.dimensions && (input.dimensions as Record<string, unknown>).exitLiquidity, fallback.dimensions.exitLiquidity),
    },
    qualitativeInsights,
    keySignals,
    investmentThesis,
    bullCase: takeStrings(input.bullCase, 3, investmentThesis.keep),
    bearCase: takeStrings(input.bearCase, 3, investmentThesis.caution),
    ratingChangeTriggers: takeStrings(input.ratingChangeTriggers, 3, investmentThesis.triggers),
    evidence: toEvidence(input.evidence, fallback.evidence),
    sources: mergedSources,
    researchQuality,
    ...(evidenceMap ? { evidenceMap } : {}),
    chartData: Array.isArray(input.chartData)
      ? input.chartData
          .map((point) => {
            if (!point || typeof point !== "object") return null;
            const next = point as { month?: unknown; price?: unknown };
            return {
              month: toStringValue(next.month, ""),
              price: toFiniteNumber(next.price, 0),
            };
          })
          .filter((point): point is { month: string; price: number } => Boolean(point?.month))
      : buildChartData(
        Math.round(
          clamp(toFiniteNumber(input.careerAssetScore, fallback.careerAssetScore), 0, 100),
        ),
        `${args.company}|${args.role}`,
      ),
  } satisfies CareerAnalysis;
}

export function researchSourcesToAnalysisSources(sources: ResearchSource[]) {
  return sources.map((source) => ({
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    sourceType: source.sourceType,
  }));
}

export function buildFallbackRecommendation(
  company: string,
  role: string,
  decision: DecisionContext,
): Recommendation {
  const focus = decision.freeText || decision.subIntent || "your next career step";
  const moveByIntent: Record<DecisionContext["intent"], string> = {
    stay: `Stay at ${company} for one more cycle, but make "${focus}" the explicit scope-expansion agenda.`,
    options: `Keep your ${role} seat at ${company}, while quietly testing whether "${focus}" is better priced elsewhere.`,
    leave: `Treat ${role} at ${company} as a bridge asset and build a deliberate exit around "${focus}" within 90 days.`,
    other: `Use the next 30 days to turn "${focus}" into a concrete career option with evidence behind it.`,
  };

  return {
    recommendedMove: moveByIntent[decision.intent],
    why: [
      `Your stated focus is "${focus}", so the next move should test that thesis rather than stay generic.`,
      `The ${role} seat is most valuable if it creates visible proof you can use inside or outside ${company}.`,
      "A clear narrative beats a reactive jump: you want leverage before you make the move irreversible.",
    ],
    next30Days: [
      `Write a one-page asset memo: why ${company}, why this ${role}, why "${focus}", and what would make you stay.`,
      `Ask your manager or strongest internal sponsor what scope would prove progress toward "${focus}" this quarter.`,
      "Run two quiet external market conversations so you know whether your current seat is underpriced or still worth compounding.",
    ],
    watchOuts: [
      `Do not accept vague encouragement if it does not create measurable movement toward "${focus}".`,
      "Do not make a move you cannot explain in one tight sentence to a future hiring manager.",
    ],
    alternativePaths: [
      {
        label: "Double down internally",
        detail: `Use your current ${role} seat at ${company} to win one mandate that directly supports "${focus}".`,
      },
      {
        label: "Quietly test the market",
        detail: `Compare your current path against three roles that price "${focus}" more clearly.`,
      },
      {
        label: "Re-scope the job",
        detail: `If ${company} is still a good platform but the seat is weak, redesign the seat before changing employers.`,
      },
    ],
    personalizationBasis: [
      `User intent: ${decision.intent}`,
      `User focus: ${focus}`,
      `Current role: ${role} at ${company}`,
    ],
    sourceUrls: [],
  };
}

export function normalizeRecommendationPayload(
  raw: unknown,
  fallback: Recommendation,
): Recommendation {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const alternativePaths = Array.isArray(input.alternativePaths)
    ? input.alternativePaths
        .map((path) => {
          if (!path || typeof path !== "object") return null;
          const next = path as { label?: unknown; detail?: unknown };
          return {
            label: toStringValue(next.label, ""),
            detail: toStringValue(next.detail, ""),
          };
        })
        .filter((path): path is { label: string; detail: string } => Boolean(path?.label && path?.detail))
        .slice(0, 3)
    : [];

  return {
    recommendedMove: toStringValue(input.recommendedMove, fallback.recommendedMove),
    why: takeStrings(input.why, 3, fallback.why),
    next30Days: takeStrings(input.next30Days, 3, fallback.next30Days),
    watchOuts: takeStrings(input.watchOuts, 2, fallback.watchOuts),
    alternativePaths:
      alternativePaths.length >= 2 ? alternativePaths : fallback.alternativePaths,
    personalizationBasis: takeStrings(
      input.personalizationBasis,
      4,
      fallback.personalizationBasis ?? [],
    ),
    sourceUrls: takeUrls(input.sourceUrls, fallback.sourceUrls ?? []),
  };
}

export function buildFallbackChatReply(args: {
  analysis?: Partial<CareerAnalysis> | null;
  recommendation?: Partial<Recommendation> | null;
}) {
  const rating = args.analysis?.rating ?? "HOLD";
  const recommendedMove = args.recommendation?.recommendedMove;
  const nextStep = args.recommendation?.next30Days?.[0];

  if (recommendedMove && nextStep) {
    return `${recommendedMove} Start with this: ${nextStep}`;
  }

  return `Your asset still looks ${rating}. Focus on one visible win, one market conversation, and one concrete option you can pursue without panic.`;
}

export type Rating = "BUY" | "HOLD" | "SELL" | "SHORT";
export type WouldBuy = "Yes" | "No" | "Conditional";

export interface Dimension {
  score: number;
  explanation: string;
  signalCount: number;
}

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

export interface QualitativeInsight {
  label: string;
  value: string;
  level: InsightLevel;
  detail: string;
}

export type SignalSentiment = "positive" | "negative" | "neutral" | "mixed";

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

export type ResearchQuality = "live" | "limited" | "fallback";

export interface SourceBackedClaim {
  bucket: string;
  claim: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
}

export interface Analysis {
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
  qualitativeInsights?: QualitativeInsight[];
  keySignals?: JobKeySignal[];
  investmentThesis?: InvestmentThesis;
  bullCase: string[];
  bearCase: string[];
  ratingChangeTriggers: string[];
  evidence: {
    momentumSignals: string[];
    riskSignals: string[];
    hiringSignals: string[];
    companySignals: string[];
  };
  sources?: AnalysisSource[];
  chartData: { month: string; price: number }[];
  researchQuality?: ResearchQuality;
  evidenceMap?: Record<string, SourceBackedClaim[]>;
  _warning?: string;
  analysisId?: string;
  _cached?: boolean;
}

/* ---------- Decision / intent flow ---------- */

export type Intent = "stay" | "options" | "leave" | "other";

export interface DecisionContext {
  intent: Intent;
  /** label of the second-step sub-intent, or free text for "other" */
  subIntent: string;
  /** raw free-text if user picked "Something else" */
  freeText?: string;
}

/** Legacy alias kept so we don't break older imports. */
export type Decision = DecisionContext;

export interface Recommendation {
  headline?: string;
  recommendedMove: string;
  becauseYouSaid?: string[];
  becauseResearchShows?: string[];
  why: string[];
  next30Days: string[];
  watchOuts: string[];
  alternativePaths: { label: string; detail: string }[];
  personalizationBasis?: string[];
  sourceUrls?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

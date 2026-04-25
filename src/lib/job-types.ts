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
  bullCase: string[];
  bearCase: string[];
  ratingChangeTriggers: string[];
  evidence: {
    momentumSignals: string[];
    riskSignals: string[];
    hiringSignals: string[];
    companySignals: string[];
  };
  chartData: { month: string; price: number }[];
  _warning?: string;
  analysisId?: string;
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
  recommendedMove: string;
  why: string[];
  next30Days: string[];
  watchOuts: string[];
  alternativePaths: { label: string; detail: string }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

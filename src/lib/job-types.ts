export type Rating = "BUY" | "HOLD" | "SELL" | "SHORT";
export type WouldBuy = "Yes" | "No" | "Conditional";

export interface Dimension {
  score: number;
  explanation: string;
  signalCount: number;
}

export type InsightLevel = "strong" | "rising" | "neutral" | "limited" | "blocked" | "high" | "low" | "declining" | "weak";

export interface QualitativeInsight {
  label: string;          // e.g. "Promotion path"
  value: string;          // e.g. "Blocked"
  level: InsightLevel;    // semantic for color
  detail: string;         // one short sentence
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
  // New: human-readable verdict signals shown in reveal
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
}

export type Decision = "increase" | "reduce" | "exit";

export interface IncreaseData {
  promotionStrategy: string[];
  skillsToBuild: string[];
  internalMoves: string[];
  relationshipMap: string[];
  plan30: string[];
  plan60: string[];
  plan90: string[];
  increaseDividend: string;
  reduceVolatility: string;
  unlockUpside: string;
}

export interface ReduceData {
  companies: {
    name: string;
    ticker: string;
    thesis: string;
    upside: string;
    risk: string;
    liquidity: string;
    suggestedRole: string;
  }[];
}

export interface ExitData {
  startupIdeas: { name: string; pitch: string; fit: string }[];
  careerPivots: { path: string; why: string; leverage: string }[];
  timeline: { month0: string; month3: string; month6: string; month12: string };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

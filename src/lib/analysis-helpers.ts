import type {
  Analysis,
  InsightLevel,
  InvestmentThesis,
  SignalSentiment,
} from "@/lib/job-types";

export interface RevealSignal {
  label: string;
  value: string;
  level: InsightLevel;
  detail: string;
  sourceUrls: string[];
  roleImpact?: string;
  confidenceReason?: string;
}

function sentimentToLevel(sentiment: SignalSentiment): InsightLevel {
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

function sentimentToValue(sentiment: SignalSentiment) {
  switch (sentiment) {
    case "positive":
      return "Positive";
    case "negative":
      return "Negative";
    case "mixed":
      return "Mixed";
    default:
      return "Neutral";
  }
}

export function getRevealSignals(analysis: Analysis): RevealSignal[] {
  if (analysis.keySignals && analysis.keySignals.length >= 3) {
    return analysis.keySignals.slice(0, 5).map((signal) => ({
      label: signal.label,
      value: sentimentToValue(signal.sentiment),
      level: sentimentToLevel(signal.sentiment),
      detail: signal.roleImpact || `${signal.impact} Public evidence: ${signal.evidence}`,
      sourceUrls: signal.sourceUrls ?? [],
      confidenceReason: signal.confidenceReason,
    }));
  }

  return (analysis.qualitativeInsights ?? []).map((insight) => ({
    ...insight,
    sourceUrls: [],
  }));
}

export function getInvestmentThesis(analysis: Analysis): InvestmentThesis {
  return analysis.investmentThesis ?? {
    keep: analysis.bullCase,
    caution: analysis.bearCase,
    triggers: analysis.ratingChangeTriggers,
  };
}

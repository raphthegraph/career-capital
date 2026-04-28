import type {
  Analysis,
  InsightLevel,
  InvestmentThesis,
  QualitativeInsight,
  SignalSentiment,
} from "@/lib/job-types";

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

export function getRevealSignals(analysis: Analysis): QualitativeInsight[] {
  if (analysis.keySignals && analysis.keySignals.length >= 3) {
    return analysis.keySignals.slice(0, 5).map((signal) => ({
      label: signal.label,
      value: sentimentToValue(signal.sentiment),
      level: sentimentToLevel(signal.sentiment),
      detail: `${signal.impact} Public evidence: ${signal.evidence}`,
    }));
  }

  return analysis.qualitativeInsights ?? [];
}

export function getInvestmentThesis(analysis: Analysis): InvestmentThesis {
  return analysis.investmentThesis ?? {
    keep: analysis.bullCase,
    caution: analysis.bearCase,
    triggers: analysis.ratingChangeTriggers,
  };
}

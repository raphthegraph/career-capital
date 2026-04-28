import { describe, expect, it } from "vitest";

import { getInvestmentThesis, getRevealSignals } from "@/lib/analysis-helpers";
import type { Analysis } from "@/lib/job-types";

const baseAnalysis: Analysis = {
  ticker: "OPEN-RE",
  rating: "BUY",
  wouldBuy: "Conditional",
  confidence: 82,
  oneLineVerdict: "High-upside role with visible leverage if you can stay close to frontier work.",
  careerAssetScore: 84,
  dimensions: {
    careerDividend: { score: 80, explanation: "High learning density.", signalCount: 4 },
    momentum: { score: 86, explanation: "Strong company momentum.", signalCount: 4 },
    volatility: { score: 56, explanation: "Fast-moving environment.", signalCount: 3 },
    upsideOptionality: { score: 90, explanation: "Massive future optionality.", signalCount: 4 },
    exitLiquidity: { score: 92, explanation: "Exceptional brand transfer.", signalCount: 4 },
  },
  qualitativeInsights: [],
  keySignals: [
    {
      label: "Frontier access",
      detail: "Close to high-leverage AI systems.",
      impact: "Your learning curve compounds faster than at most companies.",
      evidence: "OpenAI remains central in public AI product and infrastructure coverage.",
      sentiment: "positive",
      sourceUrls: ["https://example.com/source-1"],
    },
    {
      label: "Elite peer set",
      detail: "The internal bar is unusually high.",
      impact: "The role only overperforms if your contribution stays visible.",
      evidence: "The company’s public hiring profile suggests concentrated top-end talent.",
      sentiment: "mixed",
      sourceUrls: ["https://example.com/source-2"],
    },
    {
      label: "Huge external signal",
      detail: "The logo still carries unusual downstream weight.",
      impact: "A credible stint improves your future market quickly.",
      evidence: "OpenAI’s market position and visibility create strong external optionality.",
      sentiment: "positive",
      sourceUrls: ["https://example.com/source-3"],
    },
  ],
  investmentThesis: {
    keep: ["Keep one", "Keep two", "Keep three"],
    caution: ["Caution one", "Caution two", "Caution three"],
    triggers: ["Trigger one", "Trigger two", "Trigger three"],
  },
  bullCase: ["Legacy bull one", "Legacy bull two", "Legacy bull three"],
  bearCase: ["Legacy bear one", "Legacy bear two", "Legacy bear three"],
  ratingChangeTriggers: ["Legacy trigger one", "Legacy trigger two", "Legacy trigger three"],
  evidence: {
    momentumSignals: ["Momentum one", "Momentum two", "Momentum three"],
    riskSignals: ["Risk one", "Risk two", "Risk three"],
    hiringSignals: ["Hiring one", "Hiring two", "Hiring three"],
    companySignals: ["Company one", "Company two", "Company three"],
  },
  sources: [
    {
      title: "Source one",
      url: "https://example.com/source-1",
      snippet: "Snippet one",
      sourceType: "news",
    },
  ],
  chartData: [{ month: "Jan", price: 55 }],
};

describe("analysis helpers", () => {
  it("prefers job-specific key signals for the reveal flow", () => {
    const signals = getRevealSignals(baseAnalysis);

    expect(signals).toHaveLength(3);
    expect(signals[0].label).toBe("Frontier access");
    expect(signals[0].detail).toContain("Public evidence:");
  });

  it("prefers the structured investment thesis when available", () => {
    const thesis = getInvestmentThesis(baseAnalysis);

    expect(thesis.keep).toEqual(["Keep one", "Keep two", "Keep three"]);
    expect(thesis.caution).toEqual(["Caution one", "Caution two", "Caution three"]);
    expect(thesis.triggers).toEqual(["Trigger one", "Trigger two", "Trigger three"]);
  });
});

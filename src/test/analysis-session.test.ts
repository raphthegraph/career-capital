import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStoredAnalysisSession,
  loadStoredAnalysisSession,
  saveStoredAnalysisSession,
} from "@/lib/analysis-session";
import type { Analysis, Decision } from "@/lib/job-types";

const analysisFixture: Analysis = {
  ticker: "N26-PM",
  rating: "HOLD",
  wouldBuy: "Conditional",
  confidence: 72,
  oneLineVerdict: "Useful asset, but not one to overweight blindly.",
  careerAssetScore: 66,
  dimensions: {
    careerDividend: { score: 70, explanation: "Good learning density.", signalCount: 3 },
    momentum: { score: 63, explanation: "Mixed company momentum.", signalCount: 3 },
    volatility: { score: 50, explanation: "Some execution and sector risk.", signalCount: 3 },
    upsideOptionality: { score: 61, explanation: "There is upside, but it is earned.", signalCount: 3 },
    exitLiquidity: { score: 79, explanation: "Portable PM signal.", signalCount: 3 },
  },
  qualitativeInsights: [
    {
      label: "Promotion path",
      value: "Mixed",
      level: "neutral",
      detail: "The next step exists, but it is not automatic.",
    },
  ],
  keySignals: [
    {
      label: "Fintech regulation",
      detail: "Regulation shapes product velocity.",
      impact: "You gain useful judgment, but launches can slow down.",
      evidence: "Public coverage ties product execution to regulatory pressure.",
      sentiment: "mixed",
      sourceUrls: ["https://example.com/source-1"],
    },
    {
      label: "Selective growth",
      detail: "The company is growing selectively, not recklessly.",
      impact: "Internal upside is real, but less explosive.",
      evidence: "Public hiring and market signals imply disciplined expansion.",
      sentiment: "neutral",
      sourceUrls: ["https://example.com/source-2"],
    },
    {
      label: "Strong external signal",
      detail: "The PM brand remains portable.",
      impact: "Your exit liquidity stays healthy if you ship visible work.",
      evidence: "The company remains legible in the European fintech market.",
      sentiment: "positive",
      sourceUrls: ["https://example.com/source-3"],
    },
  ],
  investmentThesis: {
    keep: ["Keep one", "Keep two", "Keep three"],
    caution: ["Caution one", "Caution two", "Caution three"],
    triggers: ["Trigger one", "Trigger two", "Trigger three"],
  },
  bullCase: ["Keep one", "Keep two", "Keep three"],
  bearCase: ["Caution one", "Caution two", "Caution three"],
  ratingChangeTriggers: ["Trigger one", "Trigger two", "Trigger three"],
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
  chartData: [{ month: "Jan", price: 51.4 }],
  analysisId: "analysis-123",
};

const decisionFixture: Decision = {
  intent: "options",
  subIntent: "Stronger company, similar role",
};

describe("analysis session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a stable stored session", () => {
    saveStoredAnalysisSession({
      phase: "dashboard",
      company: "N26",
      role: "Product Manager",
      analysis: analysisFixture,
      decision: decisionFixture,
    });

    expect(loadStoredAnalysisSession()).toEqual({
      phase: "dashboard",
      company: "N26",
      role: "Product Manager",
      analysis: analysisFixture,
      decision: decisionFixture,
    });
  });

  it("downgrades an invalid decision-stage restore to dashboard", () => {
    saveStoredAnalysisSession({
      phase: "decision",
      company: "N26",
      role: "Product Manager",
      analysis: analysisFixture,
      decision: null,
    });

    expect(loadStoredAnalysisSession()).toEqual({
      phase: "dashboard",
      company: "N26",
      role: "Product Manager",
      analysis: analysisFixture,
      decision: null,
    });
  });

  it("drops malformed stored payloads", () => {
    window.localStorage.setItem(
      "career-capital-session-v1",
      JSON.stringify({
        phase: "landing",
        company: "N26",
      }),
    );

    expect(loadStoredAnalysisSession()).toBeNull();
    expect(window.localStorage.getItem("career-capital-session-v1")).toBeNull();
  });

  it("clears the stored session explicitly", () => {
    saveStoredAnalysisSession({
      phase: "verdict",
      company: "N26",
      role: "Product Manager",
      analysis: analysisFixture,
      decision: null,
    });

    clearStoredAnalysisSession();

    expect(loadStoredAnalysisSession()).toBeNull();
  });
});

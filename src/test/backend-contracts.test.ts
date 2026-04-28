import { describe, expect, it } from "vitest";

import {
  buildFallbackRecommendation,
  buildPersonalizationBrief,
  normalizeChatMessagesInput,
  normalizeDecisionInput,
} from "../../supabase/functions/_shared/career";

describe("normalizeDecisionInput", () => {
  it("preserves the current decision payload shape", () => {
    expect(
      normalizeDecisionInput({
        decision: {
          intent: "stay",
          subIntent: "Grow scope -> Win a bigger mandate",
        },
      }),
    ).toEqual({
      intent: "stay",
      subIntent: "Grow scope -> Win a bigger mandate",
    });
  });

  it("maps legacy question answers into a decision context", () => {
    expect(
      normalizeDecisionInput({
        questionAnswers: [
          { question: "Given this rating, what are you considering?", answer: "Leave" },
          { question: "What matters most right now?", answer: "Better learning density" },
          { question: "Anything else to factor in?", answer: "Within 6 months" },
        ],
      }),
    ).toEqual({
      intent: "leave",
      subIntent: "Better learning density -> Within 6 months",
      freeText: "Within 6 months",
    });
  });
});

describe("normalizeChatMessagesInput", () => {
  it("accepts a single message payload", () => {
    expect(
      normalizeChatMessagesInput({
        message: "What would make this move stronger?",
      }),
    ).toEqual([
      {
        role: "user",
        content: "What would make this move stronger?",
      },
    ]);
  });

  it("prefers the richer messages payload when present", () => {
    expect(
      normalizeChatMessagesInput({
        message: "Ignored fallback",
        messages: [
          { role: "user", content: "First question" },
          { role: "assistant", content: "First answer" },
          { role: "user", content: "Follow-up" },
        ],
      }),
    ).toEqual([
      { role: "user", content: "First question" },
      { role: "assistant", content: "First answer" },
      { role: "user", content: "Follow-up" },
    ]);
  });
});

describe("personalization helpers", () => {
  it("turns the decision context into a prompt-ready personalization brief", () => {
    const brief = buildPersonalizationBrief({
      company: "N26",
      role: "Product Manager",
      analysis: {
        rating: "HOLD",
        wouldBuy: "Conditional",
        confidence: 72,
        careerAssetScore: 66,
        oneLineVerdict: "Decent compounding seat, but promotion path is less predictable.",
        keySignals: [
          {
            label: "Regulatory pressure",
            detail: "Regulation shapes product velocity.",
            impact: "Your launches may require more stakeholder alignment before they become promotion evidence.",
            evidence: "Public reporting highlights compliance pressure.",
            sentiment: "mixed",
            sourceUrls: [],
          },
        ],
      },
      decision: {
        intent: "stay",
        subIntent: "Get promoted faster -> No internal sponsor yet",
      },
    });

    expect(brief).toContain("Product Manager at N26");
    expect(brief).toContain("Get promoted faster");
    expect(brief).toContain("Regulatory pressure");
  });

  it("makes fallback recommendations reflect the user's stated focus", () => {
    const recommendation = buildFallbackRecommendation("Tesla", "Mechanical Engineer", {
      intent: "options",
      subIntent: "Higher-growth startup -> Move within 6 months",
    });

    expect(recommendation.recommendedMove).toContain("Higher-growth startup");
    expect(recommendation.next30Days.join(" ")).toContain("Higher-growth startup");
  });
});

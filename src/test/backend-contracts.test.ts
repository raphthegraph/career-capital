import { describe, expect, it } from "vitest";

import {
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

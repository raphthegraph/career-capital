// recommend-action — generates a unified recommendation given user intent
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface DecisionContext {
  intent: "stay" | "options" | "leave" | "other";
  subIntent: string;
  freeText?: string;
}

const RECO_TOOL = {
  type: "function",
  function: {
    name: "emit_recommendation",
    description: "Personalized career recommendation for the user.",
    parameters: {
      type: "object",
      properties: {
        recommendedMove: { type: "string", description: "One sentence, concrete move." },
        why: { type: "array", items: { type: "string" }, description: "Exactly 3 short bullets." },
        next30Days: { type: "array", items: { type: "string" }, description: "Exactly 3 concrete actions." },
        watchOuts: { type: "array", items: { type: "string" }, description: "Exactly 2 risks." },
        alternativePaths: {
          type: "array",
          description: "2-3 alternative paths.",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              detail: { type: "string", description: "1-2 sentence explanation." },
            },
            required: ["label", "detail"],
          },
        },
      },
      required: ["recommendedMove", "why", "next30Days", "watchOuts", "alternativePaths"],
    },
  },
};

async function ai(system: string, user: string) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [RECO_TOOL],
        tool_choice: { type: "function", function: { name: RECO_TOOL.function.name } },
      }),
    });
    if (!r.ok) {
      console.error("ai err", r.status, await r.text());
      return null;
    }
    const d = await r.json();
    const c = d.choices?.[0]?.message?.tool_calls?.[0];
    if (!c) return null;
    return typeof c.function.arguments === "string" ? JSON.parse(c.function.arguments) : c.function.arguments;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function fallback(company: string, role: string, decision: DecisionContext) {
  const intentLabel: Record<string, string> = {
    stay: "Stay for 3 months but accelerate visibility",
    options: "Stay, but quietly build external optionality",
    leave: "Plan a 90-day exit while protecting downside",
    other: `Pursue: ${decision.freeText ?? decision.subIntent}`,
  };
  return {
    recommendedMove: `${intentLabel[decision.intent] ?? "Reposition deliberately"} — focused on ${decision.subIntent.toLowerCase()}.`,
    why: [
      `Your ${role} seat at ${company} still has compounding learning value.`,
      "External signals are mixed — moving without a thesis is risky.",
      `Optionality compounds when you ship visible wins before any move.`,
    ],
    next30Days: [
      "Document quantified wins from the last 6 months in one page.",
      `Have 3 informal conversations relevant to "${decision.subIntent}".`,
      "Define one bet that, if landed, repositions you internally.",
    ],
    watchOuts: [
      "Don't trigger a counter-offer dance unless you'll actually leave.",
      "Don't broadcast intent — preserve narrative control.",
    ],
    alternativePaths: [
      { label: "Double down internally", detail: `Lock a sponsor, ship a strategic surface at ${company}, push promo within 2 quarters.` },
      { label: "Lateral to a stronger asset", detail: "Move to a peer company with better momentum but similar role — fastest repricing path." },
      { label: "Operator at Series A/B", detail: "Trade brand for leverage and equity. Fits if you want speed and ownership." },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { decision, company, role, analysis } = (await req.json()) as {
      decision: DecisionContext;
      company: string;
      role: string;
      analysis?: any;
    };

    const ctx = `Company: ${company}
Role: ${role}
Verdict: ${analysis?.rating ?? "N/A"} (${analysis?.wouldBuy ?? "?"})
One-liner: ${analysis?.oneLineVerdict ?? ""}
Bull: ${(analysis?.bullCase ?? []).join(" | ")}
Bear: ${(analysis?.bearCase ?? []).join(" | ")}

User intent: ${decision.intent.toUpperCase()}
User specific focus: ${decision.subIntent}
${decision.freeText ? `User free-text: ${decision.freeText}` : ""}`;

    const sys = `You are $JOB, a brutally honest career-asset advisor.
Generate ONE personalized recommendation grounded in the user's intent and the prior analysis.
- recommendedMove: one sentence, concrete, opinionated.
- why: exactly 3 short bullets (<18 words each).
- next30Days: exactly 3 concrete, doable actions.
- watchOuts: exactly 2 risks.
- alternativePaths: 2-3 distinct paths the user could take instead.
Use second person. Be sharp. Avoid generic platitudes.`;

    const out = await ai(sys, ctx);
    const data = out && out.recommendedMove ? out : fallback(company, role, decision);

    return new Response(JSON.stringify({ decision, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-action error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

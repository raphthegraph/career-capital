// recommend-action — generates a personalized recommendation grounded in the
// stored analysis (loaded from Supabase by analysisId when available) and the
// user's decision flow. Persists decision + recommendation + embedding.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface DecisionContext {
  intent: "stay" | "options" | "leave" | "other";
  subIntent: string;
  freeText?: string;
}

const RECO_TOOL = {
  type: "function",
  function: {
    name: "emit_recommendation",
    description: "Personalized career recommendation grounded in analysis + user intent.",
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
      console.error("ai err", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const d = await r.json();
    const c = d.choices?.[0]?.message?.tool_calls?.[0];
    if (!c) return null;
    return typeof c.function.arguments === "string" ? JSON.parse(c.function.arguments) : c.function.arguments;
  } catch (e) {
    console.error("ai exception", e);
    return null;
  }
}

async function embedOne(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.data?.[0]?.embedding ?? null;
  } catch {
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
    recommendedMove: `${intentLabel[decision.intent] ?? "Reposition deliberately"} — focused on ${(decision.subIntent || "your goal").toLowerCase()}.`,
    why: [
      `Your ${role} seat at ${company} still has compounding learning value.`,
      "External signals are mixed — moving without a thesis is risky.",
      "Optionality compounds when you ship visible wins before any move.",
    ],
    next30Days: [
      "Document quantified wins from the last 6 months in one page.",
      `Have 3 informal conversations relevant to "${decision.subIntent || "your goal"}".`,
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

async function loadAnalysisById(analysisId: string) {
  try {
    const { data, error } = await supabase
      .from("job_analyses")
      .select("id, company, role, analysis_json")
      .eq("id", analysisId)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

async function persistDecisionAndReco(args: {
  analysisId: string;
  decision: DecisionContext;
  recommendation: any;
}) {
  try {
    const { data: dfRow, error: dfErr } = await supabase
      .from("decision_flows")
      .insert({
        analysis_id: args.analysisId,
        question_1: "Given this rating, what are you considering?",
        answer_1: args.decision.intent,
        question_2: "Specific focus",
        answer_2: args.decision.subIntent,
        question_3: "Free text / constraint",
        answer_3: args.decision.freeText ?? null,
      })
      .select("id")
      .single();
    if (dfErr) console.error("decision_flows insert err", dfErr);
    const decisionFlowId = dfRow?.id ?? null;

    const { data: recRow, error: recErr } = await supabase
      .from("recommendations")
      .insert({
        analysis_id: args.analysisId,
        decision_flow_id: decisionFlowId,
        recommendation_json: args.recommendation,
      })
      .select("id")
      .single();
    if (recErr) console.error("recommendations insert err", recErr);
    const recommendationId = recRow?.id ?? null;

    // Embed recommendation for chat retrieval
    const recoText = `Recommendation: ${args.recommendation.recommendedMove}. Why: ${(args.recommendation.why ?? []).join(" | ")}. Next 30 days: ${(args.recommendation.next30Days ?? []).join(" | ")}. Watch-outs: ${(args.recommendation.watchOuts ?? []).join(" | ")}.`;
    const vec = await embedOne(recoText);
    if (vec) {
      const { error: embErr } = await supabase.from("analysis_embeddings").insert({
        analysis_id: args.analysisId,
        content_type: "recommendation",
        content: recoText,
        embedding: vec as any,
        metadata: { recommendationId },
      });
      if (embErr) console.error("embed reco insert err", embErr);
    }

    return { decisionFlowId, recommendationId };
  } catch (e) {
    console.error("persist decision/reco exception", e);
    return { decisionFlowId: null, recommendationId: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { decision, company, role, analysis, analysisId } = (await req.json()) as {
      decision: DecisionContext;
      company: string;
      role: string;
      analysis?: any;
      analysisId?: string;
    };

    // Prefer DB-loaded analysis when analysisId is supplied
    let resolvedAnalysis = analysis;
    let resolvedCompany = company;
    let resolvedRole = role;
    let resolvedAnalysisId = analysisId ?? null;

    if (analysisId) {
      const loaded = await loadAnalysisById(analysisId);
      if (loaded) {
        resolvedAnalysis = loaded.analysis_json;
        resolvedCompany = loaded.company;
        resolvedRole = loaded.role;
      }
    }

    const a = resolvedAnalysis ?? {};
    const ctx = `Company: ${resolvedCompany}
Role: ${resolvedRole}
Verdict: ${a?.rating ?? "N/A"} (${a?.wouldBuy ?? "?"})
Confidence: ${a?.confidence ?? "?"} | Career Asset Score: ${a?.careerAssetScore ?? "?"}
One-liner: ${a?.oneLineVerdict ?? ""}
Key signals: ${(a?.qualitativeInsights ?? []).map((s: any) => `${s.label}=${s.value}`).join(" | ")}
Bull: ${(a?.bullCase ?? []).join(" | ")}
Bear: ${(a?.bearCase ?? []).join(" | ")}
Triggers: ${(a?.ratingChangeTriggers ?? []).join(" | ")}

User intent: ${decision.intent.toUpperCase()}
User specific focus: ${decision.subIntent}
${decision.freeText ? `User free-text: ${decision.freeText}` : ""}`;

    const sys = `You are $JOB, a brutally honest career-asset advisor.
Generate ONE personalized recommendation grounded in BOTH the user's intent AND the analysis above (rating, key signals, bull/bear).
- recommendedMove: one sentence, concrete, opinionated, references the company/role.
- why: exactly 3 short bullets (<18 words each), each tied to a specific signal in the analysis.
- next30Days: exactly 3 concrete, doable actions for THIS person.
- watchOuts: exactly 2 risks specific to this situation.
- alternativePaths: 2-3 distinct paths the user could take instead.
Use second person. Be sharp. Avoid generic platitudes.`;

    const out = await ai(sys, ctx);
    const data = out && out.recommendedMove ? out : fallback(resolvedCompany, resolvedRole, decision);

    let recommendationId: string | null = null;
    if (resolvedAnalysisId) {
      const persisted = await persistDecisionAndReco({
        analysisId: resolvedAnalysisId,
        decision,
        recommendation: data,
      });
      recommendationId = persisted.recommendationId;
    }

    return new Response(
      JSON.stringify({ decision, data, recommendationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recommend-action error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

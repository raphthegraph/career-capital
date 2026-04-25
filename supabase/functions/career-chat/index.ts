// $JOB — career-chat edge function
// If `analysisId` is provided, loads analysis + latest recommendation + recent
// chat history from Supabase and uses pgvector retrieval to ground the reply.
// Otherwise falls back to inline-context mode (backward compatible).

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
  intent?: "stay" | "options" | "leave" | "other";
  subIntent?: string;
  freeText?: string;
}

interface Body {
  company?: string;
  role?: string;
  decision?: DecisionContext;
  analysis?: any;
  recommendation?: any;
  messages: { role: "user" | "assistant"; content: string }[];
  analysisId?: string;
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

async function loadContextFromDb(analysisId: string, userMessage: string) {
  const out: {
    analysis?: any;
    company?: string;
    role?: string;
    recommendation?: any;
    retrieved: { content_type: string; content: string }[];
    recentMessages: { role: string; content: string }[];
  } = { retrieved: [], recentMessages: [] };

  try {
    const { data: a } = await supabase
      .from("job_analyses")
      .select("company, role, analysis_json")
      .eq("id", analysisId)
      .maybeSingle();
    if (a) {
      out.analysis = a.analysis_json;
      out.company = a.company;
      out.role = a.role;
    }

    const { data: rec } = await supabase
      .from("recommendations")
      .select("recommendation_json")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rec) out.recommendation = rec.recommendation_json;

    // vector retrieval (best-effort)
    const vec = await embedOne(userMessage);
    if (vec) {
      const { data: matches, error } = await supabase.rpc("match_analysis_embeddings", {
        query_embedding: vec as any,
        match_analysis_id: analysisId,
        match_count: 6,
      });
      if (!error && Array.isArray(matches)) {
        out.retrieved = matches.map((m: any) => ({ content_type: m.content_type, content: m.content }));
      } else if (error) {
        console.error("vector match err", error);
      }
    }

    // recent chat history (last 10)
    const { data: hist } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (hist) out.recentMessages = hist.reverse();
  } catch (e) {
    console.error("loadContextFromDb exception", e);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    const { messages, analysisId } = body;
    let { company, role, decision, analysis, recommendation } = body;

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          reply:
            "AI is offline. Try again in a moment — I usually answer with concrete next steps tied to your asset score.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = messages?.[messages.length - 1]?.content ?? "";

    // DB-grounded mode
    let retrievedBlock = "";
    if (analysisId) {
      const ctx = await loadContextFromDb(analysisId, userMessage);
      if (ctx.analysis) analysis = ctx.analysis;
      if (ctx.company) company = ctx.company;
      if (ctx.role) role = ctx.role;
      if (ctx.recommendation && !recommendation) recommendation = ctx.recommendation;
      if (ctx.retrieved.length) {
        retrievedBlock = ctx.retrieved
          .map((r) => `- [${r.content_type}] ${r.content}`)
          .join("\n");
      }

      // Persist user message (best-effort, non-blocking)
      supabase
        .from("chat_messages")
        .insert({ analysis_id: analysisId, role: "user", content: userMessage })
        .then(({ error }) => {
          if (error) console.error("persist user msg err", error);
        });
    }

    const system = `You are $JOB, a brutally honest career-asset advisor. The user is treating their job as an investable asset.
Speak with sharp financial framing. Be specific, opinionated, concise (max ~120 words per reply, often less).
Never repeat the analysis verbatim — extend it with action.
Distinguish public evidence from inference. Do not invent private company facts.

CONTEXT — current asset:
- Company: ${company ?? "?"}
- Role: ${role ?? "?"}
- Verdict: ${analysis?.rating ?? "?"} (${analysis?.wouldBuy ?? "?"})
- One-liner: ${analysis?.oneLineVerdict ?? ""}
- User intent: ${decision?.intent?.toUpperCase?.() ?? "N/A"} — focus: ${decision?.subIntent ?? ""}
- Bull: ${(analysis?.bullCase ?? []).join(" | ")}
- Bear: ${(analysis?.bearCase ?? []).join(" | ")}
${recommendation ? `- Plan summary: ${JSON.stringify(recommendation).slice(0, 1000)}` : ""}
${retrievedBlock ? `\nRELEVANT RETRIEVED CONTEXT (top vector matches for this question):\n${retrievedBlock}` : ""}

If asked off-topic, redirect to career strategy. Use second-person ("you", "your asset"). No emojis.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("chat ai err", r.status, txt.slice(0, 200));
      const reply =
        r.status === 402
          ? "AI credits exhausted. Top up to keep advising."
          : r.status === 429
          ? "Rate limited — give it a few seconds."
          : "Could not reach AI.";
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const d = await r.json();
    const reply = d.choices?.[0]?.message?.content ?? "No response.";

    // Persist assistant reply (best-effort)
    if (analysisId) {
      supabase
        .from("chat_messages")
        .insert({ analysis_id: analysisId, role: "assistant", content: reply })
        .then(({ error }) => {
          if (error) console.error("persist assistant msg err", error);
        });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("career-chat fatal", e);
    return new Response(
      JSON.stringify({ reply: "Something went wrong. Try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

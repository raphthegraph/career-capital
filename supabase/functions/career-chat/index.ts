import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  buildFallbackChatReply,
  normalizeChatMessagesInput,
  normalizeAnalysisPayload,
  researchSourcesToAnalysisSources,
  type CareerAnalysis,
  type ChatTurn,
  type DecisionContext,
  type Recommendation,
} from "../_shared/career.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { createEmbeddings, generateTextReply } from "../_shared/openai.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface Body {
  company?: string;
  role?: string;
  decision?: DecisionContext;
  analysis?: CareerAnalysis;
  recommendation?: Recommendation;
  message?: string;
  messages?: ChatTurn[];
  analysisId?: string;
}

async function loadSourcesByAnalysisId(analysisId: string) {
  try {
    const { data, error } = await supabase
      .from("research_sources")
      .select("title, url, snippet, source_type")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      if (error) console.error("career-chat source lookup error", error);
      return [];
    }

    return researchSourcesToAnalysisSources(
      data.map((source) => ({
        title: source.title ?? "",
        url: source.url ?? "",
        snippet: source.snippet ?? "",
        sourceType: source.source_type ?? "other",
      })),
    );
  } catch (error) {
    console.error("career-chat source lookup exception", error);
    return [];
  }
}

async function retrieveChatContext(analysisId: string, userMessage: string) {
  const context: {
    company?: string;
    role?: string;
    analysis?: CareerAnalysis;
    recommendation?: Recommendation;
    retrieved: { contentType: string; content: string }[];
    recentMessages: { role: "user" | "assistant"; content: string }[];
  } = {
    retrieved: [],
    recentMessages: [],
  };

  try {
    const { data: analysisRow, error: analysisError } = await supabase
      .from("job_analyses")
      .select("company, role, analysis_json")
      .eq("id", analysisId)
      .maybeSingle();

    if (analysisError) console.error("career-chat analysis lookup error", analysisError);

    if (analysisRow) {
      const sources = await loadSourcesByAnalysisId(analysisId);
      context.company = analysisRow.company;
      context.role = analysisRow.role;
      context.analysis = normalizeAnalysisPayload({
        company: analysisRow.company,
        role: analysisRow.role,
        raw: analysisRow.analysis_json,
        sources,
      });
    }

    const { data: recommendationRow, error: recommendationError } = await supabase
      .from("recommendations")
      .select("recommendation_json")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recommendationError) {
      console.error("career-chat recommendation lookup error", recommendationError);
    }
    if (recommendationRow?.recommendation_json) {
      context.recommendation = recommendationRow.recommendation_json as Recommendation;
    }

    const [queryVector] = (await createEmbeddings([userMessage])) ?? [];
    if (queryVector) {
      const { data: matches, error: matchError } = await supabase.rpc(
        "match_analysis_embeddings",
        {
          query_embedding: queryVector as unknown as string,
          match_analysis_id: analysisId,
          match_count: 6,
        },
      );

      if (matchError) {
        console.error("career-chat vector match error", matchError);
      } else if (Array.isArray(matches)) {
        context.retrieved = matches.map((match: { content_type: string; content: string }) => ({
          contentType: match.content_type,
          content: match.content,
        }));
      }
    }

    const { data: history, error: historyError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (historyError) console.error("career-chat history lookup error", historyError);

    if (history) {
      context.recentMessages = history
        .reverse()
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        }));
    }
  } catch (error) {
    console.error("career-chat context exception", error);
  }

  return context;
}

async function generateChatAnswer(args: {
  company?: string;
  role?: string;
  decision?: DecisionContext;
  analysis?: CareerAnalysis;
  recommendation?: Recommendation;
  retrieved: { contentType: string; content: string }[];
  messages: ChatTurn[];
}) {
  const analysis = args.analysis;
  const recommendation = args.recommendation;
  const retrievedBlock = args.retrieved
    .map((item) => `- [${item.contentType}] ${item.content}`)
    .join("\n");
  const keySignals = analysis?.keySignals
    ?.map((signal) => `${signal.label}: ${signal.impact}`)
    .join(" | ");

  const systemPrompt = `You are $JOB, a direct career-asset advisor.
Keep replies concise, specific, and grounded in the user's job as an asset.
Use second person.
Distinguish public evidence from inference.
Do not restate the full analysis unless needed.
Push toward action, tradeoffs, and timing.

Current context:
- Company: ${args.company ?? "Unknown"}
- Role: ${args.role ?? "Unknown"}
- Rating: ${analysis?.rating ?? "HOLD"} (${analysis?.wouldBuy ?? "Conditional"})
- One-line verdict: ${analysis?.oneLineVerdict ?? ""}
- Key signals: ${keySignals ?? "Not available"}
- User intent: ${args.decision?.intent ?? "unknown"} / ${args.decision?.subIntent ?? ""}
${recommendation ? `- Recommendation: ${recommendation.recommendedMove}` : ""}
${retrievedBlock ? `- Retrieved context:\n${retrievedBlock}` : ""}`;

  return generateTextReply({
    systemPrompt,
    messages: args.messages,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as Body;
    const messages = normalizeChatMessagesInput({
      message: body.message,
      messages: body.messages,
    });
    const userMessage = messages[messages.length - 1]?.content?.trim() ?? "";

    if (!userMessage) {
      return jsonResponse({ reply: "Ask a question about your next move." });
    }

    let company = body.company;
    let role = body.role;
    let analysis = body.analysis;
    let recommendation = body.recommendation;
    let recentMessages: { role: "user" | "assistant"; content: string }[] = [];
    let retrieved: { contentType: string; content: string }[] = [];

    if (body.analysisId) {
      const context = await retrieveChatContext(body.analysisId, userMessage);
      company = context.company ?? company;
      role = context.role ?? role;
      analysis = context.analysis ?? analysis;
      recommendation = context.recommendation ?? recommendation;
      recentMessages = context.recentMessages;
      retrieved = context.retrieved;

      supabase.from("chat_messages").insert({
        analysis_id: body.analysisId,
        role: "user",
        content: userMessage,
      }).then(({ error }) => {
        if (error) console.error("career-chat user message persistence error", error);
      });
    }

    const conversation = [...recentMessages, ...messages].slice(-12);
    const aiResult = await generateChatAnswer({
      company,
      role,
      decision: body.decision,
      analysis,
      recommendation,
      retrieved,
      messages: conversation,
    });

    const reply =
      aiResult.data ??
      buildFallbackChatReply({
        analysis,
        recommendation,
      });

    if (!aiResult.data && aiResult.failure) {
      console.error("career-chat fallback", aiResult.failure);
    }

    if (body.analysisId) {
      supabase.from("chat_messages").insert({
        analysis_id: body.analysisId,
        role: "assistant",
        content: reply,
      }).then(({ error }) => {
        if (error) console.error("career-chat assistant message persistence error", error);
      });
    }

    return jsonResponse({
      reply,
      ...(aiResult.data ? {} : { _warning: "Chat fallback used." }),
    });
  } catch (error) {
    console.error("career-chat fatal", error);
    return jsonResponse({
      reply:
        "Your asset still needs a clean next-step thesis. Start with one visible win and one market conversation this week.",
      _warning: "Unexpected server error. Returning fallback chat guidance.",
    });
  }
});

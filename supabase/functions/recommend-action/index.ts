import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  buildPersonalizationBrief,
  buildFallbackRecommendation,
  normalizeAnalysisPayload,
  normalizeDecisionInput,
  normalizeRecommendationPayload,
  researchSourcesToAnalysisSources,
  type CareerAnalysis,
  type DecisionContext,
} from "../_shared/career.ts";
import {
  enforceRateLimit,
  healthResponse,
  handleCorsPreflight,
  isHealthCheck,
  jsonResponse,
  readJsonBody,
  rejectDisallowedOrigin,
  requirePost,
  validateTextField,
} from "../_shared/http.ts";
import { createEmbeddings, generateStructuredOutput } from "../_shared/openai.ts";
import { recommendationSchema } from "../_shared/schemas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function loadSourcesByAnalysisId(analysisId: string) {
  try {
    const { data, error } = await supabase
      .from("research_sources")
      .select("title, url, snippet, source_type")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      if (error) console.error("recommend-action source lookup error", error);
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
    console.error("recommend-action source lookup exception", error);
    return [];
  }
}

async function loadAnalysisById(analysisId: string) {
  try {
    const { data, error } = await supabase
      .from("job_analyses")
      .select("id, company, role, analysis_json")
      .eq("id", analysisId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("recommend-action analysis lookup error", error);
      return null;
    }

    const sources = await loadSourcesByAnalysisId(analysisId);
    return {
      id: data.id,
      company: data.company,
      role: data.role,
      analysis: normalizeAnalysisPayload({
        company: data.company,
        role: data.role,
        raw: data.analysis_json,
        sources,
      }),
    };
  } catch (error) {
    console.error("recommend-action analysis lookup exception", error);
    return null;
  }
}

async function generateRecommendation(args: {
  company: string;
  role: string;
  analysis: CareerAnalysis;
  decision: DecisionContext;
}) {
  const sourceUrls = Array.from(new Set([
    ...args.analysis.keySignals.flatMap((signal) => signal.sourceUrls ?? []),
    ...(args.analysis.sources ?? []).map((source) => source.url),
  ])).slice(0, 6);
  const keySignals = args.analysis.keySignals
    .map(
      (signal) =>
        `- ${signal.label}: ${signal.roleImpact ?? signal.impact} Evidence: ${signal.evidence} Sources: ${(signal.sourceUrls ?? []).join(", ") || "inference"}`,
    )
    .join("\n");
  const evidenceMap = args.analysis.evidenceMap
    ? Object.entries(args.analysis.evidenceMap)
        .map(([bucket, claims]) => `${bucket}: ${claims.map((claim) => `${claim.claim} (${claim.sourceUrl})`).join(" | ")}`)
        .join("\n")
    : "No structured evidence map available.";
  const thesis = args.analysis.investmentThesis;
  const personalizationBrief = buildPersonalizationBrief({
    company: args.company,
    role: args.role,
    analysis: args.analysis,
    decision: args.decision,
  });

  const systemPrompt = `You are $JOB, a sharp career-strategy advisor.
Return valid JSON matching the schema exactly.

Rules:
- Ground the recommendation in the job analysis and the user's stated intent.
- Make it feel written for this exact person, not a generic person in the same company.
- headline must be punchy and short: 3-7 words, no company name unless needed, no punctuation-heavy sentence.
- The recommendedMove must mention the user's concrete focus or constraint from the decision context.
- Be opinionated and practical, not generic or therapeutic.
- becauseYouSaid must summarize the user's answers in short, readable bullets; do not copy long free text verbatim.
- becauseResearchShows must summarize the most important source-backed facts as short career consequences.
- Tie each "why" bullet to both a concrete signal from the analysis and the user's selected direction.
- next30Days must contain actions this person can actually do in the next month from their current ${args.role} seat.
- watchOuts should be situational, not generic career advice.
- personalizationBasis must list the concrete user answers and research signals that changed the recommendation.
- sourceUrls must include the URLs that most directly support the recommendation.`;

  const userPrompt = `Create a recommendation for this person.

Company: ${args.company}
Role: ${args.role}
Rating: ${args.analysis.rating}
Would buy: ${args.analysis.wouldBuy}
Confidence: ${args.analysis.confidence}
Verdict: ${args.analysis.oneLineVerdict}

Personalization brief:
${personalizationBrief}

Key signals:
${keySignals}

Investment thesis:
Keep: ${thesis.keep.join(" | ")}
Caution: ${thesis.caution.join(" | ")}
Triggers: ${thesis.triggers.join(" | ")}

Evidence buckets:
Momentum: ${args.analysis.evidence.momentumSignals.join(" | ")}
Risk: ${args.analysis.evidence.riskSignals.join(" | ")}
Hiring: ${args.analysis.evidence.hiringSignals.join(" | ")}
Company: ${args.analysis.evidence.companySignals.join(" | ")}

Structured evidence map:
${evidenceMap}

Available source URLs:
${sourceUrls.map((url) => `- ${url}`).join("\n") || "- none"}

User intent: ${args.decision.intent}
User focus: ${args.decision.subIntent}
${args.decision.freeText ? `User free text: ${args.decision.freeText}` : ""}

Output guidance:
- headline: 3-7 words, like "Stay, but test the market" or "Leave with a plan".
- recommendedMove: one decisive sentence, tailored to the user's focus.
- becauseYouSaid: 2-3 short bullets, each under 12 words.
- becauseResearchShows: 2-3 short bullets, each under 14 words.
- why: three bullets; each should combine a public signal, what it means for this person, and why it supports the move.
- next30Days: three concrete actions with wording the user could actually execute this month.
- watchOuts: two traps specific to this company/role/decision context.
- alternativePaths: name three credible paths, not generic variants.
- personalizationBasis: 2-4 short strings explaining what user answer or source-backed signal drove the move.
- sourceUrls: 0-6 URLs from Available source URLs.`;

  return generateStructuredOutput<Record<string, unknown>>({
    schemaName: "career_recommendation",
    schema: recommendationSchema,
    systemPrompt,
    userPrompt,
  });
}

async function persistDecisionAndRecommendation(args: {
  analysisId: string;
  decision: DecisionContext;
  recommendation: ReturnType<typeof normalizeRecommendationPayload>;
}) {
  try {
    const { data: decisionFlow, error: decisionError } = await supabase
      .from("decision_flows")
      .insert({
        analysis_id: args.analysisId,
        question_1: "Given this rating, what are you considering?",
        answer_1: args.decision.intent,
        question_2: "What matters most right now?",
        answer_2: args.decision.subIntent,
        question_3: "Anything else to factor in?",
        answer_3: args.decision.freeText ?? null,
      })
      .select("id")
      .single();

    if (decisionError) console.error("decision flow persistence error", decisionError);

    const { data: recommendationRow, error: recommendationError } = await supabase
      .from("recommendations")
      .insert({
        analysis_id: args.analysisId,
        decision_flow_id: decisionFlow?.id ?? null,
        recommendation_json: args.recommendation,
      })
      .select("id")
      .single();

    if (recommendationError) {
      console.error("recommendation persistence error", recommendationError);
    }

    const embeddingText = `Recommendation: ${args.recommendation.recommendedMove}. Why: ${args.recommendation.why.join(" | ")}. Next 30 days: ${args.recommendation.next30Days.join(" | ")}. Watch-outs: ${args.recommendation.watchOuts.join(" | ")}`;
    const [vector] = (await createEmbeddings([embeddingText])) ?? [];
    if (vector) {
      const { error: embeddingError } = await supabase.from("analysis_embeddings").insert({
        analysis_id: args.analysisId,
        content_type: "recommendation",
        content: embeddingText,
        embedding: vector as unknown as string,
        metadata: { recommendationId: recommendationRow?.id ?? null },
      });
      if (embeddingError) console.error("recommendation embedding persistence error", embeddingError);
    }

    return {
      recommendationId: recommendationRow?.id ?? null,
    };
  } catch (error) {
    console.error("recommend-action persistence exception", error);
    return { recommendationId: null };
  }
}

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;

  if (isHealthCheck(request)) {
    return healthResponse(request, {
      endpoint: "recommend-action",
      checks: {
        openaiConfigured: Boolean(Deno.env.get("OPENAI_API_KEY")),
        supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      },
    });
  }

  const methodError = requirePost(request);
  if (methodError) return methodError;

  const rateLimitError = await enforceRateLimit(supabase, request, {
    endpoint: "recommend-action",
    maxRequests: 10,
    globalMaxRequests: 240,
    windowSeconds: 60 * 60,
  });
  if (rateLimitError) return rateLimitError;

  try {
    const parsed = await readJsonBody<{
      decision?: DecisionContext;
      questionAnswers?: Array<{ question?: string; answer?: string } | string>;
      company?: string;
      role?: string;
      analysis?: CareerAnalysis;
      analysisId?: string;
    }>(request, { maxBytes: 65536 });
    if (parsed.error) return parsed.error;

    const body = parsed.data ?? {};

    const decision = normalizeDecisionInput({
      decision: body.decision,
      questionAnswers: body.questionAnswers,
    });
    const companyInput = validateTextField(body.company, "company", { maxLength: 80 });
    const roleInput = validateTextField(body.role, "role", { maxLength: 80 });
    if (companyInput.error || roleInput.error) {
      return jsonResponse(
        { error: companyInput.error ?? roleInput.error },
        { status: 400 },
        request,
      );
    }

    let company = companyInput.value;
    let role = roleInput.value;
    let analysis = body.analysis;
    const resolvedAnalysisId = body.analysisId ?? null;

    if (resolvedAnalysisId) {
      const loaded = await loadAnalysisById(resolvedAnalysisId);
      if (loaded) {
        company = loaded.company;
        role = loaded.role;
        analysis = loaded.analysis;
      }
    }

    const normalizedAnalysis = normalizeAnalysisPayload({
      company,
      role,
      raw: analysis ?? {},
      sources: analysis?.sources ?? [],
    });

    const sourceUrls = Array.from(new Set([
      ...normalizedAnalysis.keySignals.flatMap((signal) => signal.sourceUrls ?? []),
      ...normalizedAnalysis.sources.map((source) => source.url),
    ])).slice(0, 6);
    const fallback = {
      ...buildFallbackRecommendation(company, role, decision),
      sourceUrls,
    };
    const aiResult = await generateRecommendation({
      company,
      role,
      analysis: normalizedAnalysis,
      decision,
    });

    if (!aiResult.data && aiResult.failure) {
      console.error("recommend-action fallback", aiResult.failure);
    }

    const data = normalizeRecommendationPayload(aiResult.data ?? fallback, fallback);
    let recommendationId: string | null = null;

    if (resolvedAnalysisId) {
      const persisted = await persistDecisionAndRecommendation({
        analysisId: resolvedAnalysisId,
        decision,
        recommendation: data,
      });
      recommendationId = persisted.recommendationId;
    }

    return jsonResponse({
      decision,
      data,
      recommendationId,
      ...(aiResult.data ? {} : { _warning: "Recommendation fallback used." }),
    }, {}, request);
  } catch (error) {
    console.error("recommend-action fatal", error);
    return jsonResponse({
      error: "Unexpected server error.",
      data: buildFallbackRecommendation("Your company", "your role", {
        intent: "options",
        subIntent: "Keep options open",
      }),
      _warning: "Unexpected server error. Returning fallback recommendation.",
    }, {}, request);
  }
});

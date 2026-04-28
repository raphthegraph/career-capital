import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  createGenericFallbackAnalysis,
  getDemoFallbackAnalysis,
  normalizeAnalysisPayload,
  normalizeCompanyRole,
  researchSourcesToAnalysisSources,
  type AnalysisSource,
  type CareerAnalysis,
} from "../_shared/career.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { createEmbeddings, generateStructuredOutput } from "../_shared/openai.ts";
import { analysisSchema } from "../_shared/schemas.ts";
import {
  compressEvidence,
  runTavilyResearch,
  type ResearchSource,
} from "../_shared/tavily.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CACHE_TTL_HOURS = 24;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface AnalyzeBody {
  company: string;
  role: string;
}

async function loadSourcesByAnalysisId(analysisId: string): Promise<AnalysisSource[]> {
  try {
    const { data, error } = await supabase
      .from("research_sources")
      .select("title, url, snippet, source_type")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      if (error) console.error("research source lookup error", error);
      return [];
    }

    return data
      .map((source) => ({
        title: source.title ?? "",
        url: source.url ?? "",
        snippet: source.snippet ?? "",
        sourceType: source.source_type ?? "other",
      }))
      .filter((source) => source.url && source.title);
  } catch (error) {
    console.error("research source lookup exception", error);
    return [];
  }
}

async function getCachedAnalysis(normalizedCompany: string, normalizedRole: string) {
  try {
    const since = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("job_analyses")
      .select("id, company, role, analysis_json")
      .eq("normalized_company", normalizedCompany)
      .eq("normalized_role", normalizedRole)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("analysis cache lookup error", error);
      return null;
    }

    const sources = await loadSourcesByAnalysisId(data.id);
    const normalized = normalizeAnalysisPayload({
      company: data.company,
      role: data.role,
      raw: data.analysis_json,
      sources,
    });

    return { id: data.id, analysis: normalized };
  } catch (error) {
    console.error("analysis cache lookup exception", error);
    return null;
  }
}

async function generateJobAnalysis(
  company: string,
  role: string,
  sources: ResearchSource[],
) {
  const compactSources = researchSourcesToAnalysisSources(sources);
  const evidenceBlock = compressEvidence(sources);
  const sourceIndex = compactSources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\nType: ${source.sourceType}\nSnippet: ${source.snippet}`,
    )
    .join("\n\n");

  const systemPrompt = `You are $JOB, an AI that evaluates a person's current job as an investable career asset.
Return valid JSON matching the schema exactly.

Rules:
- Evaluate the role, not just the company.
- Connect public evidence to concrete career consequences for THIS role.
- Key signals must be job-specific and actionable, not generic market commentary.
- Distinguish observable public evidence from your inference.
- Use only the sources provided below. If evidence is thin, lower confidence instead of making things up.
- Keep oneLineVerdict sharp and specific.
- The five qualitativeInsights must cover promotion path, regulatory risk, hiring momentum, learning upside, and exit opportunities.
- investmentThesis.keep, investmentThesis.caution, and investmentThesis.triggers should each have exactly three concise points.`;

  const userPrompt = `Evaluate this role as a career asset.

Company: ${company}
Role: ${role}

PUBLIC SOURCE INDEX:
${sourceIndex || "No live research was available."}

COMPRESSED PUBLIC EVIDENCE:
${evidenceBlock || "No live research was available. Work from priors, keep confidence low, and avoid invented facts."}

Return:
- rating: BUY / HOLD / SELL / SHORT
- wouldBuy: Yes / No / Conditional
- confidence: 0-100
- oneLineVerdict
- careerAssetScore: 0-100
- dimensions
- qualitativeInsights
- keySignals
- investmentThesis
- bullCase / bearCase / ratingChangeTriggers
- evidence buckets
- sources using only the source index above`;

  return generateStructuredOutput<Record<string, unknown>>({
    schemaName: "career_asset_analysis",
    schema: analysisSchema,
    systemPrompt,
    userPrompt,
  });
}

async function saveAnalysis(args: {
  company: string;
  role: string;
  normalizedCompany: string;
  normalizedRole: string;
  analysis: CareerAnalysis;
  sources: ResearchSource[];
}) {
  try {
    const { data, error } = await supabase
      .from("job_analyses")
      .insert({
        company: args.company,
        role: args.role,
        normalized_company: args.normalizedCompany,
        normalized_role: args.normalizedRole,
        ticker: args.analysis.ticker,
        rating: args.analysis.rating,
        would_buy: args.analysis.wouldBuy,
        one_line_verdict: args.analysis.oneLineVerdict,
        confidence: Math.round(args.analysis.confidence),
        career_asset_score: Math.round(args.analysis.careerAssetScore),
        analysis_json: args.analysis,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("analysis persistence error", error);
      return null;
    }

    const analysisId = data.id as string;

    if (args.sources.length > 0) {
      const { error: sourceError } = await supabase.from("research_sources").insert(
        args.sources.map((source) => ({
          analysis_id: analysisId,
          title: source.title,
          url: source.url,
          source_type: source.sourceType,
          snippet: source.snippet,
          raw_content: source.rawContent ?? null,
          content_summary: source.snippet,
        })),
      );
      if (sourceError) console.error("research source persistence error", sourceError);
    }

    const embeddingItems = [
      {
        content_type: "verdict",
        content: `${args.analysis.rating} (${args.analysis.wouldBuy}). ${args.analysis.oneLineVerdict}`,
        metadata: null,
      },
      ...args.analysis.keySignals.map((signal) => ({
        content_type: "key_signal",
        content: `${signal.label}: ${signal.impact}. Evidence: ${signal.evidence}`,
        metadata: { sentiment: signal.sentiment, sourceUrls: signal.sourceUrls },
      })),
      {
        content_type: "investment_thesis",
        content: `Keep: ${args.analysis.investmentThesis.keep.join(" | ")}. Caution: ${args.analysis.investmentThesis.caution.join(" | ")}. Triggers: ${args.analysis.investmentThesis.triggers.join(" | ")}`,
        metadata: null,
      },
      ...args.analysis.sources.slice(0, 6).map((source) => ({
        content_type: "tavily_source_summary",
        content: `[${source.sourceType}] ${source.title}: ${source.snippet}`,
        metadata: { url: source.url, sourceType: source.sourceType },
      })),
    ];

    const vectors = await createEmbeddings(embeddingItems.map((item) => item.content));
    if (vectors && vectors.length === embeddingItems.length) {
      const { error: embeddingError } = await supabase.from("analysis_embeddings").insert(
        embeddingItems.map((item, index) => ({
          analysis_id: analysisId,
          content_type: item.content_type,
          content: item.content,
          embedding: vectors[index] as unknown as string,
          metadata: item.metadata,
        })),
      );
      if (embeddingError) console.error("analysis embedding persistence error", embeddingError);
    }

    return analysisId;
  } catch (error) {
    console.error("analysis persistence exception", error);
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let company = "Unknown";
  let role = "Role";

  try {
    const body = (await request.json()) as AnalyzeBody;
    company = String(body.company ?? "").trim();
    role = String(body.role ?? "").trim();

    if (!company || !role) {
      return jsonResponse(
        { error: "company and role are required" },
        { status: 400 },
      );
    }

    const normalized = normalizeCompanyRole(company, role);
    const cached = await getCachedAnalysis(
      normalized.normalizedCompany,
      normalized.normalizedRole,
    );

    if (cached) {
      return jsonResponse({
        ...cached.analysis,
        analysisId: cached.id,
        _cached: true,
      });
    }

    const sources = await runTavilyResearch(company, role);
    const analysisSources = researchSourcesToAnalysisSources(sources);
    const aiResult = await generateJobAnalysis(company, role, sources);

    const fallback =
      getDemoFallbackAnalysis(company, role) ?? createGenericFallbackAnalysis(company, role);
    const analysis = normalizeAnalysisPayload({
      company,
      role,
      raw: aiResult.data ?? fallback,
      sources: analysisSources,
    });

    const warnings: string[] = [];
    if (sources.length === 0) {
      warnings.push("Live Tavily research was unavailable, so the analysis used limited public context.");
    }
    if (!aiResult.data) {
      warnings.push(
        getDemoFallbackAnalysis(company, role)
          ? "OpenAI analysis was unavailable, so a demo-ready fallback profile was used."
          : "OpenAI analysis was unavailable, so a baseline fallback profile was used.",
      );
      if (aiResult.failure) {
        console.error("analysis generation fallback", aiResult.failure);
      }
    }

    const analysisId = await saveAnalysis({
      company,
      role,
      normalizedCompany: normalized.normalizedCompany,
      normalizedRole: normalized.normalizedRole,
      analysis,
      sources,
    });

    const responseBody: CareerAnalysis = {
      ...analysis,
      ...(analysisId ? { analysisId } : {}),
      ...(warnings.length > 0 ? { _warning: warnings.join(" ") } : {}),
    };

    return jsonResponse(responseBody);
  } catch (error) {
    console.error("analyze-job fatal", error);
    const fallback =
      getDemoFallbackAnalysis(company, role) ?? createGenericFallbackAnalysis(company, role);

    return jsonResponse({
      ...fallback,
      _warning: "Unexpected server error. Returning fallback analysis so the demo can continue.",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
});

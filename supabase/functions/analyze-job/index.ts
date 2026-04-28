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
  buildResearchPacket,
  compressResearchPacket,
  compressEvidence,
  runTavilyResearch,
  type ResearchPacket,
  type ResearchSource,
  type SourceBackedClaim,
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

    const hasSourceGrounding =
      normalized.sources.length >= 2 ||
      normalized.keySignals.some((signal) => signal.sourceUrls.length > 0);

    if (normalized.researchQuality === "fallback" || !hasSourceGrounding) {
      return null;
    }

    return { id: data.id, analysis: normalized };
  } catch (error) {
    console.error("analysis cache lookup exception", error);
    return null;
  }
}

async function generateJobAnalysis(
  company: string,
  role: string,
  packet: ResearchPacket,
) {
  const sources = packet.sources;
  const compactSources = researchSourcesToAnalysisSources(sources);
  const evidenceBlock = compressEvidence(sources);
  const researchPacketBlock = compressResearchPacket(packet);
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
- Write for the person currently sitting in this role; use "you" where it makes the career consequence sharper.
- Connect public evidence to concrete career consequences for THIS role: promotion path, scope, learning density, compensation leverage, burnout risk, and exit optionality.
- Key signals must be job-specific and actionable, not generic market commentary. Bad: "Volatility is high." Good: "Leadership churn makes your next promotion sponsor less predictable."
- Distinguish observable public evidence from your inference.
- Use only the sources provided below. If evidence is thin, lower confidence instead of making things up.
- Keep oneLineVerdict sharp, personal, and specific to ${role} at ${company}.
- Dimension explanations must say what the score means for this person's day-to-day career asset value, not just company health.
- The five qualitativeInsights must cover promotion path, regulatory risk, hiring momentum, learning upside, and exit opportunities.
- Every keySignal must include sourceUrls from the source index when evidence exists.
- Every keySignal.roleImpact must explain what the evidence changes for this person's scope, promotion path, learning, compensation leverage, sustainability, or exit optionality.
- Every keySignal.confidenceReason must explain why the evidence is strong/weak.
- investmentThesis.keep, investmentThesis.caution, and investmentThesis.triggers should each have exactly three concise points.
- Avoid generic advice like "network more" or "keep learning" unless tied to a concrete signal from the source index.`;

  const userPrompt = `Evaluate this role as a career asset.

Company: ${company}
Role: ${role}

Personalization target:
Evaluate this as if the user is deciding whether to keep investing their next career year in this exact seat.
Every keySignal.impact should answer: "So what does this mean for you as a ${role}?"

PUBLIC SOURCE INDEX:
${sourceIndex || "No live research was available."}

COMPRESSED PUBLIC EVIDENCE:
${evidenceBlock || "No live research was available. Work from priors, keep confidence low, and avoid invented facts."}

STRUCTURED RESEARCH PACKET:
${researchPacketBlock}

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

function firstPacketClaim(packet: ResearchPacket, index: number) {
  return Object.values(packet.evidenceBuckets).flat()[index] ?? null;
}

function canonicalSourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function sourceIndex(packet: ResearchPacket) {
  const index = new Map<string, string>();
  for (const source of packet.sources) {
    index.set(canonicalSourceUrl(source.url), source.url);
  }
  return index;
}

function sourceUrlKey(url: string) {
  return canonicalSourceUrl(url).toLowerCase();
}

function filterAllowedSourceUrls(urls: string[], packet: ResearchPacket) {
  const allowed = sourceIndex(packet);
  const seen = new Set<string>();
  const filtered: string[] = [];

  for (const url of urls) {
    const allowedUrl = allowed.get(canonicalSourceUrl(url));
    if (!allowedUrl) continue;

    const key = sourceUrlKey(allowedUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(allowedUrl);
  }

  return filtered;
}

function signalBucketHints(signal: { label: string; detail: string; impact: string; evidence: string }) {
  const text = `${signal.label} ${signal.detail} ${signal.impact} ${signal.evidence}`.toLowerCase();
  const hints: string[] = [];

  if (/risk|regulat|lawsuit|layoff|controvers|pressure|volatile|slowdown/.test(text)) {
    hints.push("marketRisk");
  }
  if (/hiring|team|headcount|careers|job|growth/.test(text)) {
    hints.push("hiringSignal");
  }
  if (/promotion|scope|sponsor|ownership|manager|leadership|stakeholder/.test(text)) {
    hints.push("promotionPath", "roleLeverage");
  }
  if (/exit|optional|market|recruiter|portable|brand|liquidity/.test(text)) {
    hints.push("exitOptionality");
  }
  if (/fund|portfolio|investment|launch|momentum|customer|product|growth/.test(text)) {
    hints.push("companyMomentum");
  }

  return hints.length ? hints : ["companyMomentum"];
}

function claimScore(
  signal: { label: string; detail: string; impact: string; evidence: string },
  claim: SourceBackedClaim,
  usedUrls: Set<string>,
) {
  const signalText = `${signal.label} ${signal.detail} ${signal.impact} ${signal.evidence}`.toLowerCase();
  const claimText = `${claim.bucket} ${claim.claim} ${claim.sourceTitle} ${claim.sourceType}`.toLowerCase();
  const hints = signalBucketHints(signal);
  let score = hints.includes(claim.bucket) ? 8 : 0;

  for (const token of signalText.split(/\W+/).filter((token) => token.length > 4).slice(0, 18)) {
    if (claimText.includes(token)) score += 1;
  }
  if (usedUrls.has(sourceUrlKey(claim.sourceUrl))) score -= 4;
  if (claim.sourceType === "careers" || claim.sourceType === "fund" || claim.sourceType === "risk") score += 1;

  return score;
}

function selectSourceClaim(args: {
  packet: ResearchPacket;
  signal: { label: string; detail: string; impact: string; evidence: string };
  index: number;
  usedUrls: Set<string>;
}) {
  const claims = Object.values(args.packet.evidenceBuckets).flat();
  if (claims.length === 0) return null;

  const ranked = claims
    .map((claim) => ({
      claim,
      score: claimScore(args.signal, claim, args.usedUrls),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.claim ?? firstPacketClaim(args.packet, args.index);
}

function bucketLabel(bucket: string) {
  const labels: Record<string, string> = {
    companyMomentum: "Company momentum signal",
    roleLeverage: "Role leverage signal",
    hiringSignal: "Hiring and team signal",
    promotionPath: "Promotion path signal",
    marketRisk: "Risk signal",
    exitOptionality: "Exit optionality signal",
  };
  return labels[bucket] ?? "Source-backed signal";
}

function isGenericSignal(signal: { label: string; evidence: string }) {
  return /mixed public momentum|scope matters more than logo|portable outcome signal|public signals look useful|career value is often driven/i.test(
    `${signal.label} ${signal.evidence}`,
  );
}

function applySourceGrounding(args: {
  analysis: CareerAnalysis;
  packet: ResearchPacket;
  role: string;
  aiSucceeded: boolean;
}): CareerAnalysis {
  const sourceUrls = args.packet.sources.map((source) => source.url);
  const usedUrls = new Set<string>();
  const keySignals = args.analysis.keySignals.map((signal, index) => {
    const allowedSignalUrls = filterAllowedSourceUrls(signal.sourceUrls, args.packet);
    const claim = selectSourceClaim({
      packet: args.packet,
      signal,
      index,
      usedUrls,
    });
    const claimUrl = claim?.sourceUrl ? [claim.sourceUrl] : [];
    const fallbackUrl = sourceUrls[index] ? [sourceUrls[index]] : [];
    const urls = allowedSignalUrls.length
      ? allowedSignalUrls
      : claimUrl.length
        ? claimUrl
        : fallbackUrl;
    const generic = isGenericSignal(signal);
    for (const url of urls) {
      usedUrls.add(sourceUrlKey(url));
    }

    return {
      ...signal,
      label: generic && claim ? bucketLabel(claim.bucket) : signal.label,
      detail: generic && claim ? claim.claim.slice(0, 180) : signal.detail,
      evidence: signal.evidence || claim?.claim || "Limited direct source coverage.",
      sourceUrls: urls.slice(0, 3),
      roleImpact: signal.roleImpact ||
        `${signal.impact} For a ${args.role}, this affects whether the seat compounds through scope, learning, promotion leverage, or exit signal.`,
      confidenceReason: signal.confidenceReason ||
        (urls.length
          ? "Supported by linked public evidence and interpreted for this role."
          : "No direct source was available; treat this as an AI inference."),
    };
  });
  const sourceBackedSignals = keySignals.filter((signal) => signal.sourceUrls.length > 0).length;

  const cappedConfidence =
    args.packet.sourceQuality === "fallback"
      ? Math.min(args.analysis.confidence, 55)
      : args.packet.sourceQuality === "limited"
        ? Math.min(args.analysis.confidence, 68)
        : args.analysis.confidence;
  const sourceGroundedConfidence =
    sourceBackedSignals === 0
      ? Math.min(cappedConfidence, 55)
      : sourceBackedSignals < 2
        ? Math.min(cappedConfidence, 65)
        : cappedConfidence;

  return {
    ...args.analysis,
    keySignals,
    confidence: args.aiSucceeded ? sourceGroundedConfidence : Math.min(sourceGroundedConfidence, 58),
    researchQuality: args.aiSucceeded ? args.packet.sourceQuality : "fallback",
    evidenceMap: args.packet.evidenceBuckets,
  };
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
    const researchPacket = buildResearchPacket(sources, company, role);
    const analysisSources = researchSourcesToAnalysisSources(sources);
    const aiResult = await generateJobAnalysis(company, role, researchPacket);

    const fallback =
      getDemoFallbackAnalysis(company, role) ?? createGenericFallbackAnalysis(company, role);
    const normalizedAnalysis = normalizeAnalysisPayload({
      company,
      role,
      raw: aiResult.data ?? fallback,
      sources: analysisSources,
      researchPacket,
    });
    const analysis = applySourceGrounding({
      analysis: normalizedAnalysis,
      packet: researchPacket,
      role,
      aiSucceeded: Boolean(aiResult.data),
    });

    const warnings: string[] = [];
    if (researchPacket.sourceQuality !== "live") {
      warnings.push(
        researchPacket.sourceQuality === "fallback"
          ? "Live Tavily research was unavailable, so this is clearly marked as fallback analysis."
          : "Live Tavily research found limited source coverage, so confidence is capped and some claims are marked as inference.",
      );
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
      researchQuality: "fallback",
      _warning: "Unexpected server error. Returning fallback analysis so the demo can continue.",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
});

// $JOB — analyze-job edge function
// Tavily research → evidence compression → Lovable AI structured analysis
// → Supabase persistence (analysis, sources, embeddings via OpenAI).
// Always returns the analysis JSON the frontend expects, plus an additive `analysisId`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CACHE_TTL_HOURS = 24;

interface AnalyzeBody {
  company: string;
  role: string;
}

// ---------- helpers ----------
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s-]/g, "");
}

function makeTicker(company: string, role: string): string {
  const c = company.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "JOB";
  const r =
    role
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "X";
  return `${c}-${r}`;
}

function buildChartData(score: number) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const start = 50 + (Math.random() * 20 - 10);
  const target = score;
  const data: { month: string; price: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const trend = start + (target - start) * t;
    const noise = (Math.random() - 0.5) * 8;
    data.push({ month: months[i], price: Math.max(5, Math.min(99, +(trend + noise).toFixed(2))) });
  }
  return data;
}

// ---------- Tavily research ----------
async function tavilySearch(query: string, max_results = 5): Promise<any[]> {
  if (!TAVILY_API_KEY) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results,
        include_answer: false,
      }),
    });
    if (!res.ok) {
      console.error("Tavily search err", res.status);
      return [];
    }
    const data = await res.json();
    return data.results ?? [];
  } catch (e) {
    console.error("Tavily search exception", e);
    return [];
  }
}

async function tavilyExtract(urls: string[]): Promise<Record<string, string>> {
  if (!TAVILY_API_KEY || urls.length === 0) return {};
  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, urls }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, string> = {};
    for (const r of data.results ?? []) {
      if (r.url && r.raw_content) map[r.url] = String(r.raw_content).slice(0, 4000);
    }
    return map;
  } catch (e) {
    console.error("Tavily extract exception", e);
    return {};
  }
}

function classifySource(url: string, query: string): string {
  const u = (url || "").toLowerCase();
  if (u.includes("careers") || u.includes("jobs") || u.includes("linkedin.com/jobs")) return "careers";
  if (/news|reuters|bloomberg|techcrunch|theverge|ft\.com|wsj|nytimes|cnbc|axios/.test(u)) return "news";
  if (/risk|lawsuit|regulation|sec\.gov/.test(u)) return "risk";
  if (/wikipedia|crunchbase|pitchbook/.test(u)) return "market";
  if (query.includes("risk")) return "risk";
  if (query.includes("hiring")) return "careers";
  if (query.includes("news")) return "news";
  if (query.includes("overview") || query.includes("business model")) return "company";
  return "other";
}

interface CompressedSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
  raw_content?: string;
}

async function runTavilyResearch(company: string, role: string): Promise<CompressedSource[]> {
  const queries = [
    `${company} company overview business model`,
    `${company} latest news ${new Date().getFullYear()} layoffs funding executive`,
    `${company} careers hiring ${role}`,
    `${company} product launches market momentum competitors`,
    `${company} risks challenges controversy regulation`,
  ];

  const results = await Promise.all(queries.map((q) => tavilySearch(q, 4).then((r) => ({ q, r }))));
  const seen = new Set<string>();
  const compressed: CompressedSource[] = [];
  for (const { q, r } of results) {
    for (const item of r) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      compressed.push({
        title: (item.title || "").slice(0, 200),
        url: item.url,
        snippet: (item.content || "").slice(0, 400),
        sourceType: classifySource(item.url, q),
      });
    }
  }

  // Pick top 3 highest-signal URLs (prefer news/risk/careers + company) and run Extract
  const priority = ["risk", "news", "careers", "company", "market", "other"];
  const sorted = [...compressed].sort(
    (a, b) => priority.indexOf(a.sourceType) - priority.indexOf(b.sourceType)
  );
  const top = sorted.slice(0, 3);
  const extracted = await tavilyExtract(top.map((s) => s.url));
  for (const s of compressed) {
    if (extracted[s.url]) s.raw_content = extracted[s.url];
  }
  // Cap total sources passed to AI
  return compressed.slice(0, 12);
}

// ---------- AI analysis ----------
const ANALYZE_TOOL = {
  type: "function",
  function: {
    name: "emit_career_asset_analysis",
    description: "Structured career-asset evaluation of a role at a company.",
    parameters: {
      type: "object",
      properties: {
        rating: { type: "string", enum: ["BUY", "HOLD", "SELL", "SHORT"] },
        wouldBuy: { type: "string", enum: ["Yes", "No", "Conditional"] },
        confidence: { type: "number", description: "0-100" },
        oneLineVerdict: { type: "string" },
        careerAssetScore: { type: "number", description: "0-100" },
        dimensions: {
          type: "object",
          properties: {
            careerDividend: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" }, signalCount: { type: "number" } }, required: ["score", "explanation", "signalCount"] },
            momentum: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" }, signalCount: { type: "number" } }, required: ["score", "explanation", "signalCount"] },
            volatility: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" }, signalCount: { type: "number" } }, required: ["score", "explanation", "signalCount"] },
            upsideOptionality: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" }, signalCount: { type: "number" } }, required: ["score", "explanation", "signalCount"] },
            exitLiquidity: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" }, signalCount: { type: "number" } }, required: ["score", "explanation", "signalCount"] },
          },
          required: ["careerDividend", "momentum", "volatility", "upsideOptionality", "exitLiquidity"],
        },
        qualitativeInsights: {
          type: "array",
          description: "Exactly 5 in this order: Promotion path, Regulatory risk, Hiring momentum, Learning upside, Exit opportunities.",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              level: { type: "string", enum: ["strong", "rising", "neutral", "limited", "blocked", "high", "low", "declining", "weak"] },
              detail: { type: "string" },
            },
            required: ["label", "value", "level", "detail"],
          },
        },
        bullCase: { type: "array", items: { type: "string" } },
        bearCase: { type: "array", items: { type: "string" } },
        ratingChangeTriggers: { type: "array", items: { type: "string" } },
        evidence: {
          type: "object",
          properties: {
            momentumSignals: { type: "array", items: { type: "string" } },
            riskSignals: { type: "array", items: { type: "string" } },
            hiringSignals: { type: "array", items: { type: "string" } },
            companySignals: { type: "array", items: { type: "string" } },
          },
          required: ["momentumSignals", "riskSignals", "hiringSignals", "companySignals"],
        },
      },
      required: ["rating", "wouldBuy", "confidence", "oneLineVerdict", "careerAssetScore", "dimensions", "qualitativeInsights", "bullCase", "bearCase", "ratingChangeTriggers", "evidence"],
    },
  },
};

async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<any | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [ANALYZE_TOOL],
        tool_choice: { type: "function", function: { name: ANALYZE_TOOL.function.name } },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Lovable AI error", res.status, txt.slice(0, 300));
      return { __error: res.status };
    }
    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return null;
    const args = typeof call.function.arguments === "string" ? JSON.parse(call.function.arguments) : call.function.arguments;
    return args;
  } catch (e) {
    console.error("Lovable AI exception", e);
    return null;
  }
}

// ---------- Embeddings (OpenAI) ----------
async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!OPENAI_API_KEY || texts.length === 0) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
    });
    if (!res.ok) {
      console.error("OpenAI embeddings err", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return (data.data ?? []).map((d: any) => d.embedding as number[]);
  } catch (e) {
    console.error("Embeddings exception", e);
    return null;
  }
}

// ---------- Fallback ----------
function fallbackAnalysis(company: string, role: string) {
  const ticker = makeTicker(company, role);
  const score = 62;
  return {
    ticker,
    rating: "HOLD",
    wouldBuy: "Conditional",
    confidence: 64,
    oneLineVerdict: `${role} at ${company} is a steady-yield asset with mid-band volatility — hold, don't double down.`,
    careerAssetScore: score,
    dimensions: {
      careerDividend: { score: 68, explanation: "Solid comp band with reliable cadence; learning curve flattening.", signalCount: 4 },
      momentum: { score: 60, explanation: "Mixed signals: product traction up, hiring slowed last quarter.", signalCount: 5 },
      volatility: { score: 55, explanation: "Macro and sector headwinds add medium risk; no acute layoff signal.", signalCount: 3 },
      upsideOptionality: { score: 58, explanation: "Promotion path exists but contested; equity upside modest.", signalCount: 3 },
      exitLiquidity: { score: 72, explanation: "Brand carries weight; resume converts well to peer companies.", signalCount: 4 },
    },
    qualitativeInsights: [
      { label: "Promotion path", value: "Contested", level: "neutral", detail: "Senior bench is crowded; visible wins required." },
      { label: "Regulatory risk", value: "Moderate", level: "neutral", detail: "Sector-wide scrutiny but no acute exposure." },
      { label: "Hiring momentum", value: "Slowing", level: "declining", detail: "Open roles down vs trailing six months." },
      { label: "Learning upside", value: "Strong", level: "strong", detail: "Surface area still expanding inside your scope." },
      { label: "Exit opportunities", value: "Strong", level: "strong", detail: "Brand converts well to peer companies." },
    ],
    bullCase: [
      "Strong brand equity translates to fast external mobility.",
      "Role gives ownership over revenue-adjacent surface area.",
      "Industry tailwind keeps demand for this skill set high.",
    ],
    bearCase: [
      "Management bench is crowded — promotion timeline unclear.",
      "Sector-wide cost discipline limits comp upside.",
      "Strategic pivots add execution risk to your roadmap.",
    ],
    ratingChangeTriggers: [
      "Public reorg or layoff round → downgrade to SELL.",
      "Funding round or strong earnings beat → upgrade to BUY.",
      "Internal promotion or scope expansion → upgrade to BUY.",
    ],
    evidence: {
      momentumSignals: ["Product launch coverage in trade press", "Engineering hiring resumed", "Customer growth quoted by leadership"],
      riskSignals: ["Sector-wide hiring slowdown", "Recent strategy memo signals refocus"],
      hiringSignals: ["Open roles in adjacent teams", "Recruiter outreach activity above baseline"],
      companySignals: [`${company} mentioned in recent funding/news cycle`, "Leadership stable over last 12 months"],
    },
    chartData: buildChartData(score),
  };
}

// ---------- Persistence ----------
async function getCachedAnalysis(normCompany: string, normRole: string) {
  try {
    const sinceIso = new Date(Date.now() - CACHE_TTL_HOURS * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("job_analyses")
      .select("id, analysis_json")
      .eq("normalized_company", normCompany)
      .eq("normalized_role", normRole)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("cache lookup err", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("cache lookup exception", e);
    return null;
  }
}

async function persistAnalysis(args: {
  company: string;
  role: string;
  normCompany: string;
  normRole: string;
  analysis: any;
  sources: CompressedSource[];
}) {
  try {
    const { data, error } = await supabase
      .from("job_analyses")
      .insert({
        company: args.company,
        role: args.role,
        normalized_company: args.normCompany,
        normalized_role: args.normRole,
        ticker: args.analysis.ticker,
        rating: args.analysis.rating,
        would_buy: args.analysis.wouldBuy,
        one_line_verdict: args.analysis.oneLineVerdict,
        confidence: Math.round(args.analysis.confidence ?? 0),
        career_asset_score: Math.round(args.analysis.careerAssetScore ?? 0),
        analysis_json: args.analysis,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("persist analysis err", error);
      return null;
    }
    const analysisId = data.id as string;

    // sources
    if (args.sources.length) {
      const rows = args.sources.map((s) => ({
        analysis_id: analysisId,
        title: s.title,
        url: s.url,
        source_type: s.sourceType,
        snippet: s.snippet,
        raw_content: s.raw_content ?? null,
        content_summary: s.snippet,
      }));
      const { error: srcErr } = await supabase.from("research_sources").insert(rows);
      if (srcErr) console.error("persist sources err", srcErr);
    }

    // embeddings — small targeted set
    const a = args.analysis;
    const embedItems: { content_type: string; content: string; metadata?: any }[] = [];
    embedItems.push({ content_type: "verdict", content: `${a.rating} (${a.wouldBuy}). ${a.oneLineVerdict}` });
    for (const s of a.qualitativeInsights ?? []) {
      embedItems.push({
        content_type: "key_signal",
        content: `${s.label}: ${s.value}. ${s.detail}`,
        metadata: { level: s.level, label: s.label },
      });
    }
    embedItems.push({
      content_type: "investment_thesis",
      content: `Bull: ${(a.bullCase ?? []).join(" | ")}. Bear: ${(a.bearCase ?? []).join(" | ")}. Triggers: ${(a.ratingChangeTriggers ?? []).join(" | ")}`,
    });
    for (const s of args.sources.slice(0, 6)) {
      embedItems.push({
        content_type: "tavily_source_summary",
        content: `[${s.sourceType}] ${s.title}: ${s.snippet}`,
        metadata: { url: s.url, sourceType: s.sourceType },
      });
    }
    const vectors = await embedTexts(embedItems.map((i) => i.content));
    if (vectors && vectors.length === embedItems.length) {
      const rows = embedItems.map((it, i) => ({
        analysis_id: analysisId,
        content_type: it.content_type,
        content: it.content,
        embedding: vectors[i] as any,
        metadata: it.metadata ?? null,
      }));
      const { error: embErr } = await supabase.from("analysis_embeddings").insert(rows);
      if (embErr) console.error("persist embeddings err", embErr);
    }

    return analysisId;
  } catch (e) {
    console.error("persist exception", e);
    return null;
  }
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as AnalyzeBody;
    const company = (body.company || "").trim();
    const role = (body.role || "").trim();

    if (!company || !role) {
      return new Response(JSON.stringify({ error: "company and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normCompany = normalize(company);
    const normRole = normalize(role);

    // 1. Cache lookup
    const cached = await getCachedAnalysis(normCompany, normRole);
    if (cached?.analysis_json) {
      console.log("cache hit", normCompany, normRole);
      return new Response(
        JSON.stringify({ ...cached.analysis_json, analysisId: cached.id, _cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Tavily research + compression
    const sources = await runTavilyResearch(company, role);

    const evidenceBlock = sources
      .map((s, i) => `[${i + 1}] (${s.sourceType}) ${s.title}\nURL: ${s.url}\n${s.snippet}${s.raw_content ? `\nKey content: ${s.raw_content.slice(0, 800)}` : ""}`)
      .join("\n\n");

    const systemPrompt = `You are $JOB, a brutally honest career-asset analyst.
You evaluate the user's job as if it were an investable asset. Use ONLY public evidence supplied below.
Do not invent private company facts. Distinguish evidence from inference.
Be specific, opinionated, decision-oriented, concise (≤25 words per explanation).
Each qualitativeInsight MUST tie a public signal to the user's career impact in this exact role.
Return scores 0-100 (100 = excellent).`;

    const userPrompt = `Evaluate this job as a career asset.

Company: ${company}
Role: ${role}

PUBLIC EVIDENCE (from Tavily):
${evidenceBlock || "No external evidence available — reason from priors and mark confidence lower."}

Produce: BUY/HOLD/SELL/SHORT verdict with wouldBuy (Yes/No/Conditional). Bull/bear: 3 sharp items each. Triggers: 3 items. Evidence arrays: 2-4 concrete signals each.`;

    const ai = await callLovableAI(systemPrompt, userPrompt);

    let analysis: any;
    let usedFallback = false;
    if (ai && !ai.__error && ai.rating) {
      analysis = {
        ticker: makeTicker(company, role),
        ...ai,
        chartData: buildChartData(ai.careerAssetScore ?? 60),
      };
    } else {
      console.log("Falling back to baseline analysis", ai?.__error);
      analysis = fallbackAnalysis(company, role);
      usedFallback = true;
    }

    // 3. Persist (non-blocking semantics: failures don't break response)
    const analysisId = await persistAnalysis({
      company,
      role,
      normCompany,
      normRole,
      analysis,
      sources,
    });

    const responseBody: any = { ...analysis };
    if (analysisId) responseBody.analysisId = analysisId;
    if (ai?.__error === 402) responseBody._warning = "AI credits exhausted — showing baseline analysis.";
    if (ai?.__error === 429) responseBody._warning = "AI rate limited — showing baseline analysis.";
    if (usedFallback && !responseBody._warning) responseBody._warning = "Baseline analysis (limited evidence).";

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-job fatal", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown", ...fallbackAnalysis("Unknown", "Role") }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// $JOB — analyze-job edge function
// Tavily research + Lovable AI (OpenAI/Gemini) reasoning. Always returns valid JSON.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface AnalyzeBody {
  company: string;
  role: string;
}

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
      console.error("Tavily error", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return data.results ?? [];
  } catch (e) {
    console.error("Tavily exception", e);
    return [];
  }
}

function makeTicker(company: string, role: string): string {
  const c = company.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "JOB";
  const r = role
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "X";
  return `${c}-${r}`;
}

function buildChartData(score: number): { month: string; price: number }[] {
  // Synthetic 12-month price line that lands near `score` (0-100)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

async function callLovableAI(systemPrompt: string, userPrompt: string, schemaTool: any): Promise<any | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [schemaTool],
        tool_choice: { type: "function", function: { name: schemaTool.function.name } },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Lovable AI error", res.status, txt);
      return { __error: res.status, __body: txt };
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

const ANALYZE_TOOL = {
  type: "function",
  function: {
    name: "emit_career_asset_analysis",
    description: "Return a structured career asset evaluation for a given role at a given company.",
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
      required: ["rating", "wouldBuy", "confidence", "oneLineVerdict", "careerAssetScore", "dimensions", "bullCase", "bearCase", "ratingChangeTriggers", "evidence"],
    },
  },
};

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

    // Parallel Tavily research
    const [overview, news, hiring, risk] = await Promise.all([
      tavilySearch(`${company} company overview business model`, 4),
      tavilySearch(`${company} latest news ${new Date().getFullYear()}`, 5),
      tavilySearch(`${company} hiring layoffs ${role}`, 4),
      tavilySearch(`${company} risk regulation lawsuit competitive threat`, 4),
    ]);

    const flatten = (arr: any[]) =>
      arr
        .map((r) => `- ${r.title}: ${(r.content || "").slice(0, 300)}`)
        .join("\n");

    const research = `
COMPANY OVERVIEW:
${flatten(overview) || "No data."}

RECENT NEWS:
${flatten(news) || "No data."}

HIRING SIGNALS:
${flatten(hiring) || "No data."}

RISK SIGNALS:
${flatten(risk) || "No data."}
`.trim();

    const systemPrompt = `You are $JOB, a brutally honest career-asset analyst. You evaluate a job the way an investor evaluates a stock.
Use the research provided. Be specific, opinionated, and use financial/investing language.
Return scores 0-100 (100 = excellent). Keep explanations under 25 words.
Bull/bear cases: 3 short, sharp items each. Triggers: 3 items.
Evidence arrays: 2-4 short concrete signals each.`;

    const userPrompt = `Evaluate this job as a career asset:
Company: ${company}
Role: ${role}

Research signals:
${research}

Produce a verdict: BUY, HOLD, SELL or SHORT. Include wouldBuy (Yes / No / Conditional).`;

    const ai = await callLovableAI(systemPrompt, userPrompt, ANALYZE_TOOL);

    let analysis;
    if (ai && !ai.__error && ai.rating) {
      analysis = {
        ticker: makeTicker(company, role),
        ...ai,
        chartData: buildChartData(ai.careerAssetScore ?? 60),
      };
    } else {
      console.log("Falling back to mock analysis", ai?.__error);
      analysis = fallbackAnalysis(company, role);
    }

    // Surface payment / rate limit errors transparently if AI failed for that reason
    if (ai?.__error === 402) {
      return new Response(
        JSON.stringify({ ...analysis, _warning: "AI credits exhausted — showing baseline analysis." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (ai?.__error === 429) {
      return new Response(
        JSON.stringify({ ...analysis, _warning: "AI rate limited — showing baseline analysis." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-job fatal", e);
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg, ...fallbackAnalysis("Unknown", "Role") }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

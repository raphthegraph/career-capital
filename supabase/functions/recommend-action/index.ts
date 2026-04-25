// Recommendations after user makes a portfolio decision (increase / reduce / exit)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Decision = "increase" | "reduce" | "exit";

async function tavily(query: string, max_results = 5) {
  if (!TAVILY_API_KEY) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, query, search_depth: "basic", max_results }),
    });
    if (!res.ok) return [];
    const d = await res.json();
    return d.results ?? [];
  } catch { return []; }
}

async function ai(system: string, user: string, tool: any) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });
    if (!r.ok) { console.error("ai err", r.status, await r.text()); return null; }
    const d = await r.json();
    const c = d.choices?.[0]?.message?.tool_calls?.[0];
    if (!c) return null;
    return typeof c.function.arguments === "string" ? JSON.parse(c.function.arguments) : c.function.arguments;
  } catch (e) { console.error(e); return null; }
}

// ---------- TOOLS ----------
const INCREASE_TOOL = {
  type: "function",
  function: {
    name: "emit_increase_plan",
    description: "Plan to maximize upside in current role.",
    parameters: {
      type: "object",
      properties: {
        promotionStrategy: { type: "array", items: { type: "string" } },
        skillsToBuild: { type: "array", items: { type: "string" } },
        internalMoves: { type: "array", items: { type: "string" } },
        relationshipMap: { type: "array", items: { type: "string" } },
        plan30: { type: "array", items: { type: "string" } },
        plan60: { type: "array", items: { type: "string" } },
        plan90: { type: "array", items: { type: "string" } },
        increaseDividend: { type: "string" },
        reduceVolatility: { type: "string" },
        unlockUpside: { type: "string" },
      },
      required: ["promotionStrategy", "skillsToBuild", "internalMoves", "relationshipMap", "plan30", "plan60", "plan90", "increaseDividend", "reduceVolatility", "unlockUpside"],
    },
  },
};

const REDUCE_TOOL = {
  type: "function",
  function: {
    name: "emit_alternatives",
    description: "Recommend alternative companies to apply to.",
    parameters: {
      type: "object",
      properties: {
        companies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              ticker: { type: "string" },
              thesis: { type: "string" },
              upside: { type: "string" },
              risk: { type: "string" },
              liquidity: { type: "string" },
              suggestedRole: { type: "string" },
            },
            required: ["name", "ticker", "thesis", "upside", "risk", "liquidity", "suggestedRole"],
          },
        },
      },
      required: ["companies"],
    },
  },
};

const EXIT_TOOL = {
  type: "function",
  function: {
    name: "emit_exit_plan",
    description: "Career pivots, startup ideas, and timeline simulation.",
    parameters: {
      type: "object",
      properties: {
        startupIdeas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              pitch: { type: "string" },
              fit: { type: "string" },
            },
            required: ["name", "pitch", "fit"],
          },
        },
        careerPivots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              why: { type: "string" },
              leverage: { type: "string" },
            },
            required: ["path", "why", "leverage"],
          },
        },
        timeline: {
          type: "object",
          properties: {
            month0: { type: "string" },
            month3: { type: "string" },
            month6: { type: "string" },
            month12: { type: "string" },
          },
          required: ["month0", "month3", "month6", "month12"],
        },
      },
      required: ["startupIdeas", "careerPivots", "timeline"],
    },
  },
};

// ---------- FALLBACKS ----------
function fbIncrease(company: string, role: string) {
  return {
    promotionStrategy: [
      `Document quantified wins from your ${role} scope this quarter.`,
      `Pitch a one-pager owning a strategic surface that ${company} leadership cares about.`,
      "Get a senior sponsor — ship one project under their umbrella.",
    ],
    skillsToBuild: ["Cross-functional storytelling", "Financial fluency", "AI-native workflows", "Stakeholder management"],
    internalMoves: ["Volunteer for a high-visibility cross-team initiative", "Mentor a junior — increases internal brand", "Sit in on senior strategy reviews"],
    relationshipMap: ["Skip-level: monthly 1:1", "Adjacent team lead: bi-weekly sync", "Two execs: quarterly touchpoint"],
    plan30: ["Audit your scope vs the next title", "Identify 3 visible wins to capture", "Get manager aligned on promo path"],
    plan60: ["Ship one of the 3 wins", "Publish an internal memo or doc", "Lock 2 senior advocates"],
    plan90: ["Close the second win", "Open promo conversation explicitly", "Have peer feedback queued"],
    increaseDividend: "Negotiate scope expansion — scope expansion precedes comp expansion by ~6 months.",
    reduceVolatility: "Diversify your sponsor base — don't depend on a single manager's career arc.",
    unlockUpside: "Take one strategic bet visible to a VP. Optionality compounds with executive exposure.",
  };
}

function fbReduce(company: string, role: string) {
  return {
    companies: [
      { name: "Stripe", ticker: "STRP-PM", thesis: "Best-in-class infra brand, strong promotion velocity.", upside: "High — equity + brand halo.", risk: "High bar, intense culture.", liquidity: "Excellent — name converts anywhere.", suggestedRole: `Senior ${role}` },
      { name: "Linear", ticker: "LNR-PM", thesis: "Lean team, high ownership, design-led culture.", upside: "Equity at attractive stage.", risk: "Smaller team, narrower scope.", liquidity: "Strong in product circles.", suggestedRole: `${role}, Workflows` },
      { name: "Ramp", ticker: "RMP-PM", thesis: "Fast growth, fintech tailwind, exec access.", upside: "Comp + equity above market.", risk: "Sector volatility.", liquidity: "Strong — fintech network.", suggestedRole: `${role}, Spend` },
    ],
  };
}

function fbExit(company: string, role: string) {
  return {
    startupIdeas: [
      { name: "InsightOps", pitch: `An ops layer for teams shipping ${role}-style workflows at scale.`, fit: `You've lived the pain inside ${company}.` },
      { name: "Pricer", pitch: "AI co-pilot that prices roles, projects and offers using market signals.", fit: "Adjacent to your domain expertise." },
    ],
    careerPivots: [
      { path: "Operator at a Series A", why: "Higher leverage, faster learning, real equity.", leverage: "You bring process from a mature org." },
      { path: "Independent advisor / fractional", why: "Monetize your network and pattern-matching.", leverage: "Brand of current employer travels." },
    ],
    timeline: {
      month0: `You leave ${company}. Severance + network warm-up.`,
      month3: "Two strong conversations underway; first contract or term sheet drafted.",
      month6: "Either a clear new role or first paying customer / sponsor.",
      month12: "Either repriced upward 20-40% or compounding founder equity.",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { decision, company, role, analysis } = (await req.json()) as {
      decision: Decision;
      company: string;
      role: string;
      analysis?: any;
    };

    const ctx = `Company: ${company}\nRole: ${role}\nVerdict: ${analysis?.rating ?? "N/A"} — ${analysis?.oneLineVerdict ?? ""}`;

    if (decision === "increase") {
      const sys = "You are $JOB. Generate a concrete repricing plan to maximize upside in the user's current role. Be specific, tactical, financial in tone. Each list 3-4 short items.";
      const out = await ai(sys, ctx, INCREASE_TOOL);
      const data = out && out.promotionStrategy ? out : fbIncrease(company, role);
      return new Response(JSON.stringify({ decision, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (decision === "reduce") {
      const tav = await tavily(`companies hiring ${role} with strong momentum 2024 2025`, 6);
      const research = tav.map((r: any) => `- ${r.title}: ${(r.content || "").slice(0, 200)}`).join("\n");
      const sys = "You are $JOB. Recommend 3-5 alternative companies that would be better career assets than the current one. Use any research provided. Use financial framing.";
      const user = `${ctx}\n\nResearch:\n${research || "No fresh research available."}\n\nProduce a list of 3-5 alternatives with synthetic ticker, thesis, upside, risk, liquidity, suggestedRole.`;
      const out = await ai(sys, user, REDUCE_TOOL);
      const data = out && out.companies ? out : fbReduce(company, role);
      return new Response(JSON.stringify({ decision, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (decision === "exit") {
      const sys = "You are $JOB. The user is reallocating their career capital. Produce 2-3 startup ideas they could leverage, 2-3 career pivots, and a 0/3/6/12 month timeline. Sharp, financial, specific.";
      const out = await ai(sys, ctx, EXIT_TOOL);
      const data = out && out.startupIdeas ? out : fbExit(company, role);
      return new Response(JSON.stringify({ decision, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown decision" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("recommend-action error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

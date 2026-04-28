export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
  rawContent?: string;
  relevanceScore?: number;
}

export type SourceQuality = "live" | "limited" | "fallback";

export interface SourceBackedClaim {
  bucket: string;
  claim: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
}

export interface ResearchPacket {
  sources: ResearchSource[];
  evidenceBuckets: Record<string, SourceBackedClaim[]>;
  sourceQuality: SourceQuality;
  roleSpecificFindings: string[];
  missingEvidence: string[];
}

const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const TAVILY_BASE_URL = "https://api.tavily.com";

type SearchTopic = "general" | "news" | "finance";

interface SearchPlan {
  query: string;
  topic: SearchTopic;
  maxResults?: number;
}

function isTrustedSource(url: string) {
  return /reuters|bloomberg|techcrunch|ft\.com|wsj|nytimes|cnbc|axios|sec\.gov|gov|company|careers|linkedin|dealroom|crunchbase|pitchbook|sifted|eu-startups/i.test(
    url,
  );
}

function classifySource(url: string, query: string): string {
  const lowerUrl = url.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (
    lowerUrl.includes("careers") ||
    lowerUrl.includes("jobs") ||
    lowerUrl.includes("linkedin.com/jobs")
  ) {
    return "careers";
  }
  if (/portfolio|companies|investments|fund|team|redalpine|vc|venture/.test(lowerUrl)) {
    return "fund";
  }
  if (
    /reuters|bloomberg|techcrunch|theverge|ft\.com|wsj|nytimes|cnbc|axios|substack/.test(
      lowerUrl,
    )
  ) {
    return "news";
  }
  if (
    /sec\.gov|lawsuit|regulat|ftc|doj|complaint|controvers|risk/.test(lowerUrl) ||
    /layoffs|funding|regulation|executive|controversy|risk/.test(lowerQuery)
  ) {
    return "risk";
  }
  if (/crunchbase|pitchbook|wikipedia|investor/.test(lowerUrl)) return "market";
  if (/dealroom|portfolio|fund size|investment thesis|recent investments|exits|dry powder|fundraising/.test(lowerQuery)) {
    return "fund";
  }
  if (/overview|business model|competitor|leadership|team/.test(lowerQuery)) return "company";
  return "other";
}

function scoreSource(source: ResearchSource) {
  const typeWeight = {
    fund: 5.4,
    risk: 5,
    news: 4.5,
    careers: 4,
    company: 3.5,
    market: 3,
    other: 2,
  } as const;

  const text = `${source.title} ${source.snippet}`.toLowerCase();
  const keywordBonus =
    (/(layoff|reorg|funding|fund|portfolio|exit|investment|regulat|lawsuit|hiring|career|launch|competition|executive|partner|promotion)/.test(
      text,
    )
      ? 1.2
      : 0) +
    (/(role|product|engineer|designer|manager|investment|analyst|associate|principal|partner)/.test(text) ? 0.6 : 0);

  const trustBonus = isTrustedSource(source.url) ? 0.8 : 0;
  return (typeWeight[source.sourceType as keyof typeof typeWeight] ?? 2) + keywordBonus + trustBonus;
}

function isVentureOrFundRole(company: string, role: string) {
  const text = `${company} ${role}`.toLowerCase();
  return /(venture|capital|vc|fund|investment manager|investor|investment associate|investment analyst|principal|partner|redalpine|seed|growth equity|private equity)/.test(text);
}

function roleModifiers(role: string) {
  return [
    `${role} promotion path scope ownership`,
    `${role} learning surface stakeholder complexity`,
    `${role} hiring demand exit opportunities`,
  ];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchPlans(company: string, role: string): SearchPlan[] {
  const basePlans: SearchPlan[] = [
    { query: `${company} company overview business model leadership team`, topic: "general", maxResults: 3 },
    { query: `${company} recent news product launches market momentum competitors`, topic: "news", maxResults: 3 },
    { query: `${company} layoffs funding regulation executive changes controversy risks`, topic: "news", maxResults: 3 },
    { query: `${company} careers hiring ${role} team growth`, topic: "general", maxResults: 3 },
    { query: `${company} ${role} ${roleModifiers(role).join(" ")}`, topic: "general", maxResults: 3 },
  ];

  if (!isVentureOrFundRole(company, role)) {
    return [
      ...basePlans,
      { query: `${company} roadmap platform scale product engineering market pressure`, topic: "general", maxResults: 3 },
    ];
  }

  return [
    ...basePlans,
    { query: `${company} venture capital fund size latest fund fundraising dry powder`, topic: "general", maxResults: 4 },
    { query: `${company} portfolio recent investments exits seed startups`, topic: "general", maxResults: 4 },
    { query: `${company} investment thesis sectors AI fintech climate deep tech`, topic: "general", maxResults: 3 },
    { query: `${company} team partners investment manager hiring careers`, topic: "general", maxResults: 3 },
    { query: `${company} reputation venture capital market Europe portfolio performance`, topic: "news", maxResults: 3 },
  ];
}

function bucketForSource(source: ResearchSource) {
  const text = `${source.sourceType} ${source.title} ${source.snippet}`.toLowerCase();
  if (/career|hiring|jobs|team growth|linkedin/.test(text)) return "hiringSignal";
  if (/portfolio|investment|fund|exit|fundraising|dry powder|partner/.test(text)) return "companyMomentum";
  if (/risk|regulat|lawsuit|layoff|controvers|pressure|complaint/.test(text)) return "marketRisk";
  if (/role|promotion|manager|ownership|stakeholder|scope/.test(text)) return "roleLeverage";
  if (/competitor|market|category|sector|momentum/.test(text)) return "exitOptionality";
  return "companyMomentum";
}

function claimFromSource(source: ResearchSource, bucket: string): SourceBackedClaim {
  const evidence = (source.rawContent || source.snippet).replace(/\s+/g, " ").trim();
  return {
    bucket,
    claim: evidence.slice(0, 280),
    sourceTitle: source.title,
    sourceUrl: source.url,
    sourceType: source.sourceType,
  };
}

export function buildResearchPacket(
  sources: ResearchSource[],
  company: string,
  role: string,
): ResearchPacket {
  const buckets: Record<string, SourceBackedClaim[]> = {
    companyMomentum: [],
    roleLeverage: [],
    hiringSignal: [],
    promotionPath: [],
    marketRisk: [],
    exitOptionality: [],
  };

  for (const source of sources) {
    const bucket = bucketForSource(source);
    buckets[bucket].push(claimFromSource(source, bucket));

    if (
      bucket === "hiringSignal" ||
      /promotion|scope|manager|partner|principal|ownership/i.test(`${source.title} ${source.snippet}`)
    ) {
      buckets.promotionPath.push(claimFromSource(source, "promotionPath"));
    }
  }

  for (const bucket of Object.keys(buckets)) {
    buckets[bucket] = buckets[bucket].slice(0, 3);
  }

  const extractedCount = sources.filter((source) => Boolean(source.rawContent)).length;
  const sourceQuality: SourceQuality =
    sources.length >= 4 && extractedCount >= 2
      ? "live"
      : sources.length >= 2
        ? "limited"
        : "fallback";

  const missingEvidence = [
    buckets.companyMomentum.length === 0 ? "company momentum" : "",
    buckets.hiringSignal.length === 0 ? "hiring/team signal" : "",
    buckets.marketRisk.length === 0 ? "risk signal" : "",
    buckets.roleLeverage.length === 0 ? "role-specific leverage" : "",
  ].filter(Boolean);

  const roleNeedle = escapeRegExp(role.split(/\s+/)[0] || role);
  const roleSpecificFindings = sources
    .filter((source) => new RegExp(roleNeedle, "i").test(`${source.title} ${source.snippet}`))
    .slice(0, 4)
    .map((source) => `${source.title}: ${(source.rawContent || source.snippet).slice(0, 220)}`);

  return {
    sources,
    evidenceBuckets: buckets,
    sourceQuality,
    roleSpecificFindings: roleSpecificFindings.length
      ? roleSpecificFindings
      : [
        `No source directly discussed ${role}; infer role impact from company, hiring, market, and risk evidence.`,
      ],
    missingEvidence,
  };
}

async function tavilySearch(plan: SearchPlan) {
  if (!TAVILY_API_KEY) return [];

  try {
    const response = await fetch(`${TAVILY_BASE_URL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: plan.query,
        topic: plan.topic,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
        include_usage: false,
        max_results: plan.maxResults ?? 3,
      }),
    });

    if (!response.ok) {
      console.error("Tavily search error", response.status, plan.query);
      return [];
    }

    const json = await response.json();
    return json.results ?? [];
  } catch (error) {
    console.error("Tavily search exception", error);
    return [];
  }
}

async function tavilyExtract(urls: string[], query: string) {
  if (!TAVILY_API_KEY || urls.length === 0) return {};

  try {
    const response = await fetch(`${TAVILY_BASE_URL}/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls,
        query,
        extract_depth: "basic",
        format: "text",
        chunks_per_source: 4,
      }),
    });

    if (!response.ok) {
      console.error("Tavily extract error", response.status);
      return {};
    }

    const json = await response.json();
    const extracted: Record<string, string> = {};

    for (const result of json.results ?? []) {
      if (result?.url && result?.raw_content) {
        extracted[result.url] = String(result.raw_content).replace(/\s+/g, " ").trim();
      }
    }

    return extracted;
  } catch (error) {
    console.error("Tavily extract exception", error);
    return {};
  }
}

export async function runTavilyResearch(company: string, role: string) {
  const plans = buildSearchPlans(company, role);

  const searchResults = await Promise.all(plans.map((plan) => tavilySearch(plan).then((results) => ({ plan, results }))));
  const deduped = new Map<string, ResearchSource>();

  for (const { plan, results } of searchResults) {
    for (const item of results) {
      if (!item?.url) continue;

      const next: ResearchSource = {
        title: String(item.title ?? "").slice(0, 220),
        url: String(item.url),
        snippet: String(item.content ?? "").replace(/\s+/g, " ").slice(0, 420),
        sourceType: classifySource(String(item.url), plan.query),
      };
      next.relevanceScore = scoreSource(next);

      const existing = deduped.get(next.url);
      if (!existing || (next.relevanceScore ?? 0) > (existing.relevanceScore ?? 0)) {
        deduped.set(next.url, next);
      }
    }
  }

  const ranked = Array.from(deduped.values()).sort(
    (left, right) => (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0),
  );

  const extractTargets = ranked.slice(0, 5);
  const extracted = await tavilyExtract(
    extractTargets.map((item) => item.url),
    `${company} ${role} career impact signals`,
  );

  return ranked.slice(0, 8).map((item) => ({
    ...item,
    rawContent: extracted[item.url]?.slice(0, 1200),
  }));
}

export function compressResearchPacket(packet: ResearchPacket) {
  const bucketBlock = Object.entries(packet.evidenceBuckets)
    .map(([bucket, claims]) => {
      if (claims.length === 0) return `${bucket}: no strong source found`;
      return `${bucket}:\n${claims.map((claim, index) => `- [${index + 1}] ${claim.claim}\n  Source: ${claim.sourceTitle} (${claim.sourceUrl})`).join("\n")}`;
    })
    .join("\n\n");

  return [
    `Source quality: ${packet.sourceQuality}`,
    packet.missingEvidence.length ? `Missing evidence: ${packet.missingEvidence.join(", ")}` : "Missing evidence: none obvious",
    `Role-specific findings:\n${packet.roleSpecificFindings.map((finding) => `- ${finding}`).join("\n")}`,
    `Evidence buckets:\n${bucketBlock}`,
  ].join("\n\n");
}

export function compressEvidence(sources: ResearchSource[], maxSources = 8) {
  return sources
    .slice(0, maxSources)
    .map((source, index) => {
      const evidence = source.rawContent
        ? source.rawContent.slice(0, 360)
        : source.snippet;

      return [
        `[${index + 1}] ${source.sourceType.toUpperCase()} | ${source.title}`,
        `URL: ${source.url}`,
        `Evidence: ${evidence}`,
      ].join("\n");
    })
    .join("\n\n");
}

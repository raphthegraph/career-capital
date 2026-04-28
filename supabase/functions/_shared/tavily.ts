export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
  rawContent?: string;
  relevanceScore?: number;
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
  return /reuters|bloomberg|techcrunch|ft\.com|wsj|nytimes|cnbc|axios|sec\.gov|gov|company|careers|linkedin/i.test(
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
  if (/overview|business model|competitor/.test(lowerQuery)) return "company";
  return "other";
}

function scoreSource(source: ResearchSource) {
  const typeWeight = {
    risk: 5,
    news: 4.5,
    careers: 4,
    company: 3.5,
    market: 3,
    other: 2,
  } as const;

  const text = `${source.title} ${source.snippet}`.toLowerCase();
  const keywordBonus =
    (/(layoff|reorg|funding|regulat|lawsuit|hiring|career|launch|competition|executive)/.test(
      text,
    )
      ? 1.2
      : 0) +
    (/(role|product|engineer|designer|manager)/.test(text) ? 0.6 : 0);

  const trustBonus = isTrustedSource(source.url) ? 0.8 : 0;
  return (typeWeight[source.sourceType as keyof typeof typeWeight] ?? 2) + keywordBonus + trustBonus;
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
  const plans: SearchPlan[] = [
    {
      query: `${company} company overview business model leadership`,
      topic: "general",
    },
    {
      query: `${company} recent news product launches market momentum competitors`,
      topic: "news",
    },
    {
      query: `${company} layoffs funding regulation executive changes controversy`,
      topic: "news",
    },
    {
      query: `${company} careers hiring ${role} team growth`,
      topic: "general",
    },
    {
      query: `${company} risks challenges margin pressure customer complaints`,
      topic: "news",
    },
    {
      query: `${company} ${role} roadmap platform scale engineering product`,
      topic: "general",
    },
  ];

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

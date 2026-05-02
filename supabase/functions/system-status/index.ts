import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  enforceRateLimit,
  getCorsHeaders,
  handleCorsPreflight,
  jsonResponse,
  rejectDisallowedOrigin,
} from "../_shared/http.ts";

type StatusState = "operational" | "degraded" | "down";
type CheckGroup = "edge-function" | "storage";

interface StatusCheck {
  name: string;
  slug: string;
  group: CheckGroup;
  status: StatusState;
  responseTimeMs: number;
  lastCheckedAt: string;
  error?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNCTION_HEALTH_ANON_KEY = Deno.env.get("FUNCTION_HEALTH_ANON_KEY") ?? SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EDGE_FUNCTIONS = [
  {
    name: "Job analysis API",
    slug: "analyze-job",
  },
  {
    name: "Recommendation API",
    slug: "recommend-action",
  },
  {
    name: "Career chat API",
    slug: "career-chat",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function overallStatus(checks: StatusCheck[]): StatusState {
  if (checks.some((check) => check.status === "down")) return "down";
  if (checks.some((check) => check.status === "degraded")) return "degraded";
  return "operational";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEdgeFunction(endpoint: { name: string; slug: string }): Promise<StatusCheck> {
  const startedAt = performance.now();

  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/${endpoint.slug}?health=1`,
      {
        method: "HEAD",
        headers: {
          apikey: FUNCTION_HEALTH_ANON_KEY,
          Authorization: `Bearer ${FUNCTION_HEALTH_ANON_KEY}`,
        },
      },
      5000,
    );
    const responseTimeMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        ...endpoint,
        group: "edge-function",
        status: response.status >= 500 ? "down" : "degraded",
        responseTimeMs,
        lastCheckedAt: nowIso(),
        error: `Health check returned HTTP ${response.status}.`,
      };
    }

    return {
      ...endpoint,
      group: "edge-function",
      status: "operational",
      responseTimeMs,
      lastCheckedAt: nowIso(),
    };
  } catch (error) {
    return {
      ...endpoint,
      group: "edge-function",
      status: "down",
      responseTimeMs: Math.round(performance.now() - startedAt),
      lastCheckedAt: nowIso(),
      error: error instanceof Error ? error.message : "Health check failed.",
    };
  }
}

async function checkTableAccess(name: string, slug: string, tableName: string): Promise<StatusCheck> {
  const startedAt = performance.now();

  try {
    const { error } = await supabase
      .from(tableName)
      .select("id", { head: true, count: "exact" })
      .limit(1);

    const responseTimeMs = Math.round(performance.now() - startedAt);

    if (error) {
      return {
        name,
        slug,
        group: "storage",
        status: "degraded",
        responseTimeMs,
        lastCheckedAt: nowIso(),
        error: "Storage check could not read the expected table.",
      };
    }

    return {
      name,
      slug,
      group: "storage",
      status: "operational",
      responseTimeMs,
      lastCheckedAt: nowIso(),
    };
  } catch (error) {
    return {
      name,
      slug,
      group: "storage",
      status: "down",
      responseTimeMs: Math.round(performance.now() - startedAt),
      lastCheckedAt: nowIso(),
      error: error instanceof Error ? error.message : "Storage check failed.",
    };
  }
}

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;

  if (!["GET", "POST", "HEAD"].includes(request.method)) {
    return jsonResponse(
      { error: "Method not allowed." },
      { status: 405, headers: { Allow: "GET, POST, HEAD, OPTIONS" } },
      request,
    );
  }

  const rateLimitError = await enforceRateLimit(supabase, request, {
    endpoint: "system-status",
    maxRequests: 60,
    globalMaxRequests: 1200,
    windowSeconds: 60 * 60,
  });
  if (rateLimitError) return rateLimitError;

  const checkedAt = nowIso();
  const services = await Promise.all([
    ...EDGE_FUNCTIONS.map((endpoint) => checkEdgeFunction(endpoint)),
    checkTableAccess("Analysis storage", "job_analyses", "job_analyses"),
    checkTableAccess("Vector storage", "analysis_embeddings", "analysis_embeddings"),
  ]);

  if (request.method === "HEAD") {
    return new Response(null, {
      status: overallStatus(services) === "down" ? 503 : 200,
      headers: getCorsHeaders(request),
    });
  }

  return jsonResponse(
    {
      status: overallStatus(services),
      checkedAt,
      services,
    },
    {
      status: overallStatus(services) === "down" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
    request,
  );
});

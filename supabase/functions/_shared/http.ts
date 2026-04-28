const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function configuredOrigins() {
  const value = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function allowedOrigins() {
  const configured = configuredOrigins();
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

export function getRequestOrigin(request: Request) {
  return request.headers.get("origin") ?? "";
}

export function isAllowedOrigin(request: Request) {
  const origin = getRequestOrigin(request);
  if (!origin) return true;
  return allowedOrigins().includes(origin);
}

export function getCorsHeaders(request?: Request) {
  const origin = request ? getRequestOrigin(request) : "";
  const headers = new Headers();
  headers.set("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"]);
  headers.set("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
  headers.set("Access-Control-Max-Age", corsHeaders["Access-Control-Max-Age"]);
  headers.set("Vary", "Origin");

  if (request && origin && isAllowedOrigin(request)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else if (!request || !origin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigins()[0] ?? "http://localhost:4173");
  }

  return headers;
}

export function handleCorsPreflight(request: Request) {
  if (request.method !== "OPTIONS") return null;
  if (!isAllowedOrigin(request)) {
    return new Response(null, { status: 403, headers: getCorsHeaders(request) });
  }
  return new Response(null, { headers: getCorsHeaders(request) });
}

export function rejectDisallowedOrigin(request: Request) {
  if (isAllowedOrigin(request)) return null;
  return jsonResponse(
    { error: "Origin is not allowed." },
    { status: 403 },
    request,
  );
}

export function requirePost(request: Request) {
  if (request.method === "POST") return null;
  return jsonResponse(
    { error: "Method not allowed." },
    { status: 405, headers: { Allow: "POST, OPTIONS" } },
    request,
  );
}

export async function readJsonBody<T>(
  request: Request,
  options: { maxBytes: number },
): Promise<{ data: T | null; error: Response | null }> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > options.maxBytes) {
    return {
      data: null,
      error: jsonResponse(
        { error: "Request body is too large." },
        { status: 413 },
        request,
      ),
    };
  }

  const text = await request.text();
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > options.maxBytes) {
    return {
      data: null,
      error: jsonResponse(
        { error: "Request body is too large." },
        { status: 413 },
        request,
      ),
    };
  }

  try {
    return { data: JSON.parse(text) as T, error: null };
  } catch {
    return {
      data: null,
      error: jsonResponse(
        { error: "Request body must be valid JSON." },
        { status: 400 },
        request,
      ),
    };
  }
}

export function validateTextField(
  value: unknown,
  label: string,
  options: { maxLength: number; required?: boolean },
) {
  const text = String(value ?? "").trim();
  if (options.required && !text) {
    return { value: text, error: `${label} is required.` };
  }
  if (text.length > options.maxLength) {
    return { value: text.slice(0, options.maxLength), error: `${label} is too long.` };
  }
  return { value: text, error: null };
}

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function enforceRateLimit(
  // Supabase's Deno client returns a thenable query builder from rpc(), so keep
  // this intentionally structural instead of importing client-specific types.
  supabase: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  request: Request,
  options: { endpoint: string; maxRequests: number; windowSeconds: number; globalMaxRequests?: number },
) {
  const identifier = getClientIdentifier(request);
  const identifierHash = await sha256(identifier);
  const windowMs = options.windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + windowMs);
  const key = `${options.endpoint}:${identifierHash}:${windowStart.toISOString()}`;

  try {
    if (options.globalMaxRequests) {
      const globalLimit = await checkRateLimit(supabase, {
        key: `${options.endpoint}:global:${windowStart.toISOString()}`,
        endpoint: `${options.endpoint}:global`,
        identifierHash: "global",
        windowStart,
        maxRequests: options.globalMaxRequests,
      });

      if (globalLimit === "blocked") {
        return rateLimitResponse(resetAt, request);
      }
    }

    const clientLimit = await checkRateLimit(supabase, {
      key,
      endpoint: options.endpoint,
      identifierHash,
      windowStart,
      maxRequests: options.maxRequests,
    });

    if (clientLimit === "blocked") {
      return rateLimitResponse(resetAt, request);
    }

    return null;
  } catch (error) {
    console.error("rate limit exception", error);
    return null;
  }
}

async function checkRateLimit(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  args: {
    key: string;
    endpoint: string;
    identifierHash: string;
    windowStart: Date;
    maxRequests: number;
  },
) {
  const { data, error } = await supabase.rpc("check_edge_rate_limit", {
    p_key: args.key,
    p_endpoint: args.endpoint,
    p_identifier_hash: args.identifierHash,
    p_window_start: args.windowStart.toISOString(),
    p_max_count: args.maxRequests,
  });

  if (error) {
    console.error("rate limit check failed", error);
    return "allowed";
  }

  const row = Array.isArray(data) ? data[0] : data;
  return (row as { allowed?: boolean } | undefined)?.allowed
    ? "allowed"
    : "blocked";
}

function rateLimitResponse(resetAt: Date, request: Request) {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt.getTime() - Date.now()) / 1000),
  );

  return jsonResponse(
    {
      error: "Rate limit exceeded. Try again later.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
    request,
  );
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
  request?: Request,
) {
  const headers = new Headers(init.headers);
  const cors = getCorsHeaders(request);
  cors.forEach((value, key) => headers.set(key, value));
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

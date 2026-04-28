const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const OPENAI_TIMEOUT_MS = Number(Deno.env.get("OPENAI_TIMEOUT_MS") ?? "45000");
const EMBEDDING_TIMEOUT_MS = Number(Deno.env.get("EMBEDDING_TIMEOUT_MS") ?? "15000");

export interface OpenAiFailure {
  status?: number;
  message: string;
}

export interface OpenAiResult<T> {
  data: T | null;
  failure?: OpenAiFailure;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function extractMessageContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((chunk) => {
      if (typeof chunk === "string") return chunk;
      if (!chunk || typeof chunk !== "object") return "";
      const text = (chunk as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("")
    .trim();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
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

async function postChatCompletion(body: Record<string, unknown>) {
  if (!OPENAI_API_KEY) {
    return {
      json: null,
      failure: {
        message: "OPENAI_API_KEY is not configured.",
      } satisfies OpenAiFailure,
    };
  }

  try {
    const response = await fetchWithTimeout(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        ...body,
      }),
    }, OPENAI_TIMEOUT_MS);

    if (!response.ok) {
      const text = await response.text();
      return {
        json: null,
        failure: {
          status: response.status,
          message: text.slice(0, 600) || "OpenAI request failed.",
        } satisfies OpenAiFailure,
      };
    }

    return { json: await response.json(), failure: undefined };
  } catch (error) {
    return {
      json: null,
      failure: {
        message: error instanceof Error ? error.message : "OpenAI request failed.",
      } satisfies OpenAiFailure,
    };
  }
}

export async function generateStructuredOutput<T>(args: {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
}): Promise<OpenAiResult<T>> {
  const { json, failure } = await postChatCompletion({
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.userPrompt },
    ] satisfies ChatMessage[],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: args.schemaName,
        schema: args.schema,
        strict: true,
      },
    },
  });

  if (failure || !json) return { data: null, failure };

  const message = json?.choices?.[0]?.message;
  const refusal =
    typeof message?.refusal === "string" ? message.refusal : "";
  if (refusal) {
    return {
      data: null,
      failure: {
        message: refusal,
      },
    };
  }

  const raw = extractMessageContent(message?.content);
  if (!raw) {
    return {
      data: null,
      failure: {
        message: "OpenAI returned an empty structured response.",
      },
    };
  }

  try {
    return { data: JSON.parse(raw) as T };
  } catch (error) {
    return {
      data: null,
      failure: {
        message:
          error instanceof Error
            ? `Could not parse OpenAI structured response: ${error.message}`
            : "Could not parse OpenAI structured response.",
      },
    };
  }
}

export async function generateTextReply(args: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<OpenAiResult<string>> {
  const { json, failure } = await postChatCompletion({
    messages: [
      { role: "system", content: args.systemPrompt },
      ...args.messages,
    ] satisfies ChatMessage[],
  });

  if (failure || !json) return { data: null, failure };

  const text = extractMessageContent(json?.choices?.[0]?.message?.content);
  if (!text) {
    return {
      data: null,
      failure: {
        message: "OpenAI returned an empty text reply.",
      },
    };
  }

  return { data: text };
}

export async function createEmbeddings(inputs: string[]) {
  if (!OPENAI_API_KEY || inputs.length === 0) return null;

  try {
    const response = await fetchWithTimeout(EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: inputs,
      }),
    }, EMBEDDING_TIMEOUT_MS);

    if (!response.ok) {
      console.error(
        "OpenAI embeddings error",
        response.status,
        (await response.text()).slice(0, 400),
      );
      return null;
    }

    const json = await response.json();
    return (json.data ?? []).map((item: { embedding: number[] }) => item.embedding);
  } catch (error) {
    console.error("OpenAI embeddings exception", error);
    return null;
  }
}

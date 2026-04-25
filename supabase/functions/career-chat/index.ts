// $JOB — career-chat edge function
// Streaming-style chat that uses the analysis as grounded context.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  company: string;
  role: string;
  decision: "increase" | "reduce" | "exit";
  analysis: any;
  recommendation?: any;
  messages: { role: "user" | "assistant"; content: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    const { company, role, decision, analysis, recommendation, messages } = body;

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          reply:
            "AI is offline. Try again in a moment — I usually answer with concrete next steps tied to your asset score.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const system = `You are $JOB, a brutally honest career-asset advisor. The user is treating their job as an investable asset.
Speak with sharp financial framing. Be specific, opinionated, concise (max ~120 words per reply, often less).
Never repeat the analysis verbatim — extend it with action.

CONTEXT — current asset:
- Company: ${company}
- Role: ${role}
- Verdict: ${analysis?.rating} (${analysis?.wouldBuy})
- One-liner: ${analysis?.oneLineVerdict}
- Decision the user picked: ${decision.toUpperCase()}
- Bull: ${(analysis?.bullCase ?? []).join(" | ")}
- Bear: ${(analysis?.bearCase ?? []).join(" | ")}
${recommendation ? `- Generated plan summary: ${JSON.stringify(recommendation).slice(0, 1200)}` : ""}

If asked off-topic, redirect to career strategy. Use second-person ("you", "your asset"). No emojis.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("chat ai err", r.status, txt);
      if (r.status === 402) {
        return new Response(
          JSON.stringify({ reply: "AI credits exhausted. Top up to keep advising." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (r.status === 429) {
        return new Response(
          JSON.stringify({ reply: "Rate limited — give it a few seconds." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ reply: "Could not reach AI." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const d = await r.json();
    const reply = d.choices?.[0]?.message?.content ?? "No response.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("career-chat fatal", e);
    return new Response(
      JSON.stringify({ reply: "Something went wrong. Try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

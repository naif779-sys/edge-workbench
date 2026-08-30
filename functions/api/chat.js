export async function onRequestPost({ request, env }) {
  try {
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY غير معرف في بيئة Cloudflare" }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const body = await request.json();
    const {
      messages = [],
      tools = [],
      reasoningEffort = "medium",
      model = "anthropic/claude-sonnet-5",
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "حقل messages مطلوب ويجب أن يكون مصفوفة غير فارغة" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const payload = {
      model,
      messages,
      stream: true,
      reasoning: {
        effort: reasoningEffort,
      },
    };

    if (Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": env.SITE_URL || "https://localhost",
        "X-Title": "Edge Agentic Workbench",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      return new Response(
        JSON.stringify({
          error: "خطأ في استجابة مزود النموذج",
          status: openrouterResponse.status,
          details: errorText,
        }),
        {
          status: openrouterResponse.status,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    return new Response(openrouterResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في وسيط الحافة", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

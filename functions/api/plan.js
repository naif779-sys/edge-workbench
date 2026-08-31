export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { history, images } = body;

    const apiKey = env.PLANNER_API_KEY || env.OPENROUTER_API_KEY || env.BUILDER_API_KEY || env.CLAUDE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر في متغيرات بيئة Cloudflare (تأكد من وجود OPENROUTER_API_KEY أو PLANNER_API_KEY)." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `You are an elite Software Solutions Architect. Generate a comprehensive JSON blueprint for the requested single-file web application.
Return ONLY valid raw JSON with no Markdown wrapping, backticks, or preamble.
JSON structure:
{
  "project_name": "string",
  "theme": { "primary": "string", "background": "string", "direction": "rtl" },
  "layout": { "header": {}, "sections": [], "footer": {} },
  "components": [],
  "functionalities": []
}`;

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      history.forEach(h => {
        if (h.role && h.content) messages.push({ role: h.role, content: h.content });
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://njagentic.online",
        "X-Title": "Edge Workbench - Planner"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ من مزود الذكاء الاصطناعي (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    const blueprint = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ blueprint }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في معالج التخطيط: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

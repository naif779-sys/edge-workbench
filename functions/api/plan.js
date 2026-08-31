export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { history, images } = body;

    // جلب وتطهير المفاتيح المتاحة
    const rawKeys = [env.PLANNER_API_KEY, env.OPENROUTER_API_KEY, env.BUILDER_API_KEY].filter(Boolean);
    const keys = rawKeys.map(k => k.trim().replace(/^["']|["']$/g, ''));

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: "لم يتم العثور على أي مفتاح API في متغيرات بيئة Cloudflare." }), {
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

    let lastError = null;

    for (const key of keys) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
            "HTTP-Referer": "https://njagentic.online",
            "X-Title": "Edge Workbench - Planner"
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-chat",
            messages: messages,
            temperature: 0.2
          })
        });

        if (response.ok) {
          const data = await response.json();
          const blueprint = data.choices?.[0]?.message?.content || "";
          return new Response(JSON.stringify({ blueprint }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }

        const errText = await response.text();
        const masked = key.substring(0, 8) + "..." + key.substring(key.length - 4);
        lastError = `مفتاح (${masked}) فشل (${response.status}): ${errText}`;
      } catch (e) {
        lastError = e.message;
      }
    }

    return new Response(JSON.stringify({ error: lastError || "فشل الاتصال بجميع المفاتيح المسجلة." }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في معالج التخطيط: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

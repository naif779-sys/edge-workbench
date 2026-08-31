export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { message, images, history } = body;

    const apiKey = env.OPENROUTER_API_KEY || env.PLANNER_API_KEY || env.CLAUDE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر في متغيرات بيئة Cloudflare." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const messages = [
      {
        role: "system",
        content: "You are a Senior Technical Solutions Architect. Provide concise, expert architectural feedback in Arabic for web applications."
      }
    ];

    if (Array.isArray(history)) {
      history.forEach(h => {
        if (h.role && h.content) messages.push({ role: h.role, content: h.content });
      });
    }

    if (message) {
      messages.push({ role: "user", content: message });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://njagentic.online",
        "X-Title": "Edge Workbench - Consultant"
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        messages: messages,
        temperature: 0.3
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
    const reply = data.choices?.[0]?.message?.content || "تم استلام المتطلبات بنجاح.";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في معالج الاستشارة: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

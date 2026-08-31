export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { message, history } = body;

    // جلب وتنظيف المفاتيح المتاحة
    const rawKeys = [env.PLANNER_API_KEY, env.OPENROUTER_API_KEY, env.BUILDER_API_KEY].filter(Boolean);
    const keys = rawKeys.map(k => k.trim().replace(/^["']|["']$/g, ''));

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: "لم يتم العثور على أي مفتاح API في متغيرات بيئة Cloudflare." }), {
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

    let lastError = null;

    // تجربة المفاتيح المتاحة بالتتابع
    for (const key of keys) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
            "HTTP-Referer": "https://njagentic.online",
            "X-Title": "Edge Workbench - Consultant"
          },
          body: JSON.stringify({
            model: "anthropic/claude-haiku-4.5",
            messages: messages,
            temperature: 0.3
          })
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || "تم التحليل بنجاح.";
          return new Response(JSON.stringify({ reply }), {
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
    return new Response(JSON.stringify({ error: `خطأ في المعالج: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

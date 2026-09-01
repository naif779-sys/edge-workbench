export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, blueprint } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.BUILDER_API_KEY || env.PLANNER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت مبرمج واجهات ويب أول (Senior Full-Stack UI/UX Engineer).
مهمتك بناء صفحة متجر إلكتروني متكاملة، نظيفة، فائقة الفخامة وجاهزة للعمل الفوري ضمن ملف HTML واحد مستقل (Single-File).
المتطلبات الإلزامية:
1. دعم RTL واللغة العربية الكاملة واستخدام خط Tajawal وتنسيقات Tailwind CSS.
2. استخدام JavaScript تفاعلي خالص (Pure JS) لإدارة سلة التسوق (إضافة، حذف، عداد السلة، زر الطلب الفوري).
3. بناء مكونات داكنة وتفاصيل ذهبية أنيقة، مع صور ساعات فاخرة واقعية من Unsplash.
4. إرجاع كود HTML الكامل فقط (يبدأ بـ <!DOCTYPE html> وينتهي بـ </html>) دون أي نصوص أو شروحات جانبية.`;

    const userMessage = `المخطط الهيكلي المعتمد:\n${JSON.stringify(blueprint, null, 2)}\n\nطلب المستخدم:\n${prompt}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ التشييد (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    let code = data.choices?.[0]?.message?.content || "";
    code = code.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    return new Response(JSON.stringify({ code }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ تشييد الواجهة: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

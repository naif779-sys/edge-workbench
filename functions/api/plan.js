export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, messages = [] } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.PLANNER_API_KEY || env.BUILDER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر. يرجى إدخاله في الحقل العلوي أو ضبطه في Cloudflare." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت مهندس معماري ومصمم واجهات ويب خبير.
قم بتحليل طلب المستخدم وبناء كائن JSON نقي (Blueprint) يصف هيكل ومكونات الصفحة بدقة.
يجب أن يكون الرد عبارة عن كائن JSON فقط يبدأ بـ { وينتهي بـ } دون أي كتل كود ماركداون.

الهيكل المطلوب لكائن JSON:
{
  "theme": { "mode": "dark|light", "primary": "hex/color", "accent": "hex/color", "bg": "hex/color" },
  "layout": { "rtl": true, "hasNavbar": true, "hasFooter": true },
  "sections": [
    {
      "id": "section_id",
      "type": "hero|features|products|cta|footer",
      "title": "العنوان",
      "subtitle": "الوصف الفرعي",
      "components": []
    }
  ]
}`;

    const payloadMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: payloadMessages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ استجابة (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const cleanJson = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return new Response(JSON.stringify({ blueprint: JSON.parse(cleanJson) }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في المعالجة: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

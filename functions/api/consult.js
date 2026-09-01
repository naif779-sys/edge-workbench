export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, images = [] } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.PLANNER_API_KEY || env.BUILDER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت مهندس معماري ومحلل واجهات ويب بصري خبير.
قم بتحليل الصورة المرفقة واستخرج منها هيكل وتصميم الصفحة بصيغة JSON نقي (Blueprint).
استخرج بدقة نظام الألوان الداكن/الفاتح، نوع الأزرار، توزيع الأقسام والمنتجات.
يجب أن يكون الرد عبارة عن كائن JSON فقط يبدأ بـ { وينتهي بـ } دون أي علامات ماركداون.

الهيكل المطلوب:
{
  "theme": { "mode": "dark|light", "primary": "hex", "accent": "hex", "bg": "hex" },
  "layout": { "rtl": true, "hasNavbar": true, "hasFooter": true },
  "sections": [
    {
      "id": "section_id",
      "type": "hero|features|products|cta|footer",
      "title": "العنوان",
      "subtitle": "الوصف",
      "components": []
    }
  ]
}`;

    const contentParts = [
      { type: "text", text: prompt || "حلل هذا النموذج واستخرج كائن المخطط الهيكلي JSON المتوافق معه بدقة." }
    ];

    images.forEach(img => {
      contentParts.push({
        type: "image_url",
        image_url: { url: img }
      });
    });

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
          { role: "user", content: contentParts }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ التحليل البصري (${response.status}): ${errText}` }), {
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
    return new Response(JSON.stringify({ error: `خطأ معالجة الرؤية: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

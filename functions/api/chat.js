export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, blueprint, embeddedAssets = [] } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.BUILDER_API_KEY || env.PLANNER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت مهندس معماري أول للبرمجيات وتصميم واجهات الويب (Senior Principal UI/UX & Web Architect).
مهمتك: بناء وتشييد متجر إلكتروني فائق الفخامة والسرعة (Zero-Bloat) كملف HTML واحد مستقل تماماً (Single-File).

الضوابط الصارمة للإخراج:
1. لا تكتب أي مقدمات أو شروحات أو خاتمة، ابدأ مباشرة بـ <!DOCTYPE html> واختم بـ </html>.
2. استخدم مكتبة Tailwind CSS عبر CDN وخط Tajawal مع تفعيل dir="rtl" و lang="ar".
3. أضف وسوم SEO دلالية كاملة (title, meta description, meta viewport, OpenGraph).
4. برمج سلة مشتريات تفاعلية حية بلغة JavaScript خالصة (Pure JS) تشمل إضافة المنتجات، عداد السلة، ونافذة جانبية (Drawer) لعرض المنتجات وحساب الإجمالي.
5. في حال توفر مصفوفة (embeddedAssets)، استخدم عناوينها الممررة داخل وسوم <img> للمنتجات أو الأقسام المناسبة، وإلا فاستخدم صوراً عالية الدقة ومباشرة متناسقة مع طبيعة المتجر.`;

    let userMessage = `المخطط الهيكلي المعتمد:\n${JSON.stringify(blueprint, null, 2)}\n\nطلب المستخدم وتفاصيل المتجر:\n${prompt}`;
    if (embeddedAssets && embeddedAssets.length > 0) {
      userMessage += `\n\nأصول الصور المتوفرة للحقن المباشر:\n` + JSON.stringify(embeddedAssets);
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.2
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

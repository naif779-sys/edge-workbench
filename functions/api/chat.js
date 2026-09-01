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
مهمتك: تشييد متجر إلكتروني فائق الجودة، سريع جداً (Zero-Bloat)، ومتكامل التفاعل ضمن ملف HTML5 واحد مستقل تماماً.

الضوابط الصارمة للإخراج:
1. الجودة والأداء: كود نظيف، خالٍ من الحشو والمكتبات الزائدة، معتمد على Tailwind CSS عبر CDN وخط Tajawal.
2. اللغة والاتجاه: دعم كامل للغة العربية الفصحى مع تفعيل dir="rtl" و lang="ar".
3. المعايير القياسية والـ SEO:
   - إضافة وسوم <title>, <meta name="description">, <meta name="viewport">, ووسوم OpenGraph للمتجر.
   - استخدام عناصر HTML دلالية (header, nav, main, section, article, footer).
4. التفاعلية البرمجية (Pure JavaScript):
   - نظام سلة مشتريات متكامل (إضافة، تعديل كمية، حذف، حساب إجمالي فوري، ونافذة منبثقة أو شريط جانبي للسلة Drawer).
   - تجاوب مثالي مع نقرات اللمس للأجهزة اللوحية والهواتف.
5. الأصول والصور:
   - استخدام صور أصول متناسقة وواقعية وعالية الجودة متوافقة مع طبيعة المتجر، مع تضمين سمة alt بدقة لكافة الصور.
6. صيغة الإخراج: أرجع الكود البرمجي الصافي فقط بدءاً من <!DOCTYPE html> إلى </html> دون أي نصوص أو مقدمات أو علامات ماركداون.`;

    let userMessage = `المخطط الهيكلي المعتمد:\n${JSON.stringify(blueprint, null, 2)}\n\nطلب المستخدم التفصيلي:\n${prompt}`;
    if (embeddedAssets && embeddedAssets.length > 0) {
      userMessage += `\n\nأصول الصور المتوفرة للاستخدام:\n` + JSON.stringify(embeddedAssets);
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
        model: "anthropic/claude-3-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.25
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

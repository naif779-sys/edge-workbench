export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, blueprint = {}, embeddedAssets = [] } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.BUILDER_API_KEY || env.PLANNER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت رئيس مهندسي المعمارية البرمجية وواجهات الويب (Lead Principal Web Architect).
مهمتك: تشييد وبرمجة واجهة ويب فائقة الفخامة والأداء (Zero-Bloat) كملف HTML مستقل بالكامل (Single-File) متكيف بدقة مع النمط المعماري للمشروع (Dynamic Archetype).

الضوابط الهندسية الصارمة:
1. ابدأ الإخراج مباشرة بـ <!DOCTYPE html> واختم بـ </html> دون أي نصوص تمهيدية أو ماركداون.
2. استخدم Tailwind CSS عبر CDN، مع ضبط dir="rtl" و lang="ar" وخط 'Tajawal'.
3. التكيف الوظيفي التام مع نوع الواجهة الموضح في المخطط الهيكلي (site_type / archetype):
   - إذا كانت 'ecommerce': برمج كتالوج المنتجات، وسلة مشتريات تفاعلية حية (Pure JS Drawer)، وحساب الإجمالي.
   - إذا كانت 'dashboard': برمج مؤشرات KPI، ورسوم بيانية خفيفة باستخدام Pure SVG/CSS، وجداول بيانات تفاعلية.
   - إذا كانت 'landing_page' أو 'saas_app': برمج أقسام التحويل، النماذج، وجداول المقارنة التفاعلية.
4. حقن الأصول: إذا توفرت مصفوفة (embeddedAssets)، احقن روابط/بيانات الصور المرفوعة داخل وسوم <img> في الأقسام المخصصة لها بدقة.
5. تأكد من أن جميع التفاعلات البرمجية مكتوبة بـ JavaScript خالص خالٍ من الأخطاء المتزامنة ومضمّنة داخل وسم <script>.`;

    let userMessage = `المخطط الهيكلي المعتمد للتشييد:\n${JSON.stringify(blueprint, null, 2)}\n\nتوجيهات المستخدم الإضافية:\n${prompt || 'شيد الواجهة كاملة بأعلى معايير الجودة.'}`;
    
    if (embeddedAssets && embeddedAssets.length > 0) {
      userMessage += `\n\nأصول الصور الحقيقية المتوفرة للحقن المباشر في الواجهة:\n` + JSON.stringify(embeddedAssets);
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench - Universal Construction Engine"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.15
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
    return new Response(JSON.stringify({ error: `خطأ أثناء تشييد الواجهة: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

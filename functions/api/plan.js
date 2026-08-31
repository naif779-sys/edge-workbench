export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.OPENROUTER_API_KEY || env.PLANNER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح API غير معرّف في بيئة Cloudflare." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const payload = await request.json();
    const history = payload.history || [];

    const systemPrompt = `أنت كبير مهندسي الحلول المعمارية (Lead Enterprise Software Architect).
مهمتك: تحويل كافة متطلبات الحوار والصور إلى كائن JSON تخطيطي مجرد (Architectural Blueprint) لبناء صفحة ويب مستقلة متكاملة.

المعايير الهندسية للمخطط:
1. يجب أن يكون الناتج كائن JSON صالحاً بنسبة 100% دون أي نصوص تمهيدية أو وسوم ماركداون خارج الكائن.
2. دعم كامل للهوية العربية (RTL، خطوط Google Fonts مثل Tajawal/Cairo).
3. تفكيك الصفحة إلى:
   - meta: (العنوان، الوصف، نظام الألوان، الخطوط).
   - header: (الشعار، روابط التنقل، أزرار الدعوة للإجراء CTA).
   - sections: مصفوفة تشمل كل قسم بمكوناته الفرعية وتفاصيله الدقيقة (Hero, Features, Catalog/Grid, Specs, Reviews, FAQ, CTA).
   - interactivity: مصفوفة توضح الوظائف التفاعلية المطلوبة (سلة، أكورديون، عداد تنازلي، فلترة، نوافذ منبثقة).
   - footer: (روابط الوصول، حقوق الملكية، قنوات التواصل).`;

    const messages = [{ role: "system", content: systemPrompt }];

    // إضافة سياق المحادثة المكتمل
    for (const msg of history) {
      if (msg.role === "user") {
        messages.push({ role: "user", content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
      } else if (msg.role === "assistant") {
        messages.push({ role: "assistant", content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
      }
    }

    messages.push({
      role: "user",
      content: "قم بصياغة كائن الـ JSON Blueprint المعماري الكامل والنهائي الآن بناءً على كامل متطلبات المشروع المذكورة أعلاه."
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Architecture Planner"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: messages,
        temperature: 0.1,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "فشل توليد المخطط المعماري.";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status || 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ أثناء تخطيط الهيكل: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { code, error } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.BUILDER_API_KEY || env.PLANNER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (!code || !error) {
      return new Response(JSON.stringify({ error: "بيانات الكود أو الخطأ غير مكتملة." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت مهندس صيانة ومعمارية برمجيات خبير.
مهمتك: تصحيح الخطأ البرمجي المكتشف في كود صفحة المتجر (Single-File HTML).

الضوابط الصارمة:
1. أصلح الخلل المذكور فقط (سواء كان خطأ جافاسكريبت أو نقص في عناصر الـ DOM) دون تغيير الهيكل الجمالي أو ألوان المتجر.
2. أخرج الكود المصحح كاملاً بدءاً من <!DOCTYPE html> إلى </html> دون أي نصوص تمهيدية أو ماركداون.
3. حافظ على معايير Zero-Bloat ودعم اللغة العربية (RTL).`;

    const userMessage = `تقرير الخطأ التشغيلي المكتشف في المتصفح:\n${error}\n\nالكود المصدري الحالي المطلوب إصلاحه:\n${code}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench - Auto Fixer"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ معالج الإصلاح (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    let fixedCode = data.choices?.[0]?.message?.content || "";
    fixedCode = fixedCode.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    return new Response(JSON.stringify({ code: fixedCode }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ أثناء تنفيذ الإصلاح: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

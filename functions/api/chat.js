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
    const blueprint = payload.blueprint;
    const currentCode = payload.current_code;
    const refinementInstruction = payload.refinement_instruction;

    if (!blueprint && !currentCode) {
      return new Response(
        JSON.stringify({ error: "لا توجد بيانات مخطط أو كود حالي للتنفيذ." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const systemPrompt = `أنت كبير مهندسي الواجهات الرقمية والنظم التفاعلية (Principal Frontend Systems Engineer).
مهمتك: إنتاج أو تعديل صفحات الويب المستقلة تماماً (Single-File Standalone HTML5) فائقة الخفة والسرعة (Zero-bloat).

المعايير التقنية الصارمة:
1. ملف HTML5 متكامل يبدأ بـ <!DOCTYPE html> ويحتوي على Tailwind CDN وخطوط Google Fonts.
2. دعم كامل للغة العربية (dir="rtl" lang="ar") والتجاوب مع مختلف الشاشات.
3. استبدال الصور برسم SVG دلالي مدمج أو عناصر نائبة أنيقة بألوان متناسقة، دون أي روابط خارجية عشوائية.
4. كود Vanilla JavaScript تفاعلي لتشغيل القوائم، الأكورديون، والنماذج.
5. صيغة المخرجات: أرجع حصراً كود الـ HTML الصافي المعدل أو المُنشأ دون أي نصوص تمهيدية أو وسوم Markdown خارج الكود.`;

    let userPrompt = "";

    if (refinementInstruction && currentCode) {
      userPrompt = `إليك الكود المصدري الحالي لصفحة الويب:
\`\`\`html
${currentCode}
\`\`\`

المطلوب: تطبيق التعديل التالي بدقة متناهية مع الحفاظ على استقلالية وكفاءة الكود بالكامل:
"${refinementInstruction}"`;
    } else {
      userPrompt = `قم بتشييد صفحة الويب الكاملة بناءً على هذا المخطط المعماري المعتمد:\n\n${typeof blueprint === 'string' ? blueprint : JSON.stringify(blueprint)}`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Implementer & Refiner"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 3500,
        temperature: 0.2
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "فشل معالجة الطلب من المزود.";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status || 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    const choice = data.choices && data.choices[0];
    let rawContent = choice?.message?.content;

    if (!rawContent) {
      const fallbackReason = choice?.finish_reason || "استجابة فارغة من النموذج";
      return new Response(JSON.stringify({ error: `لم يُرجع النموذج أي كود صالح (السبب: ${fallbackReason}).` }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    // تنظيف وسوم الماركداون بأمان
    let code = String(rawContent)
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return new Response(JSON.stringify({ code: code }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ في المعالج: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

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
    const currentCode = payload.current_code;
    const instruction = payload.refinement_instruction;

    if (!currentCode || !instruction) {
      return new Response(
        JSON.stringify({ error: "يجب توفير الكود الحالي وتوجيه التعديل المطلوب." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const systemPrompt = `أنت كبير مهندسي الواجهات وتعديل الأكواد المستقلة (Staff Code Refinement Engineer).
مهمتك: تطبيق التعديل المطلوب على كود صفحة الويب الحالية بدقة متناهية ودون حذف أي قسم موجود.

القواعد الهندسية الصارمة للتعديل:
1. ممنوع الاختصار نهائياً (Zero-Truncation): لا تكتب أي تعليقات مثل "<!-- باقي الأقسام دون تغيير -->" أو "..."؛ أرجع الكود المصدري المستقل كاملاً من <!DOCTYPE html> إلى </html>.
2. دعم التفاعل البرمجي الحقيقي: إذا طُلب عداد تنازلي، سلة، فلترة، أو نوافذ منبثقة، يجب كتابة كود جافاسكربت التنفيذي الفعلي (مثل setInterval أو Event Listeners) ليعمل مباشرة في المتصفح.
3. الحفاظ على هوية Tailwind واللغة العربية (dir="rtl").
4. المخرجات: أرجع فقط كود الـ HTML المعدل الصافي بدون أي نصوص تمهيدية أو وسوم ماركداون خارج الكود.`;

    const userPrompt = `الكود الحالي لصفحة الويب:
\`\`\`html
${currentCode}
\`\`\`

التعديل المطلوب تطبيقه:
"${instruction}"

قم بتطبيق التعديل وأرجع ملف الـ HTML الكامل والمستقل الآن.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Refiner"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "فشل تطبيق التعديل.";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status || 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    const choice = data.choices && data.choices[0];
    let rawContent = choice?.message?.content;

    if (!rawContent) {
      return new Response(JSON.stringify({ error: "أعاد النموذج استجابة فارغة أثناء التعديل." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    let cleanCode = String(rawContent)
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return new Response(JSON.stringify({ code: cleanCode }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ في معالج التعديل: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

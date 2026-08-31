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

    if (!blueprint) {
      return new Response(
        JSON.stringify({ error: "لم يتم تمرير المخطط الهيكلي (Blueprint) للتنفيذ." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const systemPrompt = `أنت كبير مهندسي الواجهات الرقمية والنظم التفاعلية (Principal Frontend Systems Engineer).
مهمتك: استلام المخطط المعماري (JSON Blueprint) وتشييد صفحة ويب كاملة، حية، خفيفة (Zero-bloat)، ومستقلة بالكامل (Single-File Standalone HTML5).

المعايير التقنية الصارمة:
1. استقلالية تامة: ملف HTML5 متكامل يحتوي على <head> و <body> و <style> و <script> دون أي اعتماديات خارجية تتطلب بناء (No build tools).
2. المكتبات المعتمدة:
   - تضمين Tailwind CSS عبر CDN: <script src="https://cdn.tailwindcss.com"></script>
   - تضمين الخطوط المحددة في المخطط عبر Google Fonts.
3. التجاوب والعربية: دعم كامل لاتجاه الكتابة العربي (dir="rtl" lang="ar") وتجاوب مثالي مع كافة الشاشات واللمس.
4. سياسة الوسائط والصور: يمنع منعاً باتاً وضع روابط خارجية عشوائية للصور. بدلاً من ذلك، قم بتصميم رسومات SVG دلالية مدمجة، أو عناصر نائبة أنيقة بألوان متناسقة مع الهوية البصرية.
5. التفاعلية (Interactivity): كتابة كود Vanilla JavaScript تفاعلي لتشغيل القائمة المتنقلة، الأكورديون (FAQ)، النماذج، والتمرير السلس.
6. صيغة المخرجات: أرجع حصراً كود الـ HTML الصافي دون أي نصوص تمهيدية أو علامات Markdown خارج الكود.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Universal Implementer"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `قم بتشييد صفحة الويب الكاملة بناءً على هذا المخطط المعماري المعتمد:\n\n${typeof blueprint === 'string' ? blueprint : JSON.stringify(blueprint, null, 2)}` }
        ]
      })
    });

    const data = await response.json();
    let code = data.choices ? data.choices[0].message.content : (data.error || "");

    // تنظيف وسوم Markdown إن وُجدت لضمان عرض HTML نقي داخل الـ Iframe
    if (code.startsWith("```html")) {
      code = code.replace(/^```html\n/, "").replace(/\n```$/, "");
    } else if (code.startsWith("```")) {
      code = code.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    return new Response(JSON.stringify({ code: code }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ في معالج التشييد البرمجي: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

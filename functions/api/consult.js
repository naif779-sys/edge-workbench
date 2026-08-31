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
    const userMessage = payload.message || "";
    const images = payload.images || [];
    const history = payload.history || [];

    const systemPrompt = `أنت كبير المستشارين التقنيين والمعماريين للأنظمة الرقمية (Principal Solutions Architect).
مهمتك: مناقشة متطلبات مشاريع الويب مع العميل بدقة هندسية عالية، وتحليل أي صور أو تصاميم مرفوعة لاستخراج الهيكل والوظائف المطلوبة.

المعايير الصارمة لإجاباتك:
1. الالتزام باللغة العربية الفصحى ونبرة مهنية حازمة ومباشرة بلا مجاملات أو حشو.
2. استخدام تنسيق Markdown عالي التنظيم (عناوين واضحة، جداول مقارنة، وقوائم نقطية).
3. تقديم اقتراحات تقنية واقعية، الاستفسار عن محددات النطاق وبوابات الدفع والشحن والعملة، وحسم الخيارات قبل الانتقال للبناء.
4. عدم كتابة أكواد برمجية كاملة هنا؛ دورك هو الاستشارة والتوجيه المعماري حتى يطلب المستخدم الانتقال للمخطط.`;

    const messages = [{ role: "system", content: systemPrompt }];

    // إضافة سجل المحادثة السابق (حتى 6 رسائل لتوفير التوكنز وضمان السياق)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === "user") {
        messages.push({ role: "user", content: msg.content || "مرفق مدخلات" });
      } else if (msg.role === "assistant") {
        messages.push({ role: "assistant", content: msg.content });
      }
    }

    // بناء رسالة المستخدم الحالية مع دعم الصور (Multimodal Vision)
    const userContent = [];
    if (userMessage) {
      userContent.push({ type: "text", text: userMessage });
    }

    for (const img of images) {
      const base64Data = typeof img === "string" ? img : img.base64;
      if (base64Data) {
        userContent.push({
          type: "image_url",
          image_url: { url: base64Data }
        });
      }
    }

    if (userContent.length > 0) {
      messages.push({ role: "user", content: userContent });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Consultant Engine"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: messages,
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "فشل الاتصال بالمزود.";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status || 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    const reply = data.choices?.[0]?.message?.content || "تعذر استلام رد صالح من المستشار.";

    return new Response(JSON.stringify({ reply: reply }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ أثناء الاستشارة: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

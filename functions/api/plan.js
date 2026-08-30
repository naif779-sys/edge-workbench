export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح OPENROUTER_API_KEY غير معرّف في بيئة Cloudflare." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const payload = await request.json();
    const userPrompt = payload.prompt || "";

    if (!userPrompt) {
      return new Response(
        JSON.stringify({ error: "يرجى إرسال متطلبات المشروع في حقل prompt." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const systemPrompt = `أنت المخطط المعماري للواجهات وتجربة المستخدم (Planner).
مهمتك: تحليل متطلبات المستخدم بدقة وتحويلها حصراً إلى مخطط هيكلي بصيغة JSON مطابق للمعايير الهندسية التالية بدون أي نص أو مقدمات خارج كائن الـ JSON:

{
  "project_name": "اسم المشروع",
  "direction": "rtl",
  "design_system": {
    "primary_color": "slate-900",
    "accent_color": "indigo-600",
    "font_family": "Tajawal, sans-serif"
  },
  "sections": [
    {
      "id": "hero",
      "type": "hero_section",
      "title": "العنوان الرئيسي",
      "description": "الوصف التعريفي",
      "cta": [{"text": "نص الزر", "action": "رابط أو وظيفة"}]
    }
  ],
  "interactive_logic": ["dark_mode", "mobile_menu"]
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Planner"
      },
      body: JSON.stringify({
        model: "minimax/minimax-01",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const responseData = await response.text();

    return new Response(responseData, {
      status: response.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ في معالج التخطيط: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

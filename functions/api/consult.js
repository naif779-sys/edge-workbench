export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, images = [], history = [] } = body;
    const headerKey = request.headers.get("X-Custom-API-Key");
    const apiKey = headerKey || env.OPENROUTER_API_KEY || env.PLANNER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `أنت استشاري معماري تقني أول ورئيس مهندسي واجهات الويب (Senior Principal Web Architect).
مهمتك: فحص وتحليل متطلبات المستخدم أو الصور المرفقة، تقديم استشارة هندسية احترافية، وصياغة المخطط الهيكلي البرمجي المجرد (JSON Blueprint).

الضوابط الصارمة:
1. حدد بدقة النمط المعماري (archetype) من بين:
   - 'ecommerce': متجر ومنتجات وسلة شراء.
   - 'dashboard': لوحة تحكم وإحصائيات وجداول بيانات.
   - 'landing_page': صفحة هبوط ترويجية ونماذج تحويل.
   - 'portfolio': معرض أعمال أو موقع تعريفي.
   - 'saas_app': واجهة تطبيق سحابي تفاعلي.
2. قدم تحليلاً معمارياً حازماً (advice) بالعربية يشمل: الهوية البصرية، منطق التفاعل، وتجربة المستخدم.
3. يجب أن يكون الإخراج حصراً كائن JSON نظيف تماماً وصالح للقراءة وفق هذا الهيكل:
{
  "archetype": "ecommerce | dashboard | landing_page | portfolio | saas_app",
  "advice": "الاستشارة والتحليل المعماري بالعربية",
  "blueprint": {
    "site_name": "اسم المشروع",
    "site_type": "ecommerce | dashboard | landing_page | portfolio | saas_app",
    "theme": {
      "primary_color": "اللون الأساسي المتناسق",
      "mode": "dark | light",
      "font": "Tajawal"
    },
    "sections": [
      {
        "id": "معرف فريد للقسم",
        "type": "hero | metrics | data_table | products_grid | cta | features",
        "title": "عنوان القسم بالعربية",
        "description": "وصف محتوى القسم",
        "components": ["المكونات الداخلية"]
      }
    ],
    "interactive_features": ["قائمة المكونات والتفاعلات المطلوبة بالجافاسكريبت الخالص"]
  }
}`;

    const content = [];
    if (prompt) {
      content.push({ type: "text", text: `طلب المستخدم وسياق النقاش المعماري:\n${prompt}` });
    }

    if (images && images.length > 0) {
      for (const imgBase64 of images) {
        content.push({
          type: "image_url",
          image_url: { url: imgBase64 }
        });
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: content }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench - Architecture Consultant"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ المستشار المعماري (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    const cleanJson = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ استشارة المعمارية: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

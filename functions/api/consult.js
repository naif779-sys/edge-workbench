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
مهمتك: الفرز البصري الدقيق، تقديم الاستشارة الهندسية، وتوليد المخطط الهيكلي البرمجي (JSON).

خوارزمية الفرز البصري الصارمة (Vision Triage):
1. افحص كل صورة مرفوعة وصنف دورها بدقة:
   - "reference_layout": لقطات شاشات لمواقع أو تطبيقات (تُستخدم فقط لاستلهام توزيع الكتل وتجربة المستخدم UX دون استنساخ أي علامات تجارية أو محتوى محمي).
   - "content_asset": صور المنتجات أو الخدمات الحقيقية للمستخدم (مثل ساعات، عطور، عقارات) وتُخصص للحقن المباشر في عناصر الواجهة.
2. استنتج طبيعة ونطاق المشروع تلقائياً (Project Domain & Archetype) من خلال دمج الهيكل المرجعي مع الأصول الحقيقية المرفقة.
3. قدم استشارة معمارية واضحة (advice) بالعربية تبرز الهوية الجديدة وقرارات التصميم.
4. اطرح سؤالاً استباقياً واحداً (clarification_question) عند وجود خيارات متعددة لتوزيع المحتوى.

يجب أن يكون الرد حصراً بصيغة JSON نظيفة تماماً وفق هذا الهيكل:
{
  "archetype": "ecommerce | dashboard | landing_page | portfolio | saas_app",
  "project_domain": "طبيعة ونشاط المشروع المستنتج بدقة",
  "vision_triage": [
    { "image_index": 0, "role": "reference_layout | content_asset", "description": "وصف وظيفة الصورة" }
  ],
  "advice": "الاستشارة المعمارية والتحليل الهندسي بالعربية",
  "clarification_question": "سؤال استيضاحي توجيهي لتحسين التجربة",
  "blueprint": {
    "site_name": "اسم أو هوية المشروع",
    "site_type": "ecommerce | dashboard | landing_page | portfolio | saas_app",
    "theme": {
      "primary_color": "اللون الأساسي المتناسق",
      "mode": "dark | light",
      "font": "Tajawal"
    },
    "sections": [
      {
        "id": "معرف فريد للقسم",
        "type": "hero | catalog | features | stats | cta",
        "title": "عنوان القسم بالعربية",
        "description": "تفاصيل المحتوى",
        "inject_asset_indices": [1]
      }
    ],
    "interactive_features": ["قائمة المكونات التفاعلية المطلوبة بلغة JavaScript خالصة"]
  }
}`;

    const content = [];
    if (prompt) {
      content.push({ type: "text", text: `طلب المستخدم وسياق المشروع:\n${prompt}` });
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
        "X-Title": "Edge Workbench - Vision Triage Consultant"
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

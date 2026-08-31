export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.PLANNER_API_KEY || env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح API غير معرّف في بيئة Cloudflare." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const payload = await request.json();
    const history = payload.history || [];
    const image = payload.image || null;
    const directPrompt = payload.prompt || "";

    if (history.length === 0 && !directPrompt && !image) {
      return new Response(
        JSON.stringify({ error: "لا توجد مدخلات لتوليد المخطط. يرجى توضيح متطلبات المشروع أولاً." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const systemPrompt = `أنت كبير مهندسي تجربة المستخدم والمعمارية الرقمية (Principal Universal UI/UX Systems Architect).
مهمتك: تحليل متطلبات أي مشروع رقمي وسجل النقاش والصور المرفقة، ثم توليد مخطط معماري مجرد فائق الدقة (Domain-Agnostic JSON Blueprint).

القواعد المعمارية الصارمة:
1. التجريد والشمولية: صياغة هيكل ملائم لنوع النشاط المحدد (متجر، عيادة، سوبرماركت، معرض أثاث، SaaS، portfolio).
2. سياسة الصور: يمنع منعاً باتاً اختراع أو كتابة روابط صور خارجية عشوائية (مثل unsplash). استخدم فقط كائنات حجز المساحات الدلالية (asset_slots) مع تحديد النسبة (aspect_ratio) والوصف.
3. دعم كامل للغة العربية (RTL) ومعايير التصميم الحديثة الخفيفة (Zero-bloat).
4. المخرجات يجب أن تكون حصراً كائن JSON صالح وخالٍ من أي نصوص أو شروحات إضافية.

الهيكل المعياري المطلوب:
{
  "project_metadata": {
    "name": "اسم المشروع",
    "domain_type": "نوع النشاط",
    "direction": "rtl",
    "language": "ar"
  },
  "design_tokens": {
    "palette": {
      "background": "slate-950",
      "surface": "slate-900",
      "primary": "indigo-600",
      "accent": "amber-500",
      "text_main": "slate-100",
      "text_muted": "slate-400",
      "border": "slate-800"
    },
    "typography": {
      "font_family": "Tajawal, sans-serif",
      "headings_weight": "font-bold"
    },
    "layout_density": "spacious"
  },
  "layout_tree": {
    "header": {
      "brand_title": "العنوان",
      "navigation_links": [{"label": "الرئيسية", "target": "#hero"}],
      "actions": [{"label": "تواصل معنا", "target": "#contact", "variant": "primary"}]
    },
    "sections": [
      {
        "id": "hero",
        "primitive_type": "split_hero",
        "title": "عنوان بارز",
        "subtitle": "وصف تسويقي وهندسي محكم",
        "cta_group": [{"label": "ابدأ الآن", "target": "#action", "variant": "primary"}],
        "media_slot": {"type": "abstract_svg_illustration", "aspect_ratio": "16/9", "description": "وصف المشهد"}
      }
    ],
    "footer": {
      "summary": "ملخص المشروع",
      "copyright": "جميع الحقوق محفوظة",
      "links": [{"label": "الشروط", "target": "#"}]
    }
  },
  "interactive_capabilities": [
    "mobile_drawer",
    "smooth_navigation",
    "lead_capture_modal"
  ]
}`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (history.length > 0) {
      for (const item of history) {
        if (item.image) {
          messages.push({
            role: item.role === "assistant" ? "assistant" : "user",
            content: [
              { type: "text", text: item.content || "تصميم مرجعي" },
              { type: "image_url", image_url: { url: item.image } }
            ]
          });
        } else {
          messages.push({
            role: item.role === "assistant" ? "assistant" : "user",
            content: item.content || ""
          });
        }
      }
    } else if (directPrompt) {
      messages.push({ role: "user", content: directPrompt });
    }

    messages.push({
      role: "user",
      content: "صِغ الآن كائن الـ JSON Blueprint المعماري المكتمل بناءً على المعايير التجريدية الصارمة."
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
        model: "anthropic/claude-sonnet-5",
        messages: messages,
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

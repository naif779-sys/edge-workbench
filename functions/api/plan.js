export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.PLANNER_API_KEY || env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح PLANNER_API_KEY غير معرّف في بيئة Cloudflare." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const payload = await request.json();
    const history = payload.history || [];
    const image = payload.image || null;
    const directPrompt = payload.prompt || "";

    if (history.length === 0 && !directPrompt && !image) {
      return new Response(
        JSON.stringify({ error: "لا توجد متطلبات أو سجل محادثة لتوليد المخطط. يرجى كتابة متطلبات المشروع أولاً." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const systemPrompt = `أنت كبير مهندسي تجربة المستخدم والمخطط المعماري للواجهات الرقمية (Principal UI/UX Systems Architect).
مهمتك: مراجعة كامل الحوار والمتطلبات السابقة وتحليل أي صور مرفقة، ثم صياغة مخطط معماري متكامل (JSON Blueprint) فائق الجودة، حديث، خفيف (Zero-bloat)، ويدعم اللغة العربية (RTL).

يجب أن تكون مخرجاتك حصراً كائن JSON صافٍ مطابق للهيكل التالي دون أي مقدمات أو علامات Markdown:

{
  "project_name": "اسم المشروع",
  "direction": "rtl",
  "theme": {
    "background": "slate-950",
    "surface": "slate-900",
    "primary": "indigo-600",
    "accent": "amber-500",
    "text_primary": "slate-100",
    "text_secondary": "slate-400",
    "font_family": "Tajawal, sans-serif"
  },
  "layout": {
    "header": {
      "brand_name": "اسم العلامة",
      "navigation": [{"label": "الرئيسية", "href": "#hero"}]
    },
    "sections": [
      {
        "id": "hero",
        "type": "hero_section",
        "title": "عنوان رئيسي جذاب وواضح",
        "subtitle": "نص تسويقي ومعماري مركز",
        "cta": [
          {"text": "ابدأ الآن", "action": "#cta", "style": "primary"}
        ]
      }
    ],
    "footer": {
      "copyright": "جميع الحقوق محفوظة",
      "links": [{"label": "سياسة الخصوصية", "href": "#"}]
    }
  },
  "interactive_specs": [
    "mobile_drawer_toggle",
    "smooth_scroll",
    "modal_form_submission"
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
      content: "بناءً على كامل الحوار والتفاصيل السابقة، قم الآن بتوليد كائن الـ JSON المعماري النهائي للواجهة."
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
      JSON.stringify({ error: `خطأ في معالج التخطيط المعماري: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

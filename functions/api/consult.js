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
    const message = payload.message || "";
    const images = payload.images || [];
    const singleImage = payload.image || null;
    const history = payload.history || [];

    const systemPrompt = `أنت كبير مهندسي النظم وتجربة المستخدم (Principal Universal UI/UX Systems Architect).
مهمتك: تقديم استشارات معمارية تقنية دقيقة ومباشرة، وتحليل الصور المرفقة لأي قطاع تجاري (ساعات فاخرة، عيادات، سوبرماركت، معارض أثاث، SaaS، وغيرها).

القواعد الحاكمة للإجابة:
1. ناقش متطلبات العميل باحترافية وهندسة معمارية واضحة، وركز على معايير الكفاءة (Zero-bloat) والتصميم المتجاوب الداعم للغة العربية (RTL).
2. عند تحليل الصور المرفقة: استخرج لوحة الألوان، التسلسل الهرمي البصري، ونقاط القوة لدمجها في التخطيط.
3. التزم باللغة العربية الفصحى ونبرة مهنية مباشرة، واستخدم الجداول والنقاط المنظمة لتسهيل القراءة.`;

    const messages = [{ role: "system", content: systemPrompt }];

    // إضافة سجل الحوار السابق
    if (history.length > 0) {
      for (const item of history.slice(0, -1)) {
        if (item.images && item.images.length > 0) {
          const content = [{ type: "text", text: item.content || "مرفقات مرجعية" }];
          item.images.forEach(img => {
            content.push({
              type: "image_url",
              image_url: { url: img.base64 || img }
            });
          });
          messages.push({ role: item.role === "assistant" ? "assistant" : "user", content: content });
        } else if (item.image) {
          messages.push({
            role: item.role === "assistant" ? "assistant" : "user",
            content: [
              { type: "text", text: item.content || "مرفق مرجعي" },
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
    }

    // بناء الرسالة الحالية مع مصفوفة الصور
    const currentImages = images.length > 0 ? images : (singleImage ? [{ base64: singleImage }] : []);
    
    if (currentImages.length > 0) {
      const userContent = [{ type: "text", text: message || "يرجى تحليل التصاميم والصور المرفقة معمارياً." }];
      currentImages.forEach(img => {
        userContent.push({
          type: "image_url",
          image_url: { url: img.base64 || img }
        });
      });
      messages.push({ role: "user", content: userContent });
    } else {
      messages.push({ role: "user", content: message });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench Consultant"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: messages,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || data.error || "تعذر الحصول على استجابة من المستشار.";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    const reply = data.choices ? data.choices[0].message.content : "";

    return new Response(JSON.stringify({ reply: reply }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `خطأ في معالج الاستشارة: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

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
    const { message, image, history = [] } = payload;

    const systemPrompt = `أنت كبير مهندسي تجربة المستخدم والمعماري الاستشاري (Principal UI/UX Systems Architect).
مهمتك: مناقشة متطلبات العميل، تحليل أي تصاميم أو لقطات شاشة مرفقة بدقة معمارية، تقديم استشارات تصميمية خفيفة (Zero-bloat) وعصرية تدعم العربية (RTL)، وتوضيح أي غموض في الهيكل قبل مرحلة صياغة المخطط الهندسي.`;

    const messages = [{ role: "system", content: systemPrompt }];

    for (const item of history.slice(0, -1)) {
      messages.push({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content || ""
      });
    }

    if (image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message || "قم بتحليل هذا التصميم معمارياً واقتراح الهيكل الأنسب للواجهة." },
          { type: "image_url", image_url: { url: image } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: message || ""
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Workbench UI Consultation"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || (data.error ? JSON.stringify(data.error) : "لم يتم استلام رد من النموذج.");

    return new Response(JSON.stringify({ reply }), {
      status: response.status,
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

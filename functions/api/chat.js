export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح OPENROUTER_API_KEY غير معرّف في إعدادات البيئة السحابية." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const payload = await request.json();
    const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];

    const systemPrompt = {
      role: "system",
      content: "أنت المساعد البرمجي الذكي Claude Sonnet 5 المطور من قِبل Anthropic والمشغّل عبر OpenRouter داخل منصة Edge Agentic Workbench. التزم باللغة العربية الفصحى، الدقة الهندسية، والأسلوب المباشر. عند طلب تنفيذ أكواد جافاسكريبت، استخدم أداة run_javascript المتاحة لك."
    };

    const tools = [
      {
        type: "function",
        function: {
          name: "run_javascript",
          description: "تنفيذ كود JavaScript اختباري داخل بيئة المعاينة الحية وإرجاع النتيجة.",
          parameters: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "كود JavaScript المراد تنفيذه."
              }
            },
            required: ["code"]
          }
        }
      }
    ];

    const bodyData = {
      model: "anthropic/claude-sonnet-5",
      messages: [systemPrompt, ...incomingMessages],
      tools: tools,
      tool_choice: "auto"
    };

    if (payload.reasoning_effort) {
      bodyData.reasoning = { effort: payload.reasoning_effort };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edge-workbench.pages.dev",
        "X-Title": "Edge Agentic Workbench"
      },
      body: JSON.stringify(bodyData)
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
      JSON.stringify({ error: `خطأ في المعالجة السحابية: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

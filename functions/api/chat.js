export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { blueprint } = body;

    const apiKey = env.BUILDER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح BUILDER_API_KEY غير متوفر في متغيرات البيئة." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `You are a Master Frontend Engineer.
Generate a complete, fully functional, zero-bloat Single-File HTML/Tailwind/JS web application based on the provided JSON Blueprint.
Rules:
1. Return ONLY valid HTML inside \`\`\`html \`\`\` markdown code block.
2. Zero external dependencies other than Tailwind CDN and standard Google Fonts.
3. Full RTL (Arabic) support with modern typography and interactive vanilla JavaScript.
4. Seamlessly integrate and display real asset image URLs (e.g. from https://njagentic.online/assets/...).
5. Ensure mobile and tablet responsive layouts without floating obstructive drawers/sidebars.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://njagentic.online",
        "X-Title": "Edge Workbench - Builder"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: typeof blueprint === 'string' ? blueprint : JSON.stringify(blueprint) }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ من مزود البناء (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const match = rawContent.match(/```html\s*([\s\S]*?)\s*```/) || rawContent.match(/```\s*([\s\S]*?)\s*```/);
    const cleanedCode = match ? match[1].trim() : rawContent.trim();

    return new Response(JSON.stringify({
      code: cleanedCode,
      choices: [{ message: { content: cleanedCode } }]
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في محرك التشييد: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

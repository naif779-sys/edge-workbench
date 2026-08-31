export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { history, images } = body;

    const apiKey = env.PLANNER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح PLANNER_API_KEY غير متوفر في متغيرات البيئة." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `You are a Principal Software Architect.
Transform user requirements and consultation history into a structured architectural JSON Blueprint.
The JSON Blueprint must define:
- metadata (title, direction: "rtl", theme, target)
- sections (header, hero, catalog, features, specs, footer)
- component_specs (layout, styling classes, responsive rules)
- assets (exact image URLs provided by the user, local uploaded URLs from https://njagentic.online/assets/...)
- interactive_state (state management, shopping cart logic)

Return ONLY pure valid JSON within a \`\`\`json \`\`\` block.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://njagentic.online",
        "X-Title": "Edge Workbench - Planner"
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ history, images }) }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في محرك التخطيط: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

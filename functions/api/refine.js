export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { current_code, refinement_instruction } = body;

    const apiKey = env.REFINE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح REFINE_API_KEY غير متوفر في متغيرات البيئة." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const systemPrompt = `You are a Principal Frontend Architect.
You will be provided with an existing standalone Single-File HTML/Tailwind/JS application and a specific refinement instruction.
Your task is to modify the code strictly according to the instruction and return the COMPLETE updated HTML document.

Rules:
1. Return ONLY valid, complete HTML inside a standard \`\`\`html \`\`\` markdown code block.
2. Do not omit any code, logic, or styles. Do not use placeholders.
3. Maintain zero-bloat, responsive design, RTL layout support, and preserve real asset image URLs.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://njagentic.online",
        "X-Title": "Edge Workbench - Refiner"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Existing Code:\n\`\`\`html\n${current_code}\n\`\`\`\n\nRefinement Request:\n${refinement_instruction}` }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `خطأ من مزود التعديل (${response.status}): ${errText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const match = rawContent.match(/```html\s*([\s\S]*?)\s*```/) || rawContent.match(/```\s*([\s\S]*?)\s*```/);
    const cleanedCode = match ? match[1].trim() : rawContent.trim();

    return new Response(JSON.stringify({ code: cleanedCode }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `خطأ في محرك التعديل: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

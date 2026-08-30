const AppState = {
  messages: [],
  reasoningEffort: 'medium',
  activeSkillId: 'default',
  skills: [
    {
      id: 'default',
      name: 'مهندس استشاري شامل',
      system_prompt: 'أنت استشاري معماري تقني أول. ناقش الخيارات استراتيجياً، ركز على الأمان، كفاءة الموارد، واعتمد أسلوباً دقيقاً ومباشراً.',
      active: true
    },
    {
      id: 'code-audit',
      name: 'مدقق أمني ومراجعة أكواد',
      system_prompt: 'أنت خبير أمني وتطويري. ركز على فحص الثغرات، تدقيق الأداء، والتأكد من توافق الأكواد مع معايير الإنتاج الفعلي.',
      active: false
    }
  ],
  tools: [
    {
      id: 'eval_js',
      enabled: true,
      execution: { type: 'client', requires_hitl: false },
      function: {
        name: 'run_javascript',
        description: 'تنفيذ كود جافاسكريبت آمن في المتصفح للعمليات الحسابية أو معالجة البيانات',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'كود الجافاسكريبت المراد تشغيله' }
          },
          required: ['code']
        }
      }
    }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderSkills();
  renderTools();
  initEventListeners();
});

function initEventListeners() {
  const chatForm = document.getElementById('chatForm');
  const promptInput = document.getElementById('promptInput');
  const reasoningSelect = document.getElementById('reasoningEffort');
  const toggleSandboxBtn = document.getElementById('toggleSandboxBtn');
  const closeSandboxBtn = document.getElementById('closeSandboxBtn');
  const btnNewSession = document.getElementById('btnNewSession');

  reasoningSelect.value = AppState.reasoningEffort;
  reasoningSelect.addEventListener('change', (e) => {
    AppState.reasoningEffort = e.target.value;
    saveToStorage();
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    promptInput.value = '';
    await handleUserMessage(prompt);
  });

  toggleSandboxBtn.addEventListener('click', () => {
    document.getElementById('sandboxDrawer').classList.toggle('hidden');
  });

  closeSandboxBtn.addEventListener('click', () => {
    document.getElementById('sandboxDrawer').classList.add('hidden');
  });

  btnNewSession.addEventListener('click', () => {
    if (confirm('هل تريد بدء جلسة جديدة ومسح سجل الحوار الحالي؟')) {
      AppState.messages = [];
      document.getElementById('chatStream').innerHTML = '';
      saveToStorage();
    }
  });
}

async function handleUserMessage(userText) {
  appendMessage('user', userText);
  AppState.messages.push({ role: 'user', content: userText });

  const activeSkill = AppState.skills.find(s => s.id === AppState.activeSkillId) || AppState.skills[0];
  const activeTools = AppState.tools
    .filter(t => t.enabled)
    .map(t => ({ type: 'function', function: t.function }));

  const apiMessages = [
    { role: 'system', content: activeSkill.system_prompt },
    ...AppState.messages
  ];

  const payload = {
    messages: apiMessages,
    tools: activeTools,
    reasoningEffort: AppState.reasoningEffort
  };

  const assistantBubble = createStreamingBubble();
  document.getElementById('sessionStatus').textContent = 'جارٍ التوليد...';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'خطأ في معالجة الطلب');
    }

    await processSSEStream(response.body, assistantBubble);
  } catch (error) {
    assistantBubble.contentContainer.innerHTML = `<span class="text-rose-400">خطأ: ${error.message}</span>`;
  } finally {
    document.getElementById('sessionStatus').textContent = 'جاهز';
    saveToStorage();
  }
}

async function processSSEStream(stream, bubble) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullContent = '';
  let fullReasoning = '';
  let toolCallBuffer = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      if (trimmed === 'data: [DONE]') continue;

      try {
        const json = JSON.parse(trimmed.replace(/^data:\s*/, ''));
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.reasoning || delta.thinking) {
          fullReasoning += (delta.reasoning || delta.thinking);
          bubble.reasoningContainer.classList.remove('hidden');
          bubble.reasoningText.textContent = fullReasoning;
        }

        if (delta.content) {
          fullContent += delta.content;
          bubble.contentContainer.innerHTML = formatMarkdown(fullContent);
        }

        if (delta.tool_calls) {
          if (!toolCallBuffer) toolCallBuffer = delta.tool_calls[0];
          else {
            toolCallBuffer.function.arguments += delta.tool_calls[0].function.arguments || '';
          }
        }
      } catch (e) {}
    }
  }

  AppState.messages.push({ role: 'assistant', content: fullContent });

  if (toolCallBuffer) {
    await handleToolExecution(toolCallBuffer);
  }
}

async function handleToolExecution(toolCall) {
  const toolName = toolCall.function.name;
  const toolDef = AppState.tools.find(t => t.function.name === toolName);

  if (!toolDef) return;

  let args = {};
  try { args = JSON.parse(toolCall.function.arguments); } catch (e) {}

  appendToolExecutionUI(toolName, args, async () => {
    let result = '';
    if (toolDef.execution.type === 'client' && toolName === 'run_javascript') {
      try {
        result = JSON.stringify(eval(args.code));
      } catch (err) {
        result = `Execution Error: ${err.message}`;
      }
    }

    AppState.messages.push({
      role: 'tool',
      tool_call_id: toolCall.id || 'call_1',
      name: toolName,
      content: result
    });

    await handleUserMessage("تم تنفيذ الأداة، أكمل التحليل بناءً على النتيجة.");
  });
}

function createStreamingBubble() {
  const streamDiv = document.getElementById('chatStream');
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-2 max-w-4xl mx-auto';

  container.innerHTML = `
    <div class="reasoning-box hidden bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono">
      <div class="font-bold text-slate-500 mb-1 flex items-center gap-1.5">
        <span>عملية التفكير والتحليل الداخلي</span>
      </div>
      <div class="reasoning-text whitespace-pre-wrap leading-relaxed"></div>
    </div>
    <div class="content-box bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-slate-200 text-sm leading-relaxed"></div>
  `;

  streamDiv.appendChild(container);
  streamDiv.scrollTop = streamDiv.scrollHeight;

  return {
    reasoningContainer: container.querySelector('.reasoning-box'),
    reasoningText: container.querySelector('.reasoning-text'),
    contentContainer: container.querySelector('.content-box')
  };
}

function appendMessage(role, text) {
  const streamDiv = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.className = `max-w-4xl mx-auto flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
  
  if (role === 'user') {
    div.innerHTML = `<div class="bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm max-w-2xl leading-relaxed whitespace-pre-wrap">${text}</div>`;
  }
  streamDiv.appendChild(div);
  streamDiv.scrollTop = streamDiv.scrollHeight;
}

function appendToolExecutionUI(name, args, onConfirm) {
  const streamDiv = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.className = 'max-w-4xl mx-auto bg-slate-900 border border-amber-500/40 rounded-lg p-3 text-xs space-y-2';
  div.innerHTML = `
    <div class="flex items-center justify-between text-amber-400 font-semibold">
      <span>طلب استدعاء أداة: ${name}</span>
      <button class="btn-execute bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1 rounded transition">اعتماد وتشغيل</button>
    </div>
    <pre class="bg-slate-950 p-2 rounded text-slate-300 text-[11px]">${JSON.stringify(args, null, 2)}</pre>
  `;
  div.querySelector('.btn-execute').addEventListener('click', onConfirm);
  streamDiv.appendChild(div);
  streamDiv.scrollTop = streamDiv.scrollHeight;
}

function formatMarkdown(text) {
  return text
    .replace(/```(html|htm)([\s\S]*?)```/g, (match, lang, code) => {
      window.latestHtmlArtifact = code.trim();
      return `<div class="my-3 border border-slate-800 rounded-lg overflow-hidden">
                <div class="bg-slate-800 px-3 py-1.5 flex justify-between items-center text-xs text-slate-300">
                  <span>${lang}</span>
                  <button onclick="renderSandbox(window.latestHtmlArtifact)" class="text-indigo-400 hover:text-indigo-300">معاينة مباشرة في الـ Sandbox</button>
                </div>
                <pre class="p-3 bg-slate-950 text-slate-200 overflow-x-auto"><code>${escapeHtml(code.trim())}</code></pre>
              </div>`;
    })
    .replace(/```([\s\S]*?)```/g, '<pre class="my-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 overflow-x-auto"><code>$1</code></pre>')
    .replace(/\n/g, '<br>');
}

function renderSandbox(htmlCode) {
  const frame = document.getElementById('sandboxFrame');
  document.getElementById('sandboxDrawer').classList.remove('hidden');
  frame.srcdoc = htmlCode;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderSkills() {
  const list = document.getElementById('skillsList');
  list.innerHTML = AppState.skills.map(s => `
    <div class="p-2 rounded cursor-pointer border ${s.id === AppState.activeSkillId ? 'bg-indigo-950/50 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}" onclick="selectSkill('${s.id}')">
      <div class="text-xs font-semibold text-slate-200">${s.name}</div>
    </div>
  `).join('');
}

function selectSkill(id) {
  AppState.activeSkillId = id;
  const skill = AppState.skills.find(s => s.id === id);
  document.getElementById('activeSkillBadge').textContent = skill ? skill.name : 'افتراضي';
  renderSkills();
  saveToStorage();
}

function renderTools() {
  const list = document.getElementById('toolsList');
  list.innerHTML = AppState.tools.map(t => `
    <div class="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
      <span class="text-xs text-slate-300 font-mono">${t.function.name}</span>
      <input type="checkbox" ${t.enabled ? 'checked' : ''} onchange="toggleTool('${t.id}')" class="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
    </div>
  `).join('');
}

function toggleTool(id) {
  const tool = AppState.tools.find(t => t.id === id);
  if (tool) tool.enabled = !tool.enabled;
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem('agentic_workbench_state', JSON.stringify({
    skills: AppState.skills,
    tools: AppState.tools,
    reasoningEffort: AppState.reasoningEffort,
    activeSkillId: AppState.activeSkillId
  }));
}

function loadFromStorage() {
  const saved = localStorage.getItem('agentic_workbench_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      AppState.skills = parsed.skills || AppState.skills;
      AppState.tools = parsed.tools || AppState.tools;
      AppState.reasoningEffort = parsed.reasoningEffort || AppState.reasoningEffort;
      AppState.activeSkillId = parsed.activeSkillId || AppState.activeSkillId;
    } catch (e) {}
  }
}

let currentBlueprint = null;

// DOM Elements
const plannerInput = document.getElementById("plannerInput");
const generatePlanBtn = document.getElementById("generatePlanBtn");
const planContainer = document.getElementById("planContainer");
const approveBtn = document.getElementById("approveBtn");

const sandboxFrame = document.getElementById("sandboxFrame");
const rawCodeViewer = document.getElementById("rawCodeViewer");
const executionStatus = document.getElementById("executionStatus");
const tokenStats = document.getElementById("tokenStats");

const tabPreview = document.getElementById("tabPreview");
const tabCode = document.getElementById("tabCode");

// 1. Generate Blueprint via MiniMax
async function generatePlan() {
  const prompt = plannerInput.value.trim();
  if (!prompt) return;

  generatePlanBtn.disabled = true;
  approveBtn.disabled = true;
  planContainer.innerHTML = '<div class="text-indigo-400 animate-pulse">جاري تحليل المتطلبات وصياغة المخطط الهيكلي عبر MiniMax...</div>';

  try {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || data.error || "فشل توليد المخطط");
    }

    let blueprintText = data.choices?.[0]?.message?.content || "";
    try {
      currentBlueprint = JSON.parse(blueprintText);
    } catch {
      currentBlueprint = blueprintText;
    }

    planContainer.innerHTML = `<pre class="text-emerald-300 font-mono text-xs whitespace-pre-wrap">${typeof currentBlueprint === 'object' ? JSON.stringify(currentBlueprint, null, 2) : currentBlueprint}</pre>`;
    approveBtn.disabled = false;
  } catch (err) {
    planContainer.innerHTML = `<div class="text-red-400">خطأ في التخطيط: ${err.message}</div>`;
  } finally {
    generatePlanBtn.disabled = false;
  }
}

// 2. Approve and Implement via Claude Sonnet
async function executeImplementation() {
  if (!currentBlueprint) return;

  approveBtn.disabled = true;
  executionStatus.innerHTML = '<span class="text-amber-400 animate-pulse">جاري التشييد البرمجي عبر Claude Sonnet...</span>';

  const blueprintStr = typeof currentBlueprint === 'object' ? JSON.stringify(currentBlueprint, null, 2) : currentBlueprint;

  const messages = [
    {
      role: "user",
      content: `قم ببناء ملف ويب متكامل (Single HTML file) وفق المخطط الهيكلي التالي. استخدم Tailwind CSS عبر CDN، مع دعم كامل للغة العربية والاتجاه RTL، وكتابة أكواد Vanilla JS مدمجة لأي تفاعل مطلوب. أرجع كود الـ HTML فقط دون أي شرح أو مقدمات:\n\n${blueprintStr}`
    }
  ];

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, reasoning_effort: "high" })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || data.error || "فشل التنفيذ البرمجي");
    }

    let code = data.choices?.[0]?.message?.content || "";
    
    // Clean markdown tags if returned
    code = code.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    // Render into iFrame
    sandboxFrame.srcdoc = code;
    rawCodeViewer.textContent = code;

    executionStatus.innerHTML = '<span class="text-emerald-400 font-semibold">✓ تم التشييد والمعاينة الحية بنجاح</span>';
    if (data.usage) {
      tokenStats.textContent = `Tokens: ${data.usage.total_tokens || '-'}`;
    }
  } catch (err) {
    executionStatus.innerHTML = `<span class="text-red-400">خطأ في التنفيذ: ${err.message}</span>`;
  } finally {
    approveBtn.disabled = false;
  }
}

// 3. Tab Navigation
tabPreview.addEventListener("click", () => {
  tabPreview.className = "text-xs px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg font-medium";
  tabCode.className = "text-xs px-2.5 py-1 bg-transparent text-slate-400 hover:text-slate-200 rounded-lg font-medium";
  sandboxFrame.classList.remove("hidden");
  rawCodeViewer.classList.add("hidden");
});

tabCode.addEventListener("click", () => {
  tabCode.className = "text-xs px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg font-medium";
  tabPreview.className = "text-xs px-2.5 py-1 bg-transparent text-slate-400 hover:text-slate-200 rounded-lg font-medium";
  rawCodeViewer.classList.remove("hidden");
  sandboxFrame.classList.add("hidden");
});

// Event Listeners
generatePlanBtn.addEventListener("click", generatePlan);
approveBtn.addEventListener("click", executeImplementation);

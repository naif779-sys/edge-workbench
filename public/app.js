const chatHistory = document.getElementById("chatHistory");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const reasoningEffort = document.getElementById("reasoningEffort");

let messages = [];

function appendMessage(role, content, isTool = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `p-4 rounded-xl max-w-3xl leading-relaxed ${
    role === "user" 
      ? "bg-indigo-600/30 border border-indigo-500/40 text-indigo-100 self-end mr-auto" 
      : "bg-slate-900/80 border border-slate-800 text-slate-200 self-start ml-auto"
  }`;
  
  if (isTool) {
    msgDiv.innerHTML = `<span class="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800">أداة</span><pre class="mt-2 text-xs bg-black/50 p-2 rounded overflow-x-auto text-emerald-300 font-mono">${content}</pre>`;
  } else {
    msgDiv.textContent = content;
  }
  
  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return msgDiv;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  messages.push({ role: "user", content: text });
  userInput.value = "";

  const placeholder = appendMessage("assistant", "جاري التحليل والتنفيذ...");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        reasoning_effort: reasoningEffort ? reasoningEffort.value : "medium"
      })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || data.error || "حدث خطأ غير متوقع من الخادم.";
      placeholder.innerHTML = `<span class="text-red-400 font-bold">خطأ:</span> ${errMsg}`;
      return;
    }

    const choice = data.choices?.[0]?.message;
    if (!choice) {
      placeholder.innerHTML = `<span class="text-yellow-400 font-bold">تنبيه:</span> لم يتم استلام محتوى. الرد الخام: <pre class="text-xs mt-2 bg-black/40 p-2 rounded">${JSON.stringify(data, null, 2)}</pre>`;
      return;
    }

    let outputText = choice.content || "";
    
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const toolArgs = toolCall.function?.arguments || "{}";
      outputText += `\n[استدعاء الأداة: ${toolCall.function?.name}]\nالمعطيات: ${toolArgs}`;
    }

    placeholder.textContent = outputText.trim() || "(تم تنفيذ الإجراء بدون نص إضافي)";
    messages.push({ role: "assistant", content: outputText });

  } catch (err) {
    placeholder.innerHTML = `<span class="text-red-400 font-bold">فشل الاتصال:</span> ${err.message}`;
  }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

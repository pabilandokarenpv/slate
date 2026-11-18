const messagesEl = document.getElementById("messages");
const form = document.getElementById("input-form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const artifactPane = document.getElementById("artifact-pane");
const artifactFrame = document.getElementById("artifact-frame");
const artifactTitle = document.getElementById("artifact-title");
const artifactClose = document.getElementById("artifact-close");

let history = []; // {role, content}
let artifactCounter = 0;
const artifacts = {}; // id -> {code, lang}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Splits text on fenced code blocks ```lang\n...\n``` and renders them.
// Blocks tagged artifact-html / artifact-jsx / artifact-js get a clickable
// "open artifact" chip instead of an inline dump, matching Claude's pattern.
function renderContent(text) {
  const parts = text.split(/```/);
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      html += escapeHtml(parts[i]);
    } else {
      const firstNewline = parts[i].indexOf("\n");
      const lang = firstNewline === -1 ? parts[i].trim() : parts[i].slice(0, firstNewline).trim();
      const code = firstNewline === -1 ? "" : parts[i].slice(firstNewline + 1);
      if (lang.startsWith("artifact-")) {
        const id = "artifact-" + artifactCounter++;
        artifacts[id] = { code, lang: lang.replace("artifact-", "") };
        html += `<button class="artifact-chip" data-artifact="${id}">▶ Open artifact (${lang.replace("artifact-", "")})</button>`;
      } else {
        html += `<pre><code>${escapeHtml(code)}</code></pre>`;
      }
    }
  }
  return html;
}

function openArtifact(id) {
  const art = artifacts[id];
  if (!art) return;
  artifactPane.classList.remove("hidden");
  artifactTitle.textContent = `Artifact — ${art.lang}`;
  if (art.lang === "html") {
    artifactFrame.srcdoc = art.code;
  } else {
    // jsx/js: wrap in a minimal HTML shell with React from CDN for live preview
    artifactFrame.srcdoc = `<!DOCTYPE html><html><head>
      <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
      </head><body><div id="root"></div>
      <script type="text/babel">${art.code}<\/script>
      </body></html>`;
  }
}

messagesEl.addEventListener("click", (e) => {
  if (e.target.classList.contains("artifact-chip")) {
    openArtifact(e.target.dataset.artifact);
  }
});

artifactClose.addEventListener("click", () => {
  artifactPane.classList.add("hidden");
});

function addMessageEl(role) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function sendMessage(text) {
  history.push({ role: "user", content: text });
  const userEl = addMessageEl("user");
  userEl.textContent = text;

  const assistantEl = addMessageEl("assistant");
  assistantEl.textContent = "…";

  sendBtn.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let first = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const token = parsed.response ?? "";
          if (first) {
            full = token;
            first = false;
          } else {
            full += token;
          }
          assistantEl.innerHTML = renderContent(full);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        } catch (_) {
          // ignore partial/non-JSON lines
        }
      }
    }
    history.push({ role: "assistant", content: full });
  } catch (err) {
    assistantEl.textContent = "Error: " + err.message;
  } finally {
    sendBtn.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "auto";
  sendMessage(text);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

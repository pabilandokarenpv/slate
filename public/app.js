const messagesEl = document.getElementById("messages");
const form = document.getElementById("input-form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const sessionListEl = document.getElementById("session-list");
const sessionTitleEl = document.getElementById("session-title");
const newChatBtn = document.getElementById("new-chat-btn");
const sidePanelEl = document.getElementById("side-panel");
const panelCloseEl = document.getElementById("panel-close");
const artifactFrameEl = document.getElementById("artifact-frame");
const artifactTitleEl = document.getElementById("artifact-title");
const kernelCodeEditor = document.getElementById("kernel-code-editor");
const kernelCodeFrame = document.getElementById("kernel-code-frame");
const kernelCodeLang = document.getElementById("kernel-code-lang");
const kernelCodeRunBtn = document.getElementById("kernel-code-run");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const sidebarScrimEl = document.getElementById("sidebar-scrim");

// ---- Chat + artifacts primitives (declared FIRST: sessions init below
// calls renderActiveSession, which touches these — declaring them after
// caused a temporal-dead-zone crash that silently killed the whole script,
// which is why sending a message used to do nothing at all) ----

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

function addMessageEl(role) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

// ---- Sessions (localStorage-backed, each session = {id, title, history}) ----
const SESS_KEY = "kernel_ai_sessions_v1";

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESS_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveSessions(list) {
  localStorage.setItem(SESS_KEY, JSON.stringify(list));
}

let sessions = loadSessions();
let activeId = sessions[0]?.id ?? null;

function newSession() {
  const s = { id: "s" + Date.now(), title: "New chat", history: [] };
  sessions.unshift(s);
  activeId = s.id;
  saveSessions(sessions);
  renderSessionList();
  renderActiveSession();
  closeSidebarOnMobile();
}

function getActiveSession() {
  return sessions.find((s) => s.id === activeId);
}

function renderSessionList() {
  sessionListEl.innerHTML = "";
  for (const s of sessions) {
    const el = document.createElement("div");
    el.className = "session-item" + (s.id === activeId ? " active" : "");
    const label = document.createElement("span");
    label.textContent = s.title;
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    const del = document.createElement("span");
    del.className = "session-del";
    del.textContent = "✕";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      sessions = sessions.filter((x) => x.id !== s.id);
      if (activeId === s.id) activeId = sessions[0]?.id ?? null;
      saveSessions(sessions);
      renderSessionList();
      renderActiveSession();
    });
    el.appendChild(label);
    el.appendChild(del);
    el.addEventListener("click", () => {
      activeId = s.id;
      renderSessionList();
      renderActiveSession();
      closeSidebarOnMobile();
    });
    sessionListEl.appendChild(el);
  }
}

function renderActiveSession() {
  const s = getActiveSession();
  messagesEl.innerHTML = "";
  artifactCounter = 0;
  Object.keys(artifacts).forEach((k) => delete artifacts[k]);
  if (!s) {
    sessionTitleEl.textContent = "New chat";
    return;
  }
  sessionTitleEl.textContent = s.title;
  for (const m of s.history) {
    const el = addMessageEl(m.role);
    el.innerHTML = renderContent(m.content);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

if (sessions.length === 0) {
  newSession();
} else {
  renderSessionList();
  renderActiveSession();
}

newChatBtn.addEventListener("click", () => newSession());

// ---- Responsive sidebar (hamburger on tablet/mobile) ----

function isNarrow() {
  return window.innerWidth <= 900;
}

function openSidebar() {
  sidebarEl.classList.add("open");
  sidebarScrimEl.classList.remove("hidden");
}

function closeSidebar() {
  sidebarEl.classList.remove("open");
  sidebarScrimEl.classList.add("hidden");
}

function closeSidebarOnMobile() {
  if (isNarrow()) closeSidebar();
}

sidebarToggleBtn.addEventListener("click", () => {
  sidebarEl.classList.contains("open") ? closeSidebar() : openSidebar();
});
sidebarScrimEl.addEventListener("click", closeSidebar);

function openArtifact(id) {
  const art = artifacts[id];
  if (!art) return;
  showPanel("artifact");
  artifactTitleEl.textContent = `Artifact — ${art.lang}`;
  if (art.lang === "html") {
    artifactFrameEl.srcdoc = art.code;
  } else {
    artifactFrameEl.srcdoc = `<!DOCTYPE html><html><head>
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

async function sendMessage(text) {
  const s = getActiveSession();
  if (!s) return;
  s.history.push({ role: "user", content: text });
  if (s.history.length === 1) {
    s.title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
    sessionTitleEl.textContent = s.title;
    renderSessionList();
  }
  const userEl = addMessageEl("user");
  userEl.textContent = text;

  const assistantEl = addMessageEl("assistant");
  assistantEl.textContent = "…";

  sendBtn.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: s.history }),
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
    s.history.push({ role: "assistant", content: full });
    saveSessions(sessions);
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
  // On touch devices Enter should insert a newline, not submit — only
  // desktop-style keyboards get the submit-on-Enter shortcut.
  const isTouchDevice = matchMedia("(pointer: coarse)").matches;
  if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// ---- Side panel (Artifact / Kernel Code tabs) ----

function showPanel(name) {
  sidePanelEl.classList.remove("hidden");
  document.body.classList.add("panel-open-mobile");
  document.querySelectorAll(".panel-tab").forEach((t) => t.classList.toggle("active", t.dataset.panel === name));
  document.getElementById("artifact-panel").classList.toggle("active", name === "artifact");
  document.getElementById("kernel-code-panel").classList.toggle("active", name === "kernel-code");
}

function closePanel() {
  sidePanelEl.classList.add("hidden");
  document.body.classList.remove("panel-open-mobile");
}

document.querySelectorAll(".panel-tab").forEach((tab) => {
  tab.addEventListener("click", () => showPanel(tab.dataset.panel));
});

panelCloseEl.addEventListener("click", closePanel);

kernelCodeRunBtn.addEventListener("click", () => {
  showPanel("kernel-code");
  const code = kernelCodeEditor.value;
  const lang = kernelCodeLang.value;
  if (lang === "html") {
    kernelCodeFrame.srcdoc = code;
  } else {
    kernelCodeFrame.srcdoc = `<!DOCTYPE html><html><body>
      <script>
        try { ${code} } catch (e) { document.body.innerHTML = '<pre style="color:red">' + e + '<\\/pre>'; }
      <\/script>
      </body></html>`;
  }
});

// ---- Viewport height fix (iOS Safari's 100vh doesn't account for the
// dynamic address bar / toolbar; measure the real visible height and set
// it as a CSS variable instead of relying on vh units everywhere) ----
function setRealVh() {
  document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
}
setRealVh();
window.addEventListener("resize", setRealVh);
window.visualViewport?.addEventListener("resize", setRealVh);

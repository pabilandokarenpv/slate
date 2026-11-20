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
const sidebarToggleIcon = document.getElementById("sidebar-toggle-icon");
const sidebarScrimEl = document.getElementById("sidebar-scrim");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIconEl = document.getElementById("theme-icon");
const sidebarArtifactBtn = document.getElementById("sidebar-artifact-btn");
const sidebarCodeBtn = document.getElementById("sidebar-code-btn");

// ---- Theme (light/dark, localStorage-persisted, defaults to system) ----
const THEME_KEY = "kernel_ai_theme_v1";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeIconEl.innerHTML = `<use href="#icon-${theme === "light" ? "sun" : "moon"}"/>`;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(theme);
}

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

initTheme();

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

// Claude-style "responding" indicator: three pulsing dots shown while we
// wait for the first real token, swapped out the instant content arrives.
function showTypingIndicator(el) {
  el.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
}

// ---- Sessions (localStorage-backed, each session = {id, title, history, botId?, projectId?}) ----
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

function newSession(opts = {}) {
  const s = { id: "s" + Date.now(), title: "New chat", history: [], botId: opts.botId ?? null };
  sessions.unshift(s);
  activeId = s.id;
  saveSessions(sessions);
  showView("chat");
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
      showView("chat");
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

// ---- Responsive sidebar (overlay drawer on tablet/mobile) ----

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

// The toggle button needs two distinct icons, not one icon that just
// "looks pressed" — closed shows a plain sidebar glyph (click to reveal),
// open shows the same glyph with a collapse arrow (click to hide), so the
// icon itself communicates what the click will do either way.
function updateSidebarToggleIcon() {
  const open = isNarrow() ? sidebarEl.classList.contains("open") : true;
  sidebarToggleIcon.innerHTML = `<use href="#icon-sidebar-${open ? "open" : "closed"}"/>`;
}

sidebarToggleBtn.addEventListener("click", () => {
  sidebarEl.classList.contains("open") ? closeSidebar() : openSidebar();
  updateSidebarToggleIcon();
});
sidebarScrimEl.addEventListener("click", () => { closeSidebar(); updateSidebarToggleIcon(); });
window.addEventListener("resize", updateSidebarToggleIcon);
updateSidebarToggleIcon();

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
  showTypingIndicator(assistantEl);

  sendBtn.disabled = true;
  try {
    const bot = s.botId ? getBots().find((b) => b.id === s.botId) : null;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: s.history, system: bot?.instructions }),
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
  showView("chat");
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

sidebarArtifactBtn.addEventListener("click", () => {
  showPanel("artifact");
  closeSidebarOnMobile();
});
sidebarCodeBtn.addEventListener("click", () => {
  showPanel("kernel-code");
  closeSidebarOnMobile();
});

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

// ---- Top-level nav: Chat / Projects / Bots / Cron Jobs ----
// Chat is "no feature-view active" (the default chat-pane + side-panel
// layout); the other three are full-pane views that replace it.
const navButtons = [
  document.getElementById("nav-projects-btn"),
  document.getElementById("nav-bots-btn"),
  document.getElementById("nav-cron-btn"),
];
const featureViews = {
  projects: document.getElementById("projects-view"),
  bots: document.getElementById("bots-view"),
  cron: document.getElementById("cron-view"),
};

function showView(name) {
  const chatPane = document.getElementById("chat-pane");
  const isFeature = name !== "chat";
  chatPane.style.display = isFeature ? "none" : "flex";
  if (isFeature) closePanel();
  Object.entries(featureViews).forEach(([k, el]) => el.classList.toggle("active", k === name));
  navButtons.forEach((b) => b.classList.toggle("nav-active", b.dataset.view === name));
  if (name === "projects") renderProjects();
  if (name === "bots") renderBots();
  if (name === "cron") renderCron();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showView(btn.dataset.view);
    closeSidebarOnMobile();
  });
});

// ---- Shared modal (used by Projects / Bots / Cron "New" buttons) ----
const modalScrim = document.getElementById("modal-scrim");
const modalTitle = document.getElementById("modal-title");
const modalFields = document.getElementById("modal-fields");
const modalCancel = document.getElementById("modal-cancel");
const modalConfirm = document.getElementById("modal-confirm");

function openModal(title, fieldsHtml, onConfirm) {
  modalTitle.textContent = title;
  modalFields.innerHTML = fieldsHtml;
  modalScrim.classList.remove("hidden");
  const confirmHandler = () => {
    onConfirm();
    modalScrim.classList.add("hidden");
    modalConfirm.removeEventListener("click", confirmHandler);
  };
  modalConfirm.addEventListener("click", confirmHandler);
  modalFields.querySelector("input, textarea")?.focus();
}

modalCancel.addEventListener("click", () => modalScrim.classList.add("hidden"));
modalScrim.addEventListener("click", (e) => { if (e.target === modalScrim) modalScrim.classList.add("hidden"); });

// ---- Projects (localStorage-backed: group chats, shared instructions) ----
const PROJECTS_KEY = "kernel_ai_projects_v1";
function getProjects() { try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; } catch { return []; } }
function saveProjects(list) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); }

function renderProjects() {
  const grid = document.getElementById("projects-grid");
  const projects = getProjects();
  if (projects.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg class="icon" viewBox="0 0 24 24"><use href="#icon-projects"/></svg>
      <p>No projects yet. Group related chats together with shared instructions.</p>
    </div>`;
    return;
  }
  grid.innerHTML = projects.map((p) => `
    <div class="feature-card" data-id="${p.id}" data-kind="project">
      <button class="card-del" data-del="${p.id}" data-kind="project"><svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px"><use href="#icon-trash"/></svg></button>
      <div class="card-icon"><svg class="icon" viewBox="0 0 24 24"><use href="#icon-projects"/></svg></div>
      <div class="card-title">${escapeHtml(p.name)}</div>
      <div class="card-sub">${escapeHtml(p.instructions || "No instructions set")}</div>
      <span class="card-pill">${sessions.filter((s) => s.projectId === p.id).length} chats</span>
    </div>
  `).join("");
}

document.getElementById("projects-new-btn").addEventListener("click", () => {
  openModal("New project", `
    <div class="modal-field"><label>Name</label><input id="f-name" placeholder="e.g. Kernel-lang docs" /></div>
    <div class="modal-field"><label>Instructions (optional)</label><textarea id="f-instructions" rows="3" placeholder="Shared context/instructions for every chat in this project"></textarea></div>
  `, () => {
    const name = document.getElementById("f-name").value.trim();
    if (!name) return;
    const instructions = document.getElementById("f-instructions").value.trim();
    const projects = getProjects();
    projects.unshift({ id: "p" + Date.now(), name, instructions });
    saveProjects(projects);
    renderProjects();
  });
});

document.getElementById("projects-grid").addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    e.stopPropagation();
    saveProjects(getProjects().filter((p) => p.id !== delBtn.dataset.del));
    renderProjects();
    return;
  }
  const card = e.target.closest(".feature-card");
  if (card) {
    newSession({ projectId: card.dataset.id });
  }
});

// ---- Bots (localStorage-backed: custom persona + instructions, used as
// the "system" context sent to the model for any chat started from them) ----
const BOTS_KEY = "kernel_ai_bots_v1";
function getBots() { try { return JSON.parse(localStorage.getItem(BOTS_KEY)) || []; } catch { return []; } }
function saveBots(list) { localStorage.setItem(BOTS_KEY, JSON.stringify(list)); }

function renderBots() {
  const grid = document.getElementById("bots-grid");
  const bots = getBots();
  if (bots.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg class="icon" viewBox="0 0 24 24"><use href="#icon-bots"/></svg>
      <p>No bots yet. Create a custom bot with its own persona and instructions.</p>
    </div>`;
    return;
  }
  grid.innerHTML = bots.map((b) => `
    <div class="feature-card" data-id="${b.id}" data-kind="bot">
      <button class="card-del" data-del="${b.id}" data-kind="bot"><svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px"><use href="#icon-trash"/></svg></button>
      <div class="card-icon">${b.emoji || "🤖"}</div>
      <div class="card-title">${escapeHtml(b.name)}</div>
      <div class="card-sub">${escapeHtml(b.instructions || "No instructions set")}</div>
    </div>
  `).join("");
}

document.getElementById("bots-new-btn").addEventListener("click", () => {
  openModal("New bot", `
    <div class="modal-field"><label>Name</label><input id="f-name" placeholder="e.g. Code Reviewer" /></div>
    <div class="modal-field"><label>Emoji (optional)</label><input id="f-emoji" placeholder="🤖" maxlength="4" /></div>
    <div class="modal-field"><label>Instructions</label><textarea id="f-instructions" rows="4" placeholder="How should this bot behave? e.g. Always answer in short bullet points."></textarea></div>
  `, () => {
    const name = document.getElementById("f-name").value.trim();
    if (!name) return;
    const emoji = document.getElementById("f-emoji").value.trim();
    const instructions = document.getElementById("f-instructions").value.trim();
    const bots = getBots();
    bots.unshift({ id: "b" + Date.now(), name, emoji, instructions });
    saveBots(bots);
    renderBots();
  });
});

document.getElementById("bots-grid").addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    e.stopPropagation();
    saveBots(getBots().filter((b) => b.id !== delBtn.dataset.del));
    renderBots();
    return;
  }
  const card = e.target.closest(".feature-card");
  if (card) {
    newSession({ botId: card.dataset.id });
  }
});

// ---- Cron Jobs (real server-side scheduling via /api/cron + the Worker's
// own Cron Trigger — not a client-side timer, these keep running even if
// this tab is fully closed) ----
async function renderCron() {
  const grid = document.getElementById("cron-grid");
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Loading…</p></div>`;
  try {
    const res = await fetch("/api/cron");
    const { jobs } = await res.json();
    if (!jobs || jobs.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <svg class="icon" viewBox="0 0 24 24"><use href="#icon-cron"/></svg>
        <p>No scheduled jobs yet. A job keeps running on our server every N minutes, even with this closed.</p>
      </div>`;
      return;
    }
    grid.innerHTML = jobs.map((j) => `
      <div class="feature-card" data-id="${j.id}" data-kind="cron">
        <button class="card-del" data-del="${j.id}" data-kind="cron"><svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px"><use href="#icon-trash"/></svg></button>
        <div class="card-icon"><svg class="icon" viewBox="0 0 24 24"><use href="#icon-cron"/></svg></div>
        <div class="card-title">every ${j.scheduleMinutes} min</div>
        <div class="card-sub">${escapeHtml(j.prompt)}</div>
        ${j.lastResult ? `<div class="card-sub" style="margin-top:6px;opacity:0.7">↳ ${escapeHtml(j.lastResult.slice(0, 80))}</div>` : `<span class="card-pill">not run yet</span>`}
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Couldn't load cron jobs: ${escapeHtml(err.message)}</p></div>`;
  }
}

document.getElementById("cron-new-btn").addEventListener("click", () => {
  openModal("New cron job", `
    <div class="modal-field"><label>Prompt</label><textarea id="f-prompt" rows="3" placeholder="e.g. Summarize today's Kernel-lang commits"></textarea></div>
    <div class="modal-field"><label>Run every (minutes, minimum 5)</label><input id="f-minutes" type="number" min="5" value="60" /></div>
  `, async () => {
    const prompt = document.getElementById("f-prompt").value.trim();
    const scheduleMinutes = parseInt(document.getElementById("f-minutes").value, 10) || 60;
    if (!prompt) return;
    await fetch("/api/cron", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, scheduleMinutes }),
    });
    renderCron();
  });
});

document.getElementById("cron-grid").addEventListener("click", async (e) => {
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    e.stopPropagation();
    await fetch(`/api/cron?id=${delBtn.dataset.del}`, { method: "DELETE" });
    renderCron();
  }
});

// ---- Viewport height fix (iOS Safari's 100vh doesn't account for the
// dynamic address bar / keyboard; measure the real visible height and set
// it as a CSS variable instead of relying on vh units everywhere) ----
function setRealVh() {
  document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
}
setRealVh();
window.addEventListener("resize", setRealVh);
window.visualViewport?.addEventListener("resize", setRealVh);

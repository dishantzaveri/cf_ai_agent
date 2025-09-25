// ---------- Tab routing (clicks + URL hash) ----------
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

function activateTab(name) {
  if (!name || !document.getElementById(name)) name = "about";
  tabs.forEach(x => {
    const isActive = x.dataset.tab === name;
    x.classList.toggle("active", isActive);
    x.setAttribute("aria-selected", String(isActive));
  });
  panels.forEach(p => p.classList.toggle("active", p.id === name));
  if (location.hash.slice(1) !== name) {
    // don’t push a new history entry; keep it clean
    history.replaceState(null, "", `#${name}`);
  }
  if (name === "agent") {
    setTimeout(() => {
      const chatEl = document.querySelector("#chat");
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }, 60);
  }
}

// clicks on tab anchors
tabs.forEach(t => t.addEventListener("click", (e) => {
  e.preventDefault();
  activateTab(t.dataset.tab);
}));

// react to hash changes (e.g., clicking “Talk to my Agent”, bookmarks, back/forward)
window.addEventListener("hashchange", () => activateTab(location.hash.slice(1)));

// initial tab (deep links supported)
activateTab(location.hash.slice(1) || "about");

// ---------- Elements ----------
const chatEl = document.querySelector("#chat");
const form = document.querySelector("#composer");
const input = document.querySelector("#prompt");
const userIdEl = document.querySelector("#userId");
const ctxEl = document.querySelector("#context");
const micBtn = document.querySelector("#mic");
const saveNoteBtn = document.querySelector("#saveNote");
const runSearchBtn = document.querySelector("#runSearch");
const scheduleBtn = document.querySelector("#schedule");
const clearBtn = document.querySelector("#clear");
const presetsEl = document.querySelector("#presets");

function addMsg(role, text, ts = Date.now()) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div>${text}</div><time>${new Date(ts).toLocaleTimeString()}</time>`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function setContext(chips = []) {
  ctxEl.innerHTML = "";
  chips.slice(-8).forEach(t => {
    const c = document.createElement("span");
    c.className = "chip";
    c.textContent = (t || "").toString().slice(0, 80);
    ctxEl.appendChild(c);
  });
}

// ---------- History & lightweight context ----------
async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const { messages } = await res.json();
    chatEl.innerHTML = "";
    const chips = [];
    (messages || []).forEach(m => {
      addMsg(m.role, m.text, m.ts);
      if (m.role === "assistant" || m.role === "user") chips.push(m.text);
    });
    setContext(chips.slice(-6));
  } catch {}
}

// ---------- WebSocket with auto-reconnect ----------
let ws, backoff = 500;
function connectWS() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => { backoff = 500; };
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.type === "assistant_message") addMsg("assistant", data.text);
    } catch {}
  };
  ws.onclose = () => {
    setTimeout(connectWS, backoff);
    backoff = Math.min(backoff * 2, 8000);
  };
  ws.onerror = () => ws.close();
}
connectWS();

// ---------- Send message ----------
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = (input.value || "").trim();
  if (!text) return;

  input.value = "";
  addMsg("user", text);
  const payload = { type: "chat", userId: (userIdEl.value || "anon").trim(), text };

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  } else {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: payload.userId, prompt: text })
    });
    const out = await r.json().catch(() => ({}));
    addMsg("assistant", out.reply || "(no reply)");
  }
});

// ---------- Preset chips ----------
presetsEl?.addEventListener("click", (e) => {
  if (e.target.classList.contains("chip")) {
    input.value = e.target.textContent;
    form.requestSubmit();
  }
});

// ---------- Quick actions ----------
saveNoteBtn?.addEventListener("click", async () => {
  const txt = prompt("Note to save in memory:");
  if (!txt) return;
  addMsg("user", `/note ${txt}`);
  await fetch("/api/note", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: (userIdEl.value || "anon").trim(), text: txt })
  });
  addMsg("assistant", "Saved to long-term memory.");
});

runSearchBtn?.addEventListener("click", async () => {
  const url = prompt("Enter a URL to /search (e.g., https://blog.cloudflare.com/):");
  if (!url) return;
  input.value = `/search ${url}`;
  form.requestSubmit();
});

scheduleBtn?.addEventListener("click", async () => {
  await fetch("/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: (userIdEl.value || "anon").trim(), seconds: 30, note: "Auto follow-up" })
  });
  addMsg("assistant", "Scheduled a follow-up in ~30s. Check history soon!");
});

clearBtn?.addEventListener("click", async () => {
  if (!confirm("Clear all stored chat for this Durable Object?")) return;
  await fetch("/api/clear", { method: "POST" });
  chatEl.innerHTML = "";
  setContext([]);
});

// ---------- Voice input (Web Speech API) ----------
let recog;
document.querySelector("#mic")?.addEventListener("click", () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("SpeechRecognition not supported in this browser"); return; }
  if (!recog) { recog = new SR(); recog.lang = "en-US"; recog.interimResults = false; }
  recog.onresult = (e) => { input.value = e.results[0][0].transcript; form.requestSubmit(); };
  recog.start();
});

// initial load
loadHistory();

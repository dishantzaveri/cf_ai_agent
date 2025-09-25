const chatEl = document.querySelector("#chat");
const ctxEl = document.querySelector("#context");
const form = document.querySelector("#composer");
const input = document.querySelector("#prompt");
const followBtn = document.querySelector("#followup");
const micBtn = document.querySelector("#mic");
const clearBtn = document.querySelector("#clear");
const userId = "dishant"; // could be a UUID per session


function addMsg(role, text, ts = Date.now()) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div>${text}</div><time>${new Date(ts).toLocaleTimeString()}</time>`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function setContext(chips = []) {
  ctxEl.innerHTML = "";
  chips.forEach(t => {
    const c = document.createElement("span");
    c.className = "chip";
    c.textContent = t.slice(0, 80);
    ctxEl.appendChild(c);
  });
}

async function loadHistory() {
  const res = await fetch("/api/history");
  const { messages } = await res.json();
  chatEl.innerHTML = "";
  messages.forEach(m => addMsg(m.role, m.text, m.ts));
}

let ws;
let backoff = 500;


function connectWS() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => {
    console.log("WS connected");
    backoff = 500; // reset backoff on success
  };

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.type === "assistant_message") addMsg("assistant", data.text);
    } catch {}
  };

  ws.onclose = () => {
    console.warn("WS closed; reconnecting…");
    setTimeout(connectWS, backoff);
    backoff = Math.min(backoff * 2, 8000);
  };

  ws.onerror = (e) => {
    console.warn("WS error", e);
    ws.close();
  };
}

connectWS();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addMsg("user", text);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "chat", userId, text }));
  } else {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, prompt: text }),
    }).then(r => r.json()).then(({ reply }) => addMsg("assistant", reply));
  }
});


followBtn.addEventListener("click", async () => {
  await fetch("/api/schedule", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ userId, seconds:30, note:"CF background research" })});
});

// voice input (Web Speech API)
let recog;
micBtn.addEventListener("click", () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("SpeechRecognition not supported in this browser"); return; }
  if (!recog) { recog = new SR(); recog.lang="en-US"; recog.interimResults=false; }
  recog.onresult = (e) => { input.value = e.results[0][0].transcript; form.requestSubmit(); };
  recog.start();
});

clearBtn.addEventListener("click", () => { chatEl.innerHTML = ""; });

loadHistory();

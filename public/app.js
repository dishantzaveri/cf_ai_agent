const chatEl = document.querySelector("#chat");
const form = document.querySelector("#composer");
const input = document.querySelector("#prompt");
const followBtn = document.querySelector("#followup");
const clearBtn = document.querySelector("#clear");

function addMsg(role, text, ts = Date.now()) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  const time = new Date(ts).toLocaleTimeString();
  div.innerHTML = `<div>${text}</div><time>${time}</time>`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function loadHistory() {
  const res = await fetch("/api/history");
  const { messages } = await res.json();
  chatEl.innerHTML = "";
  messages.forEach(m => addMsg(m.role, m.text, m.ts));
}

async function sendPromptHTTP(text) {
  addMsg("user", text);
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: text })
  });
  const { reply } = await res.json();
  addMsg("assistant", reply);
}

function connectWS() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => console.log("WS connected");
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.type === "assistant_message") addMsg("assistant", data.text);
    } catch {}
  };
  ws.onclose = () => console.log("WS closed");
  return ws;
}

const ws = connectWS();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    ws.send(JSON.stringify({ type: "chat", text }));
    addMsg("user", text);
  } catch {
    await sendPromptHTTP(text);
  }
});

followBtn.addEventListener("click", async () => {
  await fetch("/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seconds: 10, note: "Thanks for trying the demo!" })
  });
});

clearBtn.addEventListener("click", () => (chatEl.innerHTML = ""));

loadHistory();

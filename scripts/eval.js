const URL_BASE = process.env.AGENT_URL || "https://cf-agents-cf4242.dishantzaveri.workers.dev";

async function post(path, body) {
  const res = await fetch(URL_BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  return { nonJson: true, status: res.status, body: txt };
}

(async () => {
  const tests = [
    { name: "hi",     path: "/api/chat",  body: { prompt: "Introduce yourself in one sentence." } },
    { name: "note",   path: "/api/note",  body: { userId: "dishant", text: "Dishant won Singapore India Hackathon; mention in replies." } },
    { name: "rag",    path: "/api/chat",  body: { userId: "dishant", prompt: "What do you remember about my achievements?" } },
    { name: "search", path: "/api/chat",  body: { prompt: "/search https://blog.cloudflare.com/" } },
  ];

  for (const t of tests) {
    const out = await post(t.path, t.body);
    console.log(`\n[${t.name}]`, out);
  }
})();

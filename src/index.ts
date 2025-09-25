/// <reference types="@cloudflare/workers-types" />

import { MyAgent } from "./agent";

// Environment for the Worker (entrypoint)
export interface Env {
  AI: Ai; // Workers AI binding
  MyAgent: DurableObjectNamespace; // DO binding
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // POST /api/chat   body: { "prompt": "..." }
    if (url.pathname === "/api/chat" && req.method === "POST") {
      const id = env.MyAgent.idFromName("primary");
      const stub = env.MyAgent.get(id);
      return stub.fetch("http://do/chat", {
        method: "POST",
        body: await req.text(),
        headers: { "content-type": "application/json" },
      });
    }

    // GET /api/history
    if (url.pathname === "/api/history" && req.method === "GET") {
      const id = env.MyAgent.idFromName("primary");
      const stub = env.MyAgent.get(id);
      return stub.fetch("http://do/history");
    }

    // POST /api/schedule   body: { "seconds": 15, "note": "..." }
    if (url.pathname === "/api/schedule" && req.method === "POST") {
      const id = env.MyAgent.idFromName("primary");
      const stub = env.MyAgent.get(id);
      return stub.fetch("http://do/schedule", {
        method: "POST",
        body: await req.text(),
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("OK", { status: 200 });
  },
};

// ✅ Export the Durable Object class from the entrypoint so Wrangler can bind it
export { MyAgent };

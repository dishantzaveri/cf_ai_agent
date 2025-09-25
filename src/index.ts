/// <reference types="@cloudflare/workers-types" />
import { MyAgent } from "./agent";

export interface Env {
  AI: Ai;
  MEM_INDEX: VectorizeIndex;
  MyAgent: DurableObjectNamespace;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const id = env.MyAgent.idFromName("primary");
    const stub = env.MyAgent.get(id);

    // in src/index.ts, before forwarding /ws
    if (url.pathname === "/ws") {
      // Must be a real WebSocket upgrade from the browser
      const isWs = req.headers.get("upgrade")?.toLowerCase() === "websocket";
      if (!isWs) return new Response("Expected a WebSocket upgrade", { status: 426 });

      const id = env.MyAgent.idFromName("primary");
      const stub = env.MyAgent.get(id);

      // Forward the ORIGINAL request + headers to the DO, preserving Upgrade
      const doReq = new Request("https://do/ws", req);
      return stub.fetch(doReq);
    }

    if (url.pathname === "/api/chat" && req.method === "POST")
      return stub.fetch("https://do/chat", { method: "POST", body: await req.text(), headers: { "content-type": "application/json" } });

    if (url.pathname === "/api/history" && req.method === "GET")
      return stub.fetch("https://do/history");

      if (url.pathname === "/api/health" && req.method === "GET") {
    // lightweight smoke test
    try {
      const id = env.MyAgent.idFromName("primary");
      const stub = env.MyAgent.get(id);
      const pong = await stub.fetch("https://do/history");
      const ok = pong.ok;
      return new Response(JSON.stringify({ ok, memIndex: !!env.MEM_INDEX, ai: !!env.AI }), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
        status: 500, headers: { "content-type": "application/json" },
      });
    }
  }


    if (url.pathname === "/api/schedule" && req.method === "POST")
      return stub.fetch("https://do/schedule", { method: "POST", body: await req.text(), headers: { "content-type": "application/json" } });

    if (url.pathname === "/api/note" && req.method === "POST")
      return stub.fetch("https://do/note", { method: "POST", body: await req.text(), headers: { "content-type": "application/json" } });


    if (url.pathname === "/api/clear" && req.method === "POST") {
      const id = env.MyAgent.idFromName("primary");
      const stub = env.MyAgent.get(id);
      return stub.fetch("https://do/clear", { method: "POST" });
    }

    // fall back to static assets
    return new Response(await (await fetch(new URL("./public/index.html", import.meta.url))).text(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};

export { MyAgent };

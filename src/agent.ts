/// <reference types="@cloudflare/workers-types" />
import { searchContext, upsertNote } from "./rag";
import { webFetch } from "./tools";

export interface Env {
  AI: Ai;
  MEM_INDEX: VectorizeIndex;
}

type Msg = { role: "user" | "assistant" | "system"; text: string; ts: number };
type ChatBody = { userId?: string; prompt: string };
type ScheduleBody = { seconds?: number; note?: string; userId?: string };

const MESSAGES_KEY = "messages";
const JOBS_KEY = "jobs"; // background tasks

export class MyAgent implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // WebSocket for realtime UI
    if (url.pathname === "/ws") {
      const pair = new WebSocketPair();
      // ✅ Index properties avoid "possibly undefined" issues
      const client = pair[0] as WebSocket;
      const server = pair[1] as WebSocket;

      server.accept();

      server.addEventListener("message", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(String(ev.data));
          if (data?.type === "chat") {
            this.processChat(server, { prompt: data.text, userId: data.userId });
          } else if (data?.type === "note") {
            this.addNote(server, data.userId || "anon", String(data.text || ""));
          }
        } catch {}
      });

      // ✅ ResponseInit.webSocket expects WebSocket | null (not undefined)
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/chat" && req.method === "POST") {
      const body = (await req.json()) as ChatBody;
      const reply = await this.chat(body.userId || "anon", body.prompt);
      return json({ reply });
    }

    if (url.pathname === "/history") {
      const messages = (await this.state.storage.get<Msg[]>(MESSAGES_KEY)) ?? [];
      return json({ messages });
    }

    if (url.pathname === "/schedule" && req.method === "POST") {
      const { seconds = 30, note = "background research", userId = "anon" } =
        (await req.json()) as ScheduleBody;
      const jobs = (await this.state.storage.get<any[]>(JOBS_KEY)) ?? [];
      jobs.push({ at: Date.now() + seconds * 1000, type: "research", note, userId });
      await this.state.storage.put(JOBS_KEY, jobs);
      await this.state.storage.setAlarm(Date.now() + 1000); // tick soon
      return json({ scheduled: true, in: seconds });
    }

    if (url.pathname === "/note" && req.method === "POST") {
      const { userId = "anon", text } = (await req.json()) as { userId?: string; text: string };
      const res = await upsertNote(this.env, userId, text);
      return new Response(JSON.stringify(res), { headers: { "content-type": "application/json" } });
    }



    return new Response("OK");
  }

  async alarm() {
    const now = Date.now();
    const jobs = (await this.state.storage.get<any[]>(JOBS_KEY)) ?? [];
    const due = jobs.filter((j) => j.at <= now);
    const later = jobs.filter((j) => j.at > now);

    for (const job of due) {
      if (job.type === "research") {
        const snippet = await webFetch("https://blog.cloudflare.com/");
        const reply = `Background research done on Cloudflare blog. Snapshot:\n${snippet.slice(
          0,
          600
        )}...`;
        await this.append("assistant", reply);
        await upsertNote(this.env, job.userId, `Research Note: ${reply}`);
      }
    }
    await this.state.storage.put(JOBS_KEY, later);
    if (later.length) await this.state.storage.setAlarm(later[0].at);
  }

  // --- internals ---

  private async addNote(ws: WebSocket, userId: string, text: string) {
    await upsertNote(this.env, userId, text);
    try {
      ws.send(JSON.stringify({ type: "assistant_message", text: "Saved to long-term memory." }));
    } catch {}
  }

  private async processChat(ws: WebSocket, { userId = "anon", prompt }: ChatBody) {
    const reply = await this.chat(userId, prompt);
    try {
      ws.send(JSON.stringify({ type: "assistant_message", text: reply }));
    } catch {}
  }

  private async chat(userId: string, prompt: string): Promise<string> {
    await this.append("user", prompt);

    // simple tool calls
    if (prompt.startsWith("/search ")) {
      const url = prompt.slice(8).trim();
      const snippet = await webFetch(url);
      const msg = `Searched ${url}. Top snippet:\n${snippet.slice(0, 600)}...`;
      await this.append("assistant", msg);
      await upsertNote(this.env, userId, `Fetched: ${url}`);
      return msg;
    }
    if (prompt.startsWith("/note ")) {
      const note = prompt.slice(6).trim();
      await upsertNote(this.env, userId, note);
      const msg = "Saved to long-term memory.";
      await this.append("assistant", msg);
      return msg;
    }

    // retrieve semantic context
    const retrieved = await searchContext(this.env, userId, prompt, 3);
    const contextText = retrieved.length
      ? `Relevant memory:\n- ${retrieved.join("\n- ")}`
      : "No memory retrieved.";

    const aiOut = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: "You are concise, friendly, and helpful. Use context if relevant." },
        { role: "system", content: contextText },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const reply =
      typeof aiOut === "string"
        ? aiOut
        : (aiOut as { response?: string })?.response ?? "Sorry, I couldn’t draft a reply.";

    await this.append("assistant", reply);
    return reply;
  }

  private async append(role: Msg["role"], text: string) {
    const msgs = (await this.state.storage.get<Msg[]>(MESSAGES_KEY)) ?? [];
    msgs.push({ role, text, ts: Date.now() });
    await this.state.storage.put(MESSAGES_KEY, msgs.slice(-120));
  }
}

// tiny helper for JSON
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

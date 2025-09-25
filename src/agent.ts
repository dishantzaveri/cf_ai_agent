/// <reference types="@cloudflare/workers-types" />

// --- Environment bindings available to this Durable Object
export interface Env {
  AI: Ai; // from [ai] binding in wrangler.toml
}

// Small helpers to type request bodies
type ChatBody = { prompt: string };
type ScheduleBody = { seconds?: number; note?: string };

// Stored message shape
type Msg = { role: "user" | "assistant"; text: string; ts: number };
const MESSAGES_KEY = "messages";
const FOLLOW_UP_NOTE_KEY = "followUpNote";

export class MyAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/chat") {
      const { prompt } = (await req.json()) as ChatBody;
      const reply = await this.handleChat(prompt);
      return new Response(JSON.stringify({ reply }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (req.method === "GET" && url.pathname === "/history") {
      const messages =
        ((await this.state.storage.get<Msg[]>(MESSAGES_KEY)) as Msg[]) ?? [];
      return new Response(JSON.stringify({ messages }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (req.method === "POST" && url.pathname === "/schedule") {
      const { seconds = 15, note = "Ping!" } = (await req.json()) as ScheduleBody;
      await this.state.storage.put(FOLLOW_UP_NOTE_KEY, note);
      await this.state.storage.setAlarm(Date.now() + seconds * 1000);
      return new Response(JSON.stringify({ scheduled: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("MyAgent DO ready", { status: 200 });
  }

  // Runs when the alarm fires (our tiny workflow)
  async alarm(): Promise<void> {
    const note =
      ((await this.state.storage.get<string>(FOLLOW_UP_NOTE_KEY)) as string) ||
      "Ping!";
    await this.append("assistant", `Follow-up: ${note} 👋`);
  }

  // --- internal helpers

  private async handleChat(prompt: string): Promise<string> {
    await this.append("user", prompt);

    // Call Workers AI (handle both string and object responses)
    const aiOut = await this.env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        messages: [
          { role: "system", content: "Be concise and helpful." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 256,
      }
    );

    const reply =
      typeof aiOut === "string"
        ? aiOut
        : (aiOut as { response?: string })?.response ??
          "Sorry, I couldn’t draft a reply.";

    await this.append("assistant", reply);
    return reply;
  }

  private async append(role: Msg["role"], text: string): Promise<void> {
    const existing =
      ((await this.state.storage.get<Msg[]>(MESSAGES_KEY)) as Msg[]) ?? [];
    existing.push({ role, text, ts: Date.now() });
    // keep last 50 rows
    await this.state.storage.put(MESSAGES_KEY, existing.slice(-50));
  }
}

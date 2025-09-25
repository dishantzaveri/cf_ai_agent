/// <reference types="@cloudflare/workers-types" />

export interface EmbeddingEnv {
  AI: Ai;
  MEM_INDEX: VectorizeIndex;
}

// Try a widely-available model first; fall back if needed.
const MODEL_PRIMARY = "@cf/baai/bge-small-en-v1.5";
const MODEL_FALLBACK = "@cf/baai/bge-base-en-v1.5";

async function tryEmbed(env: EmbeddingEnv, model: string, text: string): Promise<number[] | null> {
  try {
    const out: any = await env.AI.run(model as keyof AiModels, { text });
    if (Array.isArray(out?.data)) return out.data;
    if (Array.isArray(out?.embeddings)) return out.embeddings;
    if (typeof out === "string") {
      const parsed = JSON.parse(out);
      if (Array.isArray(parsed?.data)) return parsed.data;
    }
  } catch (e) {
    console.error("embed error", model, (e as Error)?.message);
  }
  return null;
}

export async function embed(env: EmbeddingEnv, text: string): Promise<number[] | null> {
  return (await tryEmbed(env, MODEL_PRIMARY, text))
      ?? (await tryEmbed(env, MODEL_FALLBACK, text));
}

export async function upsertNote(env: EmbeddingEnv, userId: string, text: string, id?: string) {
  try {
    const values = await embed(env, text);
    if (!values) return { saved: "no-embed", vectorized: false };

    const key = id ?? crypto.randomUUID();
    await env.MEM_INDEX.upsert([{ id: key, values, metadata: { userId, text, ts: Date.now(), kind: "note" } }]);
    return { saved: key, vectorized: true };
  } catch (e) {
    console.error("vectorize upsert error", (e as Error)?.message);
    return { saved: "vectorize-error", vectorized: false };
  }
}

export async function searchContext(env: EmbeddingEnv, userId: string, query: string, k = 3) {
  try {
    const values = await embed(env, query);
    if (!values) return [];
    const res: any = await env.MEM_INDEX.query(values, { topK: k, filter: { userId } });
    const matches: any[] = res?.matches || [];
    return matches.map((m) => m?.metadata?.text as string).filter(Boolean);
  } catch (e) {
    console.error("vectorize query error", (e as Error)?.message);
    return [];
  }
}

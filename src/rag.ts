/// <reference types="@cloudflare/workers-types" />

export interface EmbeddingEnv {
  AI: Ai;
  MEM_INDEX: VectorizeIndex;
}

// Type the model names as keyof AiModels so TS is happy.
const MODEL_PRIMARY: keyof AiModels   = "@cf/baai/bge-small-en-v1.5";
const MODEL_FALLBACK: keyof AiModels  = "@cf/baai/bge-base-en-v1.5";

// Validate we actually have a 768-dim numeric vector.
function isGoodVec(v: unknown, dims = 768): v is number[] {
  return Array.isArray(v) &&
         v.length === dims &&
         v.every(n => typeof n === "number" && Number.isFinite(n));
}

async function tryEmbed(env: EmbeddingEnv, model: keyof AiModels, text: string): Promise<number[] | null> {
  try {
    const out: any = await env.AI.run(model, { text });
    let vec: any =
      Array.isArray(out?.data) ? out.data :
      Array.isArray(out?.embeddings) ? out.embeddings :
      (typeof out === "string" ? (JSON.parse(out).data as any) : null);

    if (Array.isArray(vec)) vec = vec.map(Number);
    return isGoodVec(vec) ? vec : null;
  } catch (e) {
    console.error("embed error", model, (e as Error)?.message);
    return null;
  }
}

export async function embed(env: EmbeddingEnv, text: string): Promise<number[] | null> {
  return (await tryEmbed(env, MODEL_PRIMARY, text))
      ?? (await tryEmbed(env, MODEL_FALLBACK, text));
}

export async function upsertNote(env: EmbeddingEnv, userId: string, text: string, id?: string) {
  try {
    const values = await embed(env, text);
    if (!isGoodVec(values)) return { saved: "no-embed", vectorized: false };

    const key = id ?? crypto.randomUUID();

    // Vectorize V2: some SDKs still have old TS types; force the V2 shape.
    await (env.MEM_INDEX as any).upsert([
      {
        id: key,
        values, // number[768]
        metadata: {
          userId: String(userId),
          text: String(text)
        }
      }
    ]);

    return { saved: key, vectorized: true };
  } catch (e) {
    console.error("vectorize upsert error", (e as Error)?.message);
    return { saved: "vectorize-error", vectorized: false };
  }
}

export async function searchContext(env: EmbeddingEnv, _userId: string, query: string, k = 3) {
  try {
    const values = await embed(env, query);
    if (!isGoodVec(values)) return [];

    // Vectorize V2 query shape (cast to bypass older TS defs)
    const res: any = await (env.MEM_INDEX as any).query({
      vector: values,
      topK: k
      // filter: { userId }  // add later if your index supports filtering
    });

    const matches: any[] = res?.matches || [];
    return matches.map(m => m?.metadata?.text as string).filter(Boolean);
  } catch (e) {
    console.error("vectorize query error", (e as Error)?.message);
    return [];
  }
}

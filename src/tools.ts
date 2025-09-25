/// <reference types="@cloudflare/workers-types" />

const ALLOW = ["blog.cloudflare.com", "developers.cloudflare.com", "news.ycombinator.com"];

export async function webFetch(url: string): Promise<string> {
  const u = new URL(url);
  if (!ALLOW.includes(u.hostname)) throw new Error("domain not allowed");
  const r = await fetch(u.toString(), { headers: { "user-agent": "cf-agent-demo" } });
  const txt = await r.text();
  // Return a trimmed snippet to avoid huge prompts
  return txt.slice(0, 3000);
}

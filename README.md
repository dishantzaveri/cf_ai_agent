# cf_ai_agents_do_chat

A sleek AI agent built entirely on **Cloudflare**:
- **LLM**: Workers AI (Llama 3.3 fast)
- **Memory**: Durable Object storage (chat history)
- **Workflow**: DO alarm schedules follow-ups
- **Realtime Input**: Web UI + WebSockets (also HTTP endpoints)

## Demo (local)
```bash
npm i
wrangler dev --local
# open http://127.0.0.1:8787

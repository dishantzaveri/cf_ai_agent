# cf_ai_agents_do_chat

🚀 **Dishant Zaveri’s Cloudflare AI Agent Project**  
Built for the Cloudflare AI optional assignment and to showcase my engineering skills for the **Software Engineer Intern (Winter/Spring 2026)** role.

---

## 👋 About Me

Hi! I’m **Dishant Zaveri**, a Master’s in Computer Science student at **Texas A&M University** (graduating May 2026).  
- 🌟 **8 published research papers** in machine learning, NLP, and quantitative analysis  
- 🏆 Hackathon champion (Singapore–India International Hackathon, Smart India Hackathon, UNESCO India–Africa, +15 more)  
- 🥇 LinkedIn Top Voice in Machine Learning (top 2% globally) with 10k+ followers  
- 💡 Passionate about **AI, distributed systems, and building at Internet scale**  
- 📍 Applying for **Cloudflare Software Engineer Intern (Winter/Spring 2026, Austin)**

This repo doubles as my **assignment submission** *and* a **portfolio project** that reflects the kind of impactful, production-ready systems I’d love to build at Cloudflare.

---

## 📖 Project Overview

This project demonstrates how to build an **AI-powered agent** entirely on the **Cloudflare platform**:

- **LLM**: Uses **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) for reasoning and conversation.  
- **Memory / State**:  
  - **Durable Objects** store recent conversation history.  
  - **Vectorize** index (`mem-index`, 768 dims) provides *long-term semantic memory*.  
- **Workflow**: Scheduled background tasks (alarms) that can run research jobs and auto-insert notes.  
- **User Input**:  
  - Interactive **web UI** (chat box, chips, history) served via Pages/Workers assets.  
  - **Realtime WebSocket** streaming of assistant replies.  
  - **Voice input** (Web Speech API in browser).  
- **Tools**: Simple “/search” command integrates with a safe fetcher to pull content (e.g., Cloudflare blog).  

---

## 🖼️ Demo UI

- `/` → opens chat interface  
- Features:  
  - 📝 Type prompts  
  - 🎙️ Voice input (speech → text)  
  - 📌 Save notes to long-term memory (`/note …`)  
  - 🔎 Run research (`/search <url>`)  
  - ⏰ Schedule background jobs (auto “follow-up” messages after N seconds)  
  - 🧠 Shows context chips retrieved from Vectorize memory  

---

## 🔧 Tech Stack

- **Cloudflare Workers** (TypeScript)  
- **Durable Objects** for state & coordination  
- **Workers AI** (Llama 3.3, BAAI BGE embeddings)  
- **Vectorize V2** for semantic memory (cosine similarity, 768 dims)  
- **Workflows (alarms)** for scheduled jobs  
- **Pages assets** for static frontend (HTML, CSS, JS)  

---


---

## 🚀 Run Locally

```bash
npm install
npx wrangler dev --local

wrangler deploy


Live URL (workers.dev):
👉 https://cf-agents-cf4242.dishantzaveri.workers.dev

API Endpoints

POST /api/chat
Body: { "userId": "dishant", "prompt": "Hello" }
→ { "reply": "Hi there!" }

GET /api/history
→ { "messages": [...] }

POST /api/note
Body: { "userId": "dishant", "text": "Save this memory" }
→ { "saved": "...", "vectorized": true }

POST /api/schedule
Body: { "seconds": 10, "note": "Follow-up!" }
→ { "scheduled": true }

WS /ws
Send { "type": "chat", "userId": "dishant", "text": "Hi" } → receives assistant messages in realtime.
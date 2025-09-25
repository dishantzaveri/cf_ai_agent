# cf_ai_agent — Cloudflare AI Agent Demo

This repository contains **Dishant Zaveri’s Cloudflare AI Agent project**, built as part of the **optional assignment** for the **Cloudflare Software Engineer Internship (Winter/Spring 2026)**.  
It showcases how to build a **full-stack AI-powered application** entirely on Cloudflare’s developer platform.

---

## 🌟 Features

- **LLM Integration**: Uses **Workers AI** with **Llama 3.3 Instruct** for reasoning and conversation.  
- **Durable Objects**: Provides persistent chat sessions, scheduling (alarms), and multi-user state.  
- **Vectorize**: Adds semantic memory (768-dim embeddings with `@cf/baai/bge-base-en-v1.5`) so the agent can “remember” facts about you.  
- **Realtime Communication**: WebSockets keep the chat UI live and responsive.  
- **Modern UI**: Custom Pages frontend with tabs (About, Project, Agent, Contact). Includes:
  - Chat interface with auto-scrolling conversation history
  - Preset chips for quick prompts
  - Note saving (`/note`)
  - Search tool (`/search <url>`)
  - Voice input (Web Speech API)
  - Clear chat button
- **Optional Assignment Ready**: Demonstrates all required components:
  - LLM (Workers AI)
  - Workflow/coordination (Durable Objects + alarms)
  - User input (chat + voice)
  - Memory/state (Durable Object storage + Vectorize)

---

## 🚀 Live Demo

👉 [https://cf-agents-cf4242.dishantzaveri.workers.dev](https://cf-agents-cf4242.dishantzaveri.workers.dev)

Open the demo, click **Talk to my Agent**, and start chatting!  
Examples:
- “Introduce yourself in one sentence.”  
- “/note Dishant has 8 published research papers.”  
- “What do you remember about me?”  
- “/search https://blog.cloudflare.com/”  

---

## 📂 Project Structure

```
cf_ai_agent/
├── public/             # Frontend UI (Pages assets)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/                # Cloudflare Worker & Durable Object
│   ├── index.ts        # Routes: /api/chat, /api/note, /api/schedule, /api/history, /api/clear, /ws
│   ├── agent.ts        # Durable Object logic (state, memory, scheduling)
│   └── rag.ts          # Vectorize (embedding + retrieval)
├── wrangler.toml       # Worker configuration
├── README.md           # Project documentation
└── PROMPTS.md          # AI prompts used during development
```

---

## 🛠️ Running Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start local dev server**
   ```bash
   wrangler dev --local
   ```

   Visit [http://localhost:8787](http://localhost:8787).

3. **Deploy to Cloudflare**
   ```bash
   wrangler deploy
   ```

   Ensure you have:
   - A **Durable Object** migration (`MyAgent`)
   - A **Vectorize index** created:
     ```bash
     npx wrangler vectorize create mem-index --dimensions=768 --metric=cosine
     ```

---

## 📖 API Endpoints

- **POST `/api/chat`** – Chat with the agent  
  ```json
  { "userId": "dishant", "prompt": "Say hi" }
  ```

- **POST `/api/note`** – Save a note into memory  
  ```json
  { "userId": "dishant", "text": "Dishant won the Singapore–India Hackathon" }
  ```

- **POST `/api/schedule`** – Schedule a reminder  
  ```json
  { "userId": "dishant", "seconds": 30, "note": "Follow-up reminder" }
  ```

- **GET `/api/history`** – Get conversation history  

- **POST `/api/clear`** – Clear all history/memory  

- **WS `/ws`** – Real-time WebSocket chat  

---

## 🧑‍💻 Author

**Dishant Zaveri**  
- Master’s in Computer Science @ Texas A&M University (graduating May 2026)  
- 8 published research papers (ML/Systems)  
- 15+ international hackathon wins (including Singapore–India Hackathon)  
- Ex-Jefferies Technical Associate (backend + microservices)  

📧 [zaveridishant@gmail.com](mailto:zaveridishant@gmail.com) |  
💼 [LinkedIn](https://www.linkedin.com/in/dishant-zaveri) |  
🖥️ [GitHub](https://github.com/dishantzaveri)

---

## 🙌 Notes

- Built fully on **Cloudflare’s developer platform** as part of the **internship application assignment**.  
- Shows enthusiasm for Cloudflare’s mission to build a better Internet — combining curiosity, engineering rigor, and design sense.  

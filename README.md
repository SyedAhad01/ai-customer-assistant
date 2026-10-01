# AI Customer Assistant

An AI-powered e-commerce refund assistant that validates requests against a strict policy, processes or denies refunds autonomously, and streams its reasoning in real time — with optional voice input.

---

## Why

Customer support teams spend a disproportionate amount of time on refund requests that have clear, rule-based answers. Most of these decisions are repetitive, yet they require human agents to look up orders, check policies, and apply judgment — creating inconsistency, delay, and cost.

This project demonstrates that an LLM agent, given deterministic tools and a well-defined policy, can handle these decisions **consistently, transparently, and at scale** — while still communicating empathetically. The admin reasoning log makes every decision auditable, allowing support managers to verify agent actions rather than treating the model as a black box.

---

## How

The system is built as a **tool-calling agent loop** using LangGraph. On each customer message:

1. The agent calls tools in a strict order to gather facts before making any decision.
2. Every tool call and result is streamed live to both the customer (via SSE) and the admin dashboard (via WebSocket).
3. The final refund decision is always policy-grounded — the agent must call `check_refund_policy` before it is allowed to approve or deny.

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (port 3000)                      │
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │   Customer Chat UI   │      │       Admin Dashboard        │ │
│  │  (ChatInterface.tsx) │      │  (ReasoningLog + sessions)   │ │
│  │  + VoiceInput.tsx    │      │  (admin/page.tsx)            │ │
│  └──────────┬───────────┘      └──────────────┬───────────────┘ │
│             │ POST /api/chat (SSE)            │ WebSocket       │
└─────────────┼─────────────────────────────────┼─────────────────┘
              │                                 │
┌─────────────▼─────────────────────────────────▼──────────────────┐
│                   FASTAPI BACKEND (port 8000)                    │
│                                                                  │
│   /api/chat          ──► SSE stream (tokens, tool_call, result)  │
│   /api/admin/logs    ──► WebSocket broadcast                     │
│   /api/admin/sessions──► REST snapshot                           │
│   /api/health                                                    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    LANGGRAPH AGENT LOOP                   │   │
│  │                                                           │   │
│  │   ┌─────────┐    tool_calls?    ┌──────────────────────┐  │   │
│  │   │  agent  │ ────── yes ──────►│       ToolNode       │  │   │
│  │   │ (Gemini │◄──── result ──────│                      │  │   │
│  │   │   LLM)  │                   │  lookup_customer     │  │   │
│  │   └────┬────┘                   │  lookup_order        │  │   │
│  │        │ no tool calls          │  check_refund_policy │  │   │
│  │        ▼                        │  process_refund      │  │   │
│  │       END                       │  deny_refund         │  │   │
│  │                                 └──────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│                    ┌──────────────┐                              │
│                    │  Mock Data   │                              │
│                    │ customers.json                              │
│                    │ orders.json  │                              │
│                    │ refund_policy│                              │
│                    └──────────────┘                              │
└──────────────────────────────────────────────────────────────────┘


## Agent Tool Flow
Every refund conversation follows this strict sequence enforced by the system prompt:

Customer message
      │
      ▼
lookup_customer(customer_id)
      │
      ▼
lookup_order(order_id)
      │
      ▼
check_refund_policy(situation description)
      │
      ├── ELIGIBLE ──► process_refund(order_id, amount)
      │
      └── NOT ELIGIBLE ──► deny_refund(order_id, reason + policy rule)


## What Features


Conversational refund handling — customers describe their issue in natural language

Policy-grounded decisions — agent checks a strict refund policy before every approve/deny

Real-time reasoning log — admin dashboard shows every tool call and result as it happens

Voice input — ElevenLabs speech-to-text lets customers speak instead of type

Refund status badge — visual APPROVED / DENIED / PENDING indicator per session

Session memory — LangGraph checkpointing maintains conversation context across turns


## Tech Stack

Layer                                          Technology

LLMGoogle                                     Gemini gemini-3.5-flash-lite
Agent framework                               LangGraph + LangChain
Backend                                       FastAPI + Python 3.12
Streaming                                     Server-Sent Events (chat) + WebSocket (admin)
Frontend                                      Next.js 15 (App Router) + TailwindCSS
Voice                                         ElevenLabs Speech-to-Text


## Project Structure

ai-customer-assistant/
├── backend/
│   ├── agent/
│   │   ├── graph.py        # LangGraph agent loop
│   │   ├── tools.py        # 5 refund tools
│   │   ├── prompts.py      # System prompt + strict tool ordering rules
│   │   └── state.py        # AgentState definition
│   ├── data/
│   │   ├── customers.json  # 15 mock CRM profiles
│   │   ├── orders.json     # Mock order records
│   │   └── refund_policy.md
│   ├── main.py             # FastAPI app, SSE + WebSocket endpoints
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Customer chat page
│       │   └── admin/page.tsx  # Admin dashboard
│       └── components/
│           ├── ChatInterface.tsx
│           ├── VoiceInput.tsx
│           ├── ReasoningLog.tsx
│           └── RefundBadge.tsx
├── docker-compose.yml
└── .env.example


##Getting Started

*Prerequisites

Docker + Docker Compose
Or: Python 3.12+ and Node.js 18+ for local development



## Clone and configure environment


git clone [https://github.com/SyedAhad01/ai-customer-assistant.git](https://github.com/SyedAhad01/ai-customer-assistant.git)
cd ai-customer-assistant
cp .env.example .env


## Run locally (without Docker)

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add your keys
uvicorn main:app --reload --port 8000
```

**Frontend** (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000.

---

## Usage

### Customer flow

1. Open http://localhost:3000
2. Start the conversation — the agent will ask for your **Customer ID** and **Order ID**
3. Describe your refund reason
4. The agent looks up your account and order, checks the refund policy, then approves or denies with a clear explanation

### Admin flow

1. Open http://localhost:3000/admin in a separate tab
2. Watch tool calls, results, and final decisions appear in real time as customers chat
3. Each session shows its reasoning log and refund outcome

### Sample Customer IDs

The mock CRM contains 15 customer profiles. Try: `CUST001` through `CUST015`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `ELEVENLABS_API_KEY` | No | ElevenLabs key for voice input |
| `ELEVENLABS_VOICE_ID` | No | ElevenLabs voice ID for STT | 

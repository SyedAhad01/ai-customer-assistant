import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from pydantic import BaseModel

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from agent.graph import graph


# ── In-memory stores ────────────────────────────────────────────────────────
sessions: dict[str, dict] = {}
admin_connections: list[WebSocket] = []


# ── Startup / shutdown ───────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AI Customer Support Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str | None = None
    customer_id: str | None = None
    message: str


# ── Admin broadcast helper ───────────────────────────────────────────────────
async def broadcast_log(event: dict):
    payload = json.dumps(event)
    dead = []
    for ws in admin_connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        admin_connections.remove(ws)


# ── SSE helper ───────────────────────────────────────────────────────────────
def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ── Chat endpoint (SSE) ──────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())

    if session_id not in sessions:
        sessions[session_id] = {
            "session_id": session_id,
            "customer_id": request.customer_id or "",
            "created_at": datetime.now().isoformat(),
            "refund_decision": "PENDING",
            "decision_reason": "",
            "reasoning_log": [],
        }

    config = {"configurable": {"thread_id": session_id}}
    initial_state = {
        "session_id": session_id,
        "customer_id": request.customer_id or sessions[session_id].get("customer_id", ""),
        "messages": [HumanMessage(content=request.message)],
        "reasoning_log": [],
        "refund_decision": "PENDING",
        "decision_reason": "",
        "order_id": "",
    }

    async def event_stream() -> AsyncGenerator[str, None]:
        yield sse_event({"type": "session", "session_id": session_id})

        try:
            async for event in graph.astream(initial_state, config=config, stream_mode="values"):
                messages = event.get("messages", [])
                if not messages:
                    continue

                last = messages[-1]

                # Stream AI text tokens
                if isinstance(last, AIMessage):
                    if last.content and isinstance(last.content, str):
                        yield sse_event({"type": "token", "content": last.content})

                    # Stream tool call announcements
                    if hasattr(last, "tool_calls") and last.tool_calls:
                        for tc in last.tool_calls:
                            log_entry = {
                                "step": f"Calling tool: {tc['name']}",
                                "tool": tc["name"],
                                "input": tc.get("args", {}),
                                "output": None,
                                "timestamp": datetime.now().isoformat(),
                            }
                            yield sse_event({"type": "tool_call", "data": log_entry})
                            await broadcast_log({
                                "session_id": session_id,
                                "type": "tool_call",
                                "data": log_entry,
                            })

                # Stream tool results
                elif isinstance(last, ToolMessage):
                    try:
                        result = json.loads(last.content)
                    except Exception:
                        result = last.content

                    log_entry = {
                        "step": f"Tool result: {last.name}",
                        "tool": last.name,
                        "input": {},
                        "output": result,
                        "timestamp": datetime.now().isoformat(),
                    }
                    sessions[session_id]["reasoning_log"].append(log_entry)

                    # Detect decision from tool result
                    if isinstance(result, dict):
                        if result.get("status") == "APPROVED":
                            sessions[session_id]["refund_decision"] = "APPROVED"
                            sessions[session_id]["decision_reason"] = result.get("message", "")
                        elif result.get("status") == "DENIED":
                            sessions[session_id]["refund_decision"] = "DENIED"
                            sessions[session_id]["decision_reason"] = result.get("reason", "")

                    yield sse_event({"type": "tool_result", "data": log_entry})
                    await broadcast_log({
                        "session_id": session_id,
                        "type": "tool_result",
                        "data": log_entry,
                    })

            # Final decision event
            decision = sessions[session_id]["refund_decision"]
            yield sse_event({
                "type": "done",
                "refund_decision": decision,
                "decision_reason": sessions[session_id]["decision_reason"],
            })
            await broadcast_log({
                "session_id": session_id,
                "type": "done",
                "refund_decision": decision,
            })

        except Exception as e:
            yield sse_event({"type": "error", "message": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Admin WebSocket ──────────────────────────────────────────────────────────
@app.websocket("/api/admin/logs")
async def admin_logs(websocket: WebSocket):
    await websocket.accept()
    admin_connections.append(websocket)
    try:
        # Send existing sessions on connect
        await websocket.send_text(json.dumps({
            "type": "init",
            "sessions": list(sessions.values()),
        }))
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in admin_connections:
            admin_connections.remove(websocket)


# ── Admin REST ───────────────────────────────────────────────────────────────
@app.get("/api/admin/sessions")
async def get_sessions():
    return {"sessions": list(sessions.values())}


@app.get("/api/admin/customers")
async def get_customers():
    data = json.loads((Path(__file__).parent / "data" / "customers.json").read_text())
    return {"customers": data}


@app.get("/api/admin/orders")
async def get_orders():
    data = json.loads((Path(__file__).parent / "data" / "orders.json").read_text())
    return {"orders": data}


@app.get("/api/admin/policy")
async def get_policy():
    content = (Path(__file__).parent / "data" / "refund_policy.md").read_text()
    return {"content": content}


@app.get("/api/health")
async def health():
    return {"status": "ok"}

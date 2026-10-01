from typing import Annotated, Any
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class ReasoningEntry(TypedDict):
    step: str
    tool: str
    input: dict
    output: Any
    timestamp: str


class AgentState(TypedDict):
    session_id: str
    customer_id: str
    messages: Annotated[list, add_messages]
    reasoning_log: list[ReasoningEntry]
    refund_decision: str          # "APPROVED" | "DENIED" | "PENDING"
    decision_reason: str
    order_id: str

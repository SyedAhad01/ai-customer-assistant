from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from .state import AgentState
from .tools import ALL_TOOLS
from .prompts import SYSTEM_PROMPT


def _should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


def _call_agent(state: AgentState) -> dict:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0
    )
    llm_with_tools = llm.bind_tools(ALL_TOOLS)

    customer_id = state.get("customer_id", "").strip()

    system_prompt = SYSTEM_PROMPT

    if customer_id:
        system_prompt += f"""

The application has already provided the customer ID: {customer_id}.
Use this customer ID directly. Do not ask the customer to provide it again.
"""

    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


def build_graph() -> StateGraph:
    builder = StateGraph(AgentState)

    builder.add_node("agent", _call_agent)
    builder.add_node("tools", ToolNode(ALL_TOOLS))

    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", _should_continue, {"tools": "tools", END: END})
    builder.add_edge("tools", "agent")

    return builder.compile(checkpointer=MemorySaver())


graph = build_graph()

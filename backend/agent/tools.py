import json
from datetime import datetime
from pathlib import Path
from langchain_core.tools import tool

DATA_DIR = Path(__file__).parent.parent / "data"


def _load_json(filename: str) -> list:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


def _load_policy() -> str:
    return (DATA_DIR / "refund_policy.md").read_text()


@tool
def lookup_customer(customer_id: str) -> dict:
    """Look up a customer profile by customer_id. Returns customer details or an error if not found."""
    customers = _load_json("customers.json")
    for customer in customers:
        if customer["customer_id"].upper() == customer_id.strip().upper():
            return {"found": True, "customer": customer}
    return {"found": False, "error": f"No customer found with ID {customer_id}"}


@tool
def lookup_order(order_id: str, customer_id: str) -> dict:
    """Look up an order by order_id and verify it belongs to the given customer_id.
    Always pass the customer_id obtained from lookup_customer to prevent cross-customer access."""
    order_id_upper = order_id.strip().upper()
    customer_id_upper = customer_id.strip().upper()
    orders = _load_json("orders.json")
    for order in orders:
        if order["order_id"].upper() == order_id_upper:
            if order["customer_id"].upper() != customer_id_upper:
                return {
                    "found": False,
                    "error": f"Order {order_id} does not belong to customer {customer_id}. Cannot process this request.",
                }
            return {"found": True, "order": order}
    return {"found": False, "error": f"No order found with ID {order_id}"}


@tool
def check_refund_policy(situation: str) -> dict:
    """
    Evaluate whether a refund situation is eligible based on the refund policy.
    Provide a detailed description of the situation including: customer tier,
    product category, whether item is opened, is_sale_item, days_since_purchase,
    and the reason for return.
    Returns a policy analysis with eligibility decision and applicable rules.
    """
    policy = _load_policy()
    return {
        "policy_document": policy,
        "situation": situation,
        "instruction": (
            "Analyze the situation against every rule in the policy document above. "
            "Determine if the refund is ELIGIBLE or NOT ELIGIBLE, and list the exact "
            "rule numbers that apply. Return your analysis as part of your next response."
        ),
    }


@tool
def process_refund(order_id: str, refund_amount: float) -> dict:
    """
    Approve and process a refund for the given order_id and amount.
    Call this only after check_refund_policy confirms eligibility.
    """
    return {
        "status": "APPROVED",
        "order_id": order_id,
        "refund_amount": refund_amount,
        "refund_id": f"REF-{order_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "message": f"Refund of ${refund_amount:.2f} approved for order {order_id}. "
                   f"Funds will be returned to the original payment method within 3–5 business days.",
    }


@tool
def deny_refund(order_id: str, reason: str) -> dict:
    """
    Deny a refund request for the given order_id with an explanation.
    Always provide the specific policy rule number(s) that make the request ineligible.
    """
    return {
        "status": "DENIED",
        "order_id": order_id,
        "reason": reason,
        "message": f"Refund denied for order {order_id}. Reason: {reason}",
    }


ALL_TOOLS = [lookup_customer, lookup_order, check_refund_policy, process_refund, deny_refund]

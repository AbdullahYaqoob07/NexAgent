"""Stripe — create payments, retrieve charges, manage customers."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class Stripe(BaseNode):
    definition = NodeDefinition(
        type="Stripe",
        display_name="Stripe",
        description="Create payment intents, retrieve charges, and manage Stripe customers.",
        category="Integrations",
        icon="💳",
        color="#635BFF",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="create_payment_intent",
                options=[
                    SelectOption(value="create_payment_intent", label="Create Payment Intent"),
                    SelectOption(value="retrieve_payment_intent", label="Retrieve Payment Intent"),
                    SelectOption(value="create_customer", label="Create Customer"),
                    SelectOption(value="retrieve_customer", label="Retrieve Customer"),
                    SelectOption(value="list_charges", label="List Charges"),
                ],
            ),
            NodeParameter(
                name="api_key",
                display_name="Secret Key",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Stripe secret key (sk_test_... or sk_live_...). Enter directly in the node config.",
                is_private=True,
            ),
            NodeParameter(
                name="amount",
                display_name="Amount (cents)",
                type=ParameterType.NUMBER,
                required=False,
                description="Amount in smallest currency unit (e.g. 1000 = $10.00 USD). Required for Create Payment Intent.",
                placeholder="1000",
                min_value=1,
            ),
            NodeParameter(
                name="currency",
                display_name="Currency",
                type=ParameterType.STRING,
                required=False,
                default="usd",
                placeholder="usd",
            ),
            NodeParameter(
                name="payment_intent_id",
                display_name="Payment Intent ID",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Stripe PaymentIntent ID (pi_...). Required for Retrieve Payment Intent.",
                placeholder="pi_3abc...",
            ),
            NodeParameter(
                name="customer_email",
                display_name="Customer Email",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Email address. Required for Create Customer.",
                placeholder="user@example.com",
            ),
            NodeParameter(
                name="customer_name",
                display_name="Customer Name",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Full name. Used for Create Customer.",
                placeholder="John Doe",
            ),
            NodeParameter(
                name="customer_id",
                display_name="Customer ID",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Stripe Customer ID (cus_...). Required for Retrieve Customer.",
                placeholder="cus_abc...",
            ),
            NodeParameter(
                name="limit",
                display_name="Limit",
                type=ParameterType.NUMBER,
                required=False,
                default=10,
                description="Number of results to return for List Charges (max 100).",
            ),
        ],
        outputs=[
            NodeOutputField(name="payment_id", display_name="Payment ID", type="string"),
            NodeOutputField(name="status", display_name="Status", type="string"),
            NodeOutputField(name="amount", display_name="Amount", type="number"),
            NodeOutputField(name="currency", display_name="Currency", type="string"),
            NodeOutputField(name="client_secret", display_name="Client Secret", type="string"),
            NodeOutputField(name="customer_id", display_name="Customer ID", type="string"),
            NodeOutputField(name="data", display_name="Raw Data", type="object"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        operation = config.get("operation", "create_payment_intent")

        api_key = str(config.get("api_key") or "").strip()

        if not api_key:
            raise NodeExecutionError(
                "Stripe Secret Key is required. Enter it in the node config (sk_test_... or sk_live_...).",
                self.definition.type,
            )

        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            }
            base_url = "https://api.stripe.com/v1"

            async with httpx.AsyncClient(timeout=30) as client:

                if operation == "create_payment_intent":
                    amount = int(config.get("amount") or 0)
                    currency = str(config.get("currency") or "usd").strip()
                    if amount <= 0:
                        raise NodeExecutionError(
                            "Amount must be greater than 0 for Create Payment Intent.",
                            self.definition.type,
                        )
                    r = await client.post(
                        f"{base_url}/payment_intents",
                        headers=headers,
                        data={"amount": str(amount), "currency": currency},
                    )
                    data = r.json()
                    if "error" in data:
                        raise NodeExecutionError(f"Stripe error: {data['error']['message']}", self.definition.type)
                    return {
                        "payment_id": data.get("id", ""),
                        "status": data.get("status", ""),
                        "amount": data.get("amount", 0),
                        "currency": data.get("currency", ""),
                        "client_secret": data.get("client_secret", ""),
                        "customer_id": data.get("customer") or "",
                        "data": data,
                    }

                elif operation == "retrieve_payment_intent":
                    pi_id = str(config.get("payment_intent_id") or "").strip()
                    if not pi_id:
                        raise NodeExecutionError(
                            "Payment Intent ID is required for Retrieve Payment Intent.",
                            self.definition.type,
                        )
                    r = await client.get(f"{base_url}/payment_intents/{pi_id}", headers=headers)
                    data = r.json()
                    if "error" in data:
                        raise NodeExecutionError(f"Stripe error: {data['error']['message']}", self.definition.type)
                    return {
                        "payment_id": data.get("id", ""),
                        "status": data.get("status", ""),
                        "amount": data.get("amount", 0),
                        "currency": data.get("currency", ""),
                        "client_secret": data.get("client_secret", ""),
                        "customer_id": data.get("customer") or "",
                        "data": data,
                    }

                elif operation == "create_customer":
                    email = str(config.get("customer_email") or "").strip()
                    name = str(config.get("customer_name") or "").strip()
                    if not email:
                        raise NodeExecutionError(
                            "Customer Email is required for Create Customer.",
                            self.definition.type,
                        )
                    form_data: Dict[str, str] = {"email": email}
                    if name:
                        form_data["name"] = name
                    r = await client.post(f"{base_url}/customers", headers=headers, data=form_data)
                    data = r.json()
                    if "error" in data:
                        raise NodeExecutionError(f"Stripe error: {data['error']['message']}", self.definition.type)
                    return {
                        "customer_id": data.get("id", ""),
                        "status": "created",
                        "payment_id": "",
                        "amount": 0,
                        "currency": "",
                        "client_secret": "",
                        "data": data,
                    }

                elif operation == "retrieve_customer":
                    cus_id = str(config.get("customer_id") or "").strip()
                    if not cus_id:
                        raise NodeExecutionError(
                            "Customer ID is required for Retrieve Customer.",
                            self.definition.type,
                        )
                    r = await client.get(f"{base_url}/customers/{cus_id}", headers=headers)
                    data = r.json()
                    if "error" in data:
                        raise NodeExecutionError(f"Stripe error: {data['error']['message']}", self.definition.type)
                    return {
                        "customer_id": data.get("id", ""),
                        "status": data.get("deleted") and "deleted" or "active",
                        "payment_id": "",
                        "amount": 0,
                        "currency": "",
                        "client_secret": "",
                        "data": data,
                    }

                elif operation == "list_charges":
                    limit = int(config.get("limit") or 10)
                    limit = min(max(limit, 1), 100)
                    r = await client.get(
                        f"{base_url}/charges",
                        headers=headers,
                        params={"limit": limit},
                    )
                    data = r.json()
                    if "error" in data:
                        raise NodeExecutionError(f"Stripe error: {data['error']['message']}", self.definition.type)
                    charges = data.get("data", [])
                    return {
                        "payment_id": "",
                        "status": f"{len(charges)} charges retrieved",
                        "amount": sum(c.get("amount", 0) for c in charges),
                        "currency": charges[0].get("currency", "") if charges else "",
                        "client_secret": "",
                        "customer_id": "",
                        "data": data,
                    }

                else:
                    raise NodeExecutionError(
                        f"Unknown operation: '{operation}'", self.definition.type
                    )

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"Stripe request failed: {type(exc).__name__}: {exc}", self.definition.type)

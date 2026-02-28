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
        required_credentials=["stripe_secret_key"],
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
                name="amount",
                display_name="Amount (smallest currency unit)",
                type=ParameterType.NUMBER,
                required=False,
                description="Amount in smallest currency unit (e.g. cents for USD). Required for payment intent.",
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
                description="Stripe PaymentIntent ID (for retrieve operation)",
            ),
            NodeParameter(
                name="customer_email",
                display_name="Customer Email",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Email address (for create_customer operation)",
            ),
            NodeParameter(
                name="api_key",
                display_name="Secret Key",
                type=ParameterType.CREDENTIAL,
                required=False,
                description="Stripe secret key. Leave blank to use the key from Credentials.",
                is_private=True,
            ),
        ],
        outputs=[
            NodeOutputField(name="payment_id", display_name="Payment ID", type="string"),
            NodeOutputField(name="status", display_name="Status", type="string"),
            NodeOutputField(name="amount", display_name="Amount", type="number"),
            NodeOutputField(name="currency", display_name="Currency", type="string"),
            NodeOutputField(name="client_secret", display_name="Client Secret", type="string"),
            NodeOutputField(name="customer_id", display_name="Customer ID", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        operation = config.get("operation", "create_payment_intent")

        api_key = (
            config.get("api_key")
            or context.get_credential("stripe_secret_key", "secret_key", "")
        )

        if not api_key:
            from app.core.config import settings
            api_key = settings.STRIPE_SECRET_KEY

        if not api_key or api_key == "sk_test_example":
            raise NodeExecutionError(
                "Stripe secret key is required. Set it in the node config, "
                "Credentials, or STRIPE_SECRET_KEY environment variable.",
                self.definition.type,
            )

        try:
            import httpx
            headers = {"Authorization": f"Bearer {api_key}"}
            base_url = "https://api.stripe.com/v1"

            async with httpx.AsyncClient(timeout=30) as client:
                if operation == "create_payment_intent":
                    amount = int(config.get("amount", 0))
                    currency = config.get("currency", "usd")
                    if amount <= 0:
                        raise NodeExecutionError("Amount must be > 0 for payment intent", self.definition.type)

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
                        "customer_id": data.get("customer", "") or "",
                    }

                elif operation == "create_customer":
                    email = config.get("customer_email", "")
                    r = await client.post(
                        f"{base_url}/customers",
                        headers=headers,
                        data={"email": email},
                    )
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
                    }

                else:
                    raise NodeExecutionError(
                        f"Operation '{operation}' not yet implemented.", self.definition.type
                    )

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"Stripe request failed: {exc}", self.definition.type)

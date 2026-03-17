# Business Automation Nodes & MCP Architecture Guide

This document outlines: 1. **Business-focused nodes** to add to the
workflow platform 2. **Architecture design for MCP (Model Context
Protocol)** so AI capabilities do not affect deterministic workflow
execution.

Goal: Keep the **workflow engine deterministic and reliable**, while
allowing **AI agents to use MCP tools** separately.

------------------------------------------------------------------------

# Part 1 --- Business Automation Node Library

## 1. Communication Nodes

These nodes allow businesses to communicate automatically with
customers.

### WhatsApp Automation Nodes

-   Send WhatsApp Message
-   Receive WhatsApp Message (Trigger)
-   WhatsApp Template Message
-   WhatsApp Broadcast Message

Example workflow:

    New Order → Send WhatsApp Confirmation

Implementation Notes: - Integrate using WhatsApp Cloud API or Twilio -
Node parameters: - phone_number - message_template - media_url
(optional)

------------------------------------------------------------------------

### SMS Nodes

SMS is still widely used in Pakistan.

Nodes:

-   Send SMS
-   Send OTP
-   Bulk SMS Sender

Example automation:

    Order Shipped → Send SMS Notification

------------------------------------------------------------------------

## 2. Payment Automation Nodes

Important for e-commerce and SMEs.

Suggested nodes:

-   Create Payment Link
-   Check Payment Status
-   Payment Received Trigger
-   Refund Payment

Possible integrations:

-   JazzCash
-   Easypaisa
-   PayFast

Example workflow:

    Invoice Created
        ↓
    Create Payment Link
        ↓
    Send WhatsApp Payment Request

------------------------------------------------------------------------

## 3. Logistics Automation Nodes

Suggested integrations:

-   TCS
-   Leopards Courier
-   BlueEX

Nodes:

-   Create Shipment
-   Track Shipment
-   Shipment Delivered Trigger
-   Cancel Shipment

Example workflow:

    New Order
       ↓
    Create Shipment
       ↓
    Send Tracking Number

------------------------------------------------------------------------

## 4. Order & Inventory Nodes

Nodes:

-   Create Order
-   Update Order
-   Get Order Details
-   Update Inventory
-   Low Stock Alert

Example workflow:

    Inventory Low
       ↓
    Send WhatsApp Alert

------------------------------------------------------------------------

## 5. Accounting & Finance Nodes

Suggested nodes:

-   Generate Invoice
-   Record Expense
-   Generate Sales Report
-   Export to Excel
-   Tax Calculation

Example automation:

    Order Completed
       ↓
    Generate Invoice
       ↓
    Send Invoice to Customer

------------------------------------------------------------------------

## 6. CRM & Lead Management Nodes

Nodes:

-   Save Lead
-   Update Lead
-   Tag Lead
-   Send Follow-up Message

Example automation:

    Website Form
       ↓
    Save Lead
       ↓
    Notify Sales Team

------------------------------------------------------------------------

# Part 2 --- MCP Architecture Integration

## Problem

If MCP is integrated directly into the workflow engine:

-   Node execution becomes probabilistic
-   Debugging workflows becomes difficult
-   Deterministic automation becomes unreliable

Therefore MCP must be **isolated from the workflow engine**.

------------------------------------------------------------------------

# Correct MCP Architecture

## Deterministic Layer (Workflow Engine)

This layer runs all normal nodes.

Examples:

-   HTTP Request
-   JSON Parser
-   Data Formatter
-   Logger
-   If Condition
-   Loop
-   Delay

Properties:

-   predictable execution
-   structured inputs and outputs
-   no LLM decisions

------------------------------------------------------------------------

## AI Agent Layer (Probabilistic)

AI nodes operate separately.

Examples:

-   OpenAI Chat Node
-   Claude Chat Node
-   AI Agent Node

These nodes may use:

-   LLM reasoning
-   dynamic tool selection
-   MCP tool execution

------------------------------------------------------------------------

# MCP Layer

MCP is only used by **AI nodes**, not by deterministic nodes.

Architecture:

    Workflow Engine
          |
          v
      AI Agent Node
          |
          v
      MCP Client
          |
          v
      MCP Tool Servers

------------------------------------------------------------------------

# MCP Client Implementation

Suggested directory structure:

    backend/ai/mcp/
        mcp_client.py
        tool_registry.py
        tool_executor.py

Responsibilities:

-   connect to MCP server
-   fetch available tools
-   execute tool calls
-   return results to AI node

------------------------------------------------------------------------

# AI Agent Node Example

    class AIAgentNode(BaseNode):

        async def execute(self, config, input_data, context):

            prompt = config["prompt"]

            llm_response = llm.generate(prompt)

            if llm_response.requires_tool:

                result = mcp_client.execute_tool(
                    tool_name=llm_response.tool,
                    arguments=llm_response.args
                )

                return result

            return llm_response.text

------------------------------------------------------------------------

# Architecture Summary

                    AI Workflow Generator
                            |
                            v
                    Workflow Canvas
                            |
                            v
                    Workflow Engine
                            |
             +--------------+--------------+
             |                             |
             v                             v
     Deterministic Nodes              AI Agent Node
     (HTTP, Parser, etc)                    |
                                            v
                                       MCP Client
                                            |
                                            v
                                    MCP Tool Servers

Benefits:

-   Deterministic automation stays stable
-   AI agents remain flexible
-   Workflows remain debuggable
-   System architecture stays clean

# NexAgent Workflow Nodes - Complete Guide

## Overview

NexAgent provides 20 pre-built workflow nodes organized into 6 categories. Each node represents a specific action or operation that can be performed within a workflow.

## Node Categories

### 1. TRIGGERS (3 nodes)
Entry points for workflow execution. Every workflow requires exactly ONE trigger node.

#### Manual Trigger
- **Type ID**: `manualtrigger`
- **Purpose**: User clicks Run button to start workflow
- **Configuration**: No configuration needed
- **Output**: Triggers workflow execution
- **Use Case**: On-demand workflow execution
- **Example**: User clicks "Process Order" button

#### Schedule Trigger
- **Type ID**: `scheduling`
- **Purpose**: Runs workflow at scheduled times
- **Configuration**: Cron expression (e.g., "0 9 * * MON" for 9 AM Monday)
- **Output**: Triggers workflow at specified time
- **Use Case**: Recurring tasks, daily reports, periodic checks
- **Example**: Send daily newsletter at 9 AM
- **Supported Timezones**: All standard timezones

#### Webhook Trigger
- **Type ID**: `webhook`
- **Purpose**: Triggered by external HTTP POST requests
- **Configuration**: Webhook URL generation
- **Output**: Receives data from external source
- **Use Case**: Integration with external systems, real-time events
- **Example**: Shopify order webhook triggers order processing workflow

---

### 2. COMMUNICATION (5 nodes)
Send data to external channels and services.

#### Chat Input
- **Type ID**: `chatinput`
- **Purpose**: Accepts user text input
- **Configuration**: 
  - Label: Display label for input field
  - Placeholder: Hint text
- **Output**: User-entered text
- **Use Case**: Collect user input, user prompts
- **Example**: "What is your question?" input field

#### Telegram Send
- **Type ID**: `telegramsend`
- **Purpose**: Send messages to Telegram bot channels
- **Configuration**:
  - Bot Token: Telegram bot API token
  - Chat ID: Target chat/channel ID
  - Message: Text to send (supports variables)
- **Output**: Confirmation of message sent
- **Use Case**: Notifications, alerts, user communication
- **Example**: Send order confirmation to customer via Telegram

#### Email Send
- **Type ID**: `emailsend`
- **Purpose**: Send emails with customizable templates
- **Configuration**:
  - Recipient: Email address
  - Subject: Email subject
  - Body: Email content (HTML supported)
  - Attachments: Optional file attachments
- **Output**: Confirmation of email sent
- **Use Case**: Notifications, reports, confirmations
- **Example**: Send invoice email to customer

#### Slack Message
- **Type ID**: `slackmessage`
- **Purpose**: Post messages to Slack channels
- **Configuration**:
  - Webhook URL: Slack webhook endpoint
  - Channel: Target channel
  - Message: Text to post
  - Attachments: Optional rich formatting
- **Output**: Confirmation of message posted
- **Use Case**: Team notifications, alerts, updates
- **Example**: Notify team of new customer signup

#### HTTP Request
- **Type ID**: `httprequest`
- **Purpose**: Make HTTP calls to external APIs
- **Configuration**:
  - Method: GET, POST, PUT, DELETE, PATCH
  - URL: API endpoint
  - Headers: Custom headers
  - Body: Request payload (JSON)
  - Authentication: API key, Bearer token
- **Output**: API response data
- **Use Case**: API integration, data fetching, external calls
- **Example**: Call third-party API to validate address

---

### 3. LOGIC (3 nodes)
Control workflow execution flow and branching.

#### Conditional
- **Type ID**: `conditional`
- **Purpose**: If/else branching based on conditions
- **Configuration**:
  - Condition: Expression to evaluate
  - Operators: ==, !=, >, <, >=, <=, contains, startsWith, endsWith
  - True Branch: Nodes to execute if true
  - False Branch: Nodes to execute if false
- **Output**: Branches execution based on condition
- **Use Case**: Decision making, routing, filtering
- **Example**: If order amount > $100, apply premium shipping

#### Loop
- **Type ID**: `loop`
- **Purpose**: Repeats execution for each item in array
- **Configuration**:
  - Items: Array to iterate over
  - Iterator Variable: Name of current item variable
  - Max Iterations: Safety limit (default: 1000)
- **Output**: Executes child nodes for each item
- **Use Case**: Batch processing, bulk operations
- **Example**: Process each item in order line items

#### Delay
- **Type ID**: `delay`
- **Purpose**: Pauses execution for specified duration
- **Configuration**:
  - Duration: Time to wait (milliseconds)
  - Unit: ms, seconds, minutes, hours
- **Output**: Resumes execution after delay
- **Use Case**: Rate limiting, scheduled pauses, retry delays
- **Example**: Wait 5 seconds before retrying failed API call

---

### 4. DATA PROCESSING (3 nodes)
Transform and process information between nodes.

#### Data Formatter
- **Type ID**: `dataformatter`
- **Purpose**: Transform data according to format rules
- **Configuration**:
  - Input Data: Source data
  - Format Rules: Transformation rules
  - Output Format: Desired output structure
- **Output**: Formatted data
- **Use Case**: Data transformation, normalization, mapping
- **Example**: Convert CSV to JSON format

#### JSON Parser
- **Type ID**: `jsonparser`
- **Purpose**: Parse and validate JSON strings
- **Configuration**:
  - JSON String: Input JSON text
  - Schema: Optional validation schema
  - Strict Mode: Enforce strict parsing
- **Output**: Parsed JSON object
- **Use Case**: Parse API responses, validate JSON
- **Example**: Parse webhook payload JSON

#### Logger
- **Type ID**: `logger`
- **Purpose**: Output data for debugging and logging
- **Configuration**:
  - Log Level: Info, Warning, Error
  - Message: Text to log
  - Data: Data to include in log
- **Output**: Logged to execution history
- **Use Case**: Debugging, monitoring, audit trail
- **Example**: Log workflow progress at each step

---

### 5. INTEGRATIONS (3 nodes)
Connect to external services and platforms.

#### Google Sheets
- **Type ID**: `googlesheets`
- **Purpose**: Read/write data to Google Sheets
- **Configuration**:
  - Sheet ID: Google Sheets document ID
  - API Key: Google API key
  - Sheet Name: Target sheet name
  - Range: Cell range (e.g., "A1:C10")
  - Operation: Read or Write
- **Output**: Sheet data or confirmation
- **Use Case**: Data storage, reporting, data sync
- **Example**: Write customer data to Google Sheet

#### Google Drive
- **Type ID**: `googledrive`
- **Purpose**: Upload/download files from Google Drive
- **Configuration**:
  - API Key: Google API key
  - Folder ID: Target folder ID
  - File Name: Name of file
  - Operation: Upload or Download
  - File Type: MIME type
- **Output**: File URL or file content
- **Use Case**: File management, document storage
- **Example**: Upload generated report to Google Drive

#### Stripe
- **Type ID**: `stripe`
- **Purpose**: Process payments and manage transactions
- **Configuration**:
  - API Key: Stripe API key
  - Operation: Create charge, Create customer, etc.
  - Amount: Payment amount (in cents)
  - Currency: Currency code (USD, EUR, etc.)
  - Customer: Customer ID or email
- **Output**: Transaction confirmation
- **Use Case**: Payment processing, billing
- **Example**: Process customer payment for order

---

### 6. AI/ML (2 nodes)
Provide intelligent processing capabilities.

#### OpenAI
- **Type ID**: `openai`
- **Purpose**: Generate text using GPT models
- **Configuration**:
  - API Key: OpenAI API key
  - Model: gpt-4, gpt-3.5-turbo, etc.
  - Prompt: Text prompt for AI
  - Temperature: Creativity level (0-1)
  - Max Tokens: Maximum response length
  - System Message: AI behavior instructions
- **Output**: AI-generated text
- **Use Case**: Content generation, summarization, analysis
- **Example**: Generate product description from features

#### Claude AI
- **Type ID**: `claudeai`
- **Purpose**: Generate text using Claude models
- **Configuration**:
  - API Key: Anthropic API key
  - Model: claude-3-opus, claude-3-sonnet, etc.
  - Prompt: Text prompt for AI
  - Temperature: Creativity level (0-1)
  - Max Tokens: Maximum response length
  - System Message: AI behavior instructions
- **Output**: AI-generated text
- **Use Case**: Content generation, analysis, reasoning
- **Example**: Analyze customer feedback sentiment

---

## Variable Substitution

All nodes support variable substitution using the syntax: `{{$node.nodeId.fieldName}}`

### Examples
- `{{$node.chatinput_1.value}}` - Get value from Chat Input node
- `{{$node.openai_1.output}}` - Get output from OpenAI node
- `{{$node.loop_1.currentItem}}` - Get current loop item
- `{{$trigger.input}}` - Get trigger input data

---

## Node Configuration Modals

Each node type has a configuration modal for setting parameters:

### Modal Components
- Text inputs for strings
- Number inputs for numeric values
- Dropdowns for selections
- Textarea for long text
- Toggle switches for boolean values
- File uploads for attachments

### Validation
- Required field validation
- Format validation (email, URL, etc.)
- Range validation (min/max)
- Custom validation rules

---

## Node Execution Order

Nodes execute in dependency order:
1. Trigger node executes first
2. Connected nodes execute based on edges
3. Parallel nodes execute simultaneously
4. Sequential nodes wait for previous completion
5. Conditional branches execute based on condition
6. Loop nodes repeat for each item

---

## Error Handling

Each node can be configured with error handling:
- **Stop**: Stop workflow on error
- **Continue**: Skip node and continue
- **Retry**: Retry node execution (configurable attempts)

---

## Node Colors (UI)

- 🔵 **Blue**: Triggers
- 🟠 **Orange**: Communication
- 🟡 **Yellow**: Logic
- 🟢 **Green**: Data Processing
- 🔷 **Teal**: Integrations
- 🟣 **Violet**: AI/ML

---

## Common Workflow Patterns

### Pattern 1: User Input → AI → Send
```
Chat Input → OpenAI → Telegram Send
```

### Pattern 2: Schedule → Process → Log
```
Schedule → Data Formatter → Logger
```

### Pattern 3: Webhook → Conditional → Multiple Actions
```
Webhook → Conditional
├─ True → Email Send
└─ False → Logger
```

### Pattern 4: Loop → Process → Aggregate
```
Loop → HTTP Request → Data Formatter
```

### Pattern 5: Trigger → AI → Integration
```
Manual Trigger → Claude AI → Google Sheets
```

---

## Best Practices

1. **Always start with a trigger** - Every workflow needs one
2. **Use meaningful node names** - Makes debugging easier
3. **Add loggers** - Track workflow progress
4. **Handle errors** - Configure error handling strategy
5. **Test with sample data** - Verify before publishing
6. **Use variables** - Reference node outputs
7. **Optimize performance** - Minimize API calls
8. **Document workflows** - Add descriptions
9. **Version workflows** - Track changes
10. **Monitor executions** - Check logs regularly

---

## Troubleshooting

### Node Not Executing
- Check if trigger is configured
- Verify node is enabled
- Check error handling settings
- Review execution logs

### Variable Not Substituting
- Verify syntax: `{{$node.id.field}}`
- Check node ID is correct
- Ensure field exists in node output
- Check for typos

### API Errors
- Verify API credentials
- Check API rate limits
- Review API documentation
- Check request format

### Performance Issues
- Reduce number of nodes
- Optimize API calls
- Use caching where possible
- Monitor token usage

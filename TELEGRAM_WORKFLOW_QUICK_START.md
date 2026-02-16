# 🚀 Quick Start: Telegram Chat Workflow

## The Flow You'll Build

```
┌─────────────┐
│   Trigger   │  You click "Run"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Chat Input  │  You type your message here
└──────┬──────┘
       │  Message goes down to next node
       ▼
┌─────────────┐
│  Telegram   │  Message sent to your bot channel
│   Send      │  ✅ Message appears in Telegram!
└──────┬──────┘
       │  Result passed to logger
       ▼
┌─────────────┐
│   Logger    │  Shows: "✅ Sent! ID: 12345"
└─────────────┘
```

---

## Step 1: Create Telegram Bot (5 mins)

### Get Bot Token
1. Open Telegram
2. Search: `@BotFather` 
3. Send: `/newbot`
4. Follow prompts
5. **Copy Token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Create Test Channel
1. Open Telegram
2. Create new channel (Private)
3. Name it: `TestBot` (or anything)
4. Add your Bot to it:
   - Click channel settings
   - Add members
   - Search for your bot name
   - Give it "Post Messages" permission

### Get Channel ID
1. Open Telegram on desktop/web
2. Search: `@userinfobot`
3. Send: `/start`
4. Join your test channel
5. Send message in channel
6. Get info about message: **Channel ID**: `-100123456789`

**Save these TWO values:**
- Bot Token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- Chat ID: `-100123456789`

---

## Step 2: Build Workflow in Editor (2 mins)

### Drag Nodes onto Canvas

1. **Manual Trigger** (from Triggers category)
   - No config needed
   - This is your "Start" button

2. **Chat Input** (from Communication category)
   - User will type message here
   - No config needed yet

3. **Telegram Send** (from Communication category)
   - This sends the message
   - Will configure shortly

4. **Logger** (from Data category)
   - Shows result
   - No config needed

### Connect Nodes with Edges

Draw lines to connect:
```
Trigger → ChatInput → TelegramSend → Logger
```

---

## Step 3: Configure Telegram Send Node (1 min)

1. **Double-click** "Telegram Send" node
2. A config form opens with fields:
   - **Bot Token**: Paste your token
   - **Chat ID**: Paste your channel ID
   - **Message**: Enter `{{$node.chat_input_1.message}}`
   - **Parse Mode**: Leave as `HTML`

3. Click **Save**

**That's it!** ✅

---

## Step 4: Run the Workflow! (1 min)

1. On the canvas, find the **Red "Run" Button** (top right)
2. **Type a Message**:
   - The Chat Input node will show an input field
   - Type anything: "Hello World!" or "Test message"
3. Click **Run**
4. **Check Your Telegram Channel**
   - Message should appear! 🎉
5. Logger shows: "✅ Message sent! ID: 12345"

---

## Example Messages to Test

```
"Hello from NexAgent! 🚀"
"This is my workflow automation demo"
"Testing Telegram integration"
"⚡ Workflow automation is working!"
```

---

## Troubleshooting

### Message Not Appearing?

**Problem**: "Chat not found" error
- ✅ Make sure bot is admin in channel
- ✅ Check Chat ID is correct (negative number)
- ✅ Bot should have "Post Messages" permission

**Problem**: "Invalid token" error
- ✅ Check token format: `NUMBER:LETTERS`
- ✅ Make sure you copied entire token
- ✅ No extra spaces

**Problem**: "Network error" 
- ✅ Check internet connection
- ✅ Telegram API might be slow
- ✅ Try again in 5 seconds

---

## What's Happening Behind the Scenes

1. **You Click Run**
   - Frontend creates execution context
   
2. **Manual Trigger Fires**
   - Starts the workflow
   
3. **Chat Input Captures**
   - Gets your typed message: "Hello World!"
   - Stores it in execution context
   
4. **Telegram Send Executes**
   - Takes message template: `{{$node.chat_input_1.message}}`
   - Replaces variable: `"{{$node.chat_input_1.message}}"` → `"Hello World!"`
   - Calls backend: `POST /api/v1/telegram/send`
   - Backend sends to Telegram API
   - **Message appears in channel** ✅
   
5. **Logger Runs**
   - Shows: `"✅ Message sent! ID: 12345"`

---

## Security Notes

- ✅ Bot token is **never** shown in browser
- ✅ Backend validates everything
- ✅ Messages are encrypted in transit
- ✅ Only you have access to your bot

---

## Next Steps (After Demo Works)

Once this workflow is running, you can:

1. **Add more nodes**: HTTP Request, Conditional, Loop, etc.
2. **Use real data**: Connect to database, API, spreadsheet
3. **Schedule workflows**: Set them to run automatically
4. **Share workflows**: Publish to marketplace

---

## Video Demo Script (for FYP presentation)

```
"I built a workflow automation platform. Here's how it works:

1. I create a workflow with 4 nodes: Trigger, Chat Input, Telegram Send, Logger
2. I connect them together on the canvas
3. I configure the Telegram node with my bot token and channel ID
4. I click Run and type a message in the Chat Input
5. Instantly, the message appears in my Telegram channel!
6. The workflow logs the success

This demonstrates:
- Node-based workflow building ✅
- Data flow between nodes ✅
- Integration with external APIs (Telegram) ✅
- Real-time execution ✅

All without writing any code!"
```

---

**You're ready! Build and run the workflow now!** 🚀

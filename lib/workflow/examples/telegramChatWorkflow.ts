/**
 * Example: Simple Telegram Chat Workflow
 * 
 * Flow:
 * 1. Manual Trigger (start point)
 * 2. Chat Input (user types message)
 * 3. Telegram Send (sends to bot channel)
 * 4. Logger (shows result)
 */

export const TELEGRAM_CHAT_WORKFLOW = {
  id: "telegram_chat_demo",
  name: "Simple Telegram Chat",
  description: "Type a message and send it to your Telegram bot channel",
  
  nodes: [
    {
      id: "trigger_1",
      type: "ManualTrigger",
      name: "Start",
      position: { x: 100, y: 100 },
      config: {
        description: "Click to start the workflow"
      }
    },
    
    {
      id: "chat_input_1",
      type: "ChatInput",
      name: "Chat Input",
      position: { x: 300, y: 100 },
      config: {
        placeholder: "Type your message here...",
        maxLength: 4096
      }
    },
    
    {
      id: "telegram_1",
      type: "TelegramSend",
      name: "Send to Telegram",
      position: { x: 500, y: 100 },
      config: {
        botToken: "",  // User fills this
        chatId: "",    // User fills this
        message: "{{$node.chat_input_1.message}}", // Takes from Chat Input
        parseMode: "HTML"
      }
    },
    
    {
      id: "logger_1",
      type: "Logger",
      name: "Log Result",
      position: { x: 700, y: 100 },
      config: {
        message: "✅ Message sent! ID: {{$node.telegram_1.message_id}}"
      }
    }
  ],

  edges: [
    { source: "trigger_1", target: "chat_input_1" },
    { source: "chat_input_1", target: "telegram_1" },
    { source: "telegram_1", target: "logger_1" }
  ],

  variables: {}
};

/**
 * Step-by-step guide to set up this workflow:
 * 
 * 1. Create Telegram Bot:
 *    - Open Telegram, search @BotFather
 *    - Create bot, get TOKEN (123456:ABC-DEF...)
 * 
 * 2. Create Test Channel:
 *    - Create new channel (e.g., @MyTestChannel)
 *    - Add bot to channel with "Post Messages" permission
 *    - Get channel ID: @userinfobot → /start → copy Channel ID
 * 
 * 3. Set up Workflow:
 *    - Drag nodes onto canvas: Trigger → ChatInput → TelegramSend → Logger
 *    - Connect them with edges
 *    - Double-click TelegramSend
 *    - Enter Bot Token and Chat ID
 *    - Message template: {{$node.chat_input_1.message}}
 * 
 * 4. Run:
 *    - Type message in Chat Input node
 *    - Click "Run" button
 *    - See message in Telegram! ✅
 */

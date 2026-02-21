/**
 * Hardcoded Node Registry
 * All available nodes for the workflow editor
 */

export interface NodeDef {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  icon: string;
  isStartNode: boolean;
}

export const HARDCODED_NODES: NodeDef[] = [
  // ==================== TRIGGERS ====================
  {
    id: "manualtrigger",
    name: "Manual Trigger",
    type: "ManualTrigger",
    category: "Triggers",
    description: "Start workflow manually by clicking Run",
    icon: "⚡",
    isStartNode: true,
  },
  {
    id: "scheduling",
    name: "Schedule",
    type: "Scheduling",
    category: "Triggers",
    description: "Start workflow at scheduled times",
    icon: "🕐",
    isStartNode: true,
  },
  {
    id: "webhook",
    name: "Webhook",
    type: "Webhook",
    category: "Triggers",
    description: "Start workflow from external webhook",
    icon: "🪝",
    isStartNode: true,
  },

  // ==================== COMMUNICATION ====================
  {
    id: "chatinput",
    name: "Chat Input",
    type: "ChatInput",
    category: "Communication",
    description: "User enters text message",
    icon: "💬",
    isStartNode: false,
  },
  {
    id: "telegramsend",
    name: "Telegram Send",
    type: "TelegramSend",
    category: "Communication",
    description: "Send message to Telegram bot",
    icon: "📱",
    isStartNode: false,
  },
  {
    id: "emailsend",
    name: "Email Send",
    type: "EmailSend",
    category: "Communication",
    description: "Send email message",
    icon: "📧",
    isStartNode: false,
  },
  {
    id: "slack",
    name: "Slack Message",
    type: "SlackMessage",
    category: "Communication",
    description: "Send message to Slack channel",
    icon: "💬",
    isStartNode: false,
  },
  {
    id: "httprequest",
    name: "HTTP Request",
    type: "HTTPRequest",
    category: "Communication",
    description: "Make HTTP request to external API",
    icon: "🌐",
    isStartNode: false,
  },

  // ==================== LOGIC ====================
  {
    id: "conditional",
    name: "Conditional",
    type: "Conditional",
    category: "Logic",
    description: "Branch workflow based on conditions",
    icon: "🔀",
    isStartNode: false,
  },
  {
    id: "loop",
    name: "Loop",
    type: "Loop",
    category: "Logic",
    description: "Repeat actions for each item",
    icon: "🔄",
    isStartNode: false,
  },
  {
    id: "delay",
    name: "Delay",
    type: "Delay",
    category: "Logic",
    description: "Wait for specified time",
    icon: "⏱️",
    isStartNode: false,
  },

  // ==================== DATA ====================
  {
    id: "logger",
    name: "Logger",
    type: "Logger",
    category: "Data",
    description: "Log messages for debugging",
    icon: "📝",
    isStartNode: false,
  },
  {
    id: "dataformatter",
    name: "Data Formatter",
    type: "DataFormatter",
    category: "Data",
    description: "Transform and format data",
    icon: "🔧",
    isStartNode: false,
  },
  {
    id: "jsonparser",
    name: "JSON Parser",
    type: "JSONParser",
    category: "Data",
    description: "Parse and manipulate JSON data",
    icon: "{}",
    isStartNode: false,
  },

  // ==================== INTEGRATIONS ====================
  {
    id: "googlesheets",
    name: "Google Sheets",
    type: "GoogleSheets",
    category: "Integrations",
    description: "Read/Write to Google Sheets",
    icon: "📊",
    isStartNode: false,
  },
  {
    id: "googledrive",
    name: "Google Drive",
    type: "GoogleDrive",
    category: "Integrations",
    description: "Upload/Download files from Google Drive",
    icon: "☁️",
    isStartNode: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    type: "Stripe",
    category: "Integrations",
    description: "Handle Stripe payments and webhooks",
    icon: "💳",
    isStartNode: false,
  },

  // ==================== AI/ML ====================
  {
    id: "openai",
    name: "OpenAI",
    type: "OpenAI",
    category: "AI/ML",
    description: "Use OpenAI API (GPT, DALL-E, etc)",
    icon: "🤖",
    isStartNode: false,
  },
  {
    id: "claude",
    name: "Claude AI",
    type: "ClaudeAI",
    category: "AI/ML",
    description: "Use Anthropic Claude API",
    icon: "🧠",
    isStartNode: false,
  },

  // ==================== UTILITY ====================
  {
    id: "stopper",
    name: "Stopper",
    type: "Stopper",
    category: "Utility",
    description: "Workflow completion checkpoint and summary logger",
    icon: "🏁",
    isStartNode: false,
  },
];

/**
 * Get all nodes
 */
export function getAllNodes(): NodeDef[] {
  return HARDCODED_NODES;
}

/**
 * Get nodes by category
 */
export function getNodesByCategory(category: string): NodeDef[] {
  return HARDCODED_NODES.filter((node) => node.category === category);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(HARDCODED_NODES.map((node) => node.category));
  return Array.from(categories);
}

/**
 * Get node by type
 */
export function getNodeByType(type: string): NodeDef | undefined {
  return HARDCODED_NODES.find((node) => node.type === type);
}

/**
 * Search nodes by term (name or description)
 */
export function searchNodes(term: string): NodeDef[] {
  const lowerTerm = term.toLowerCase();
  return HARDCODED_NODES.filter(
    (node) =>
      node.name.toLowerCase().includes(lowerTerm) ||
      node.description.toLowerCase().includes(lowerTerm)
  );
}

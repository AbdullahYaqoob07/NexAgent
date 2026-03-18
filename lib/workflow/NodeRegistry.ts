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
    icon: "/assets/canvas/telegram.svg",
    isStartNode: false,
  },
  {
    id: "emailsend",
    name: "Email Send",
    type: "EmailSend",
    category: "Communication",
    description: "Send email message",
    icon: "/assets/canvas/gmail.svg",
    isStartNode: false,
  },
  {
    id: "slack",
    name: "Slack Message",
    type: "SlackMessage",
    category: "Communication",
    description: "Send message to Slack channel",
    icon: "/assets/canvas/slack.svg",
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
    icon: "/assets/canvas/logger-2.png",
    isStartNode: false,
  },
  {
    id: "variablesetter",
    name: "Variable Setter",
    type: "Variable Setter",
    category: "Data",
    description: "Store a value in a workflow variable for later use",
    icon: "/assets/canvas/variable-1.png",
    isStartNode: false,
  },
  {
    id: "dataformatter",
    name: "Data Formatter",
    type: "DataFormatter",
    category: "Data",
    description: "Transform and format data",
    icon: "/assets/canvas/formatter-3.png",
    isStartNode: false,
  },
  {
    id: "jsonparser",
    name: "JSON Parser",
    type: "JSONParser",
    category: "Data",
    description: "Parse and manipulate JSON data",
    icon: "/assets/canvas/json-1.svg",
    isStartNode: false,
  },

  // ==================== INTEGRATIONS ====================
  {
    id: "googlesheets",
    name: "Google Sheets",
    type: "GoogleSheets",
    category: "Integrations",
    description: "Read/Write to Google Sheets",
    icon: "/assets/canvas/sheets.png",
    isStartNode: false,
  },
  {
    id: "googledrive",
    name: "Google Drive",
    type: "GoogleDrive",
    category: "Integrations",
    description: "Upload/Download files from Google Drive",
    icon: "/assets/canvas/drive.svg",
    isStartNode: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    type: "Stripe",
    category: "Integrations",
    description: "Handle Stripe payments and webhooks",
    icon: "/assets/canvas/stripe.svg",
    isStartNode: false,
  },

  // ==================== DATABASES ====================
  {
    id: "postgresquery",
    name: "PostgreSQL Query",
    type: "PostgresQuery",
    category: "Databases",
    description: "Run SQL queries against PostgreSQL",
    icon: "🐘",
    isStartNode: false,
  },
  {
    id: "mongodbquery",
    name: "MongoDB Query",
    type: "MongoDBQuery",
    category: "Databases",
    description: "Run MongoDB find, insert, update, delete, and aggregate operations",
    icon: "🍃",
    isStartNode: false,
  },
  {
    id: "pineconequery",
    name: "Pinecone Query",
    type: "PineconeQuery",
    category: "Databases",
    description: "Run vector search and upsert operations on Pinecone",
    icon: "🌲",
    isStartNode: false,
  },

  // ==================== AI/ML ====================
  {
    id: "openai",
    name: "OpenAI",
    type: "OpenAI",
    category: "AI/ML",
    description: "Use OpenAI API (GPT, DALL-E, etc)",
    icon: "/assets/canvas/openai.svg",
    isStartNode: false,
  },
  {
    id: "claude",
    name: "Claude AI",
    type: "ClaudeAI",
    category: "AI/ML",
    description: "Use Anthropic Claude API",
    icon: "/assets/canvas/claude.svg",
    isStartNode: false,
  },
  {
    id: "groq",
    name: "Groq",
    type: "Groq",
    category: "AI/ML",
    description: "Ultra-fast free AI inference (Llama 3, Mixtral, Gemma)",
    icon: "/assets/canvas/groq-4.svg",
    isStartNode: false,
  },
  {
    id: "gemini",
    name: "Gemini",
    type: "Gemini",
    category: "AI/ML",
    description: "Google Gemini AI models — free tier via AI Studio",
    icon: "/assets/canvas/gemini-2.svg",
    isStartNode: false,
  },

  // ==================== UTILITY ====================
  {
    id: "stopper",
    name: "Stopper",
    type: "Stopper",
    category: "Utility",
    description: "Workflow completion checkpoint and summary logger",
    icon: "/assets/canvas/stop-1.svg",
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
 * Type aliases: maps backend/alternate type names to frontend NodeRegistry types
 */
const TYPE_ALIASES: Record<string, string> = {
  'IfCondition': 'Conditional',
  'If Condition': 'Conditional',
  'JsonParser': 'JSONParser',
  'JSON Parse': 'JSONParser',
  'Manual Trigger': 'ManualTrigger',
  'Slack Message': 'SlackMessage',
  'SetVariable': 'Variable Setter',
  'Schedule': 'Scheduling',
  'SendEmail': 'EmailSend',
  'Email Send': 'EmailSend',
  'HttpRequest': 'HTTPRequest',
  'HTTP Request': 'HTTPRequest',
  'Telegram Send': 'TelegramSend',
  'Slack Message': 'SlackMessage',
  'Manual Trigger': 'ManualTrigger',
  'DataFormatter': 'DataFormatter',
  'Data Formatter': 'DataFormatter',
  'Groq AI': 'Groq',
  'Claude AI': 'ClaudeAI',
  'Google Sheets': 'GoogleSheets',
  'Google Drive': 'GoogleDrive',
  'PostgreSQL Query': 'PostgresQuery',
  'MongoDB Query': 'MongoDBQuery',
  'Pinecone Query': 'PineconeQuery',
};

/**
 * Get node by type - handles type aliases from backend
 */
export function getNodeByType(type: string): NodeDef | undefined {
  if (!type) return undefined;

  let node = HARDCODED_NODES.find((n) => n.type === type);
  if (node) return node;

  const aliasedType = TYPE_ALIASES[type];
  if (aliasedType) {
    node = HARDCODED_NODES.find((n) => n.type === aliasedType);
    if (node) return node;
  }

  const lowerType = type.toLowerCase();
  node = HARDCODED_NODES.find((n) => n.type.toLowerCase() === lowerType);
  if (node) return node;

  node = HARDCODED_NODES.find((n) => n.name === type);
  if (node) return node;

  return undefined;
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

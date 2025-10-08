"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  Paperclip, 
  MoreHorizontal,
  Minimize2,
  Maximize2,
  X,
  Lightbulb,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  suggestions?: string[];
  workflowAction?: {
    type: "node_added" | "connection_made" | "workflow_generated";
    details: string;
  };
}

interface WorkflowAssistantProps {
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const initialMessages: Message[] = [
  {
    id: "welcome",
    type: "assistant",
    content: "👋 Hello! I'm your NexAgent Workflow Assistant. I'm here to help you build powerful automation workflows without any coding required.\n\nI can help you:\n• Design workflows from your business requirements\n• Suggest the right nodes and connections\n• Optimize your automation logic\n• Troubleshoot workflow issues\n\nWhat would you like to automate today?",
    timestamp: new Date(),
    suggestions: [
      "Help me automate customer onboarding",
      "Create an email notification system", 
      "Set up data processing workflow",
      "Build a lead qualification process"
    ]
  }
];

const commonSuggestions = [
  "How do I connect multiple APIs?",
  "What's the best way to handle errors?",
  "Can you help me with conditional logic?",
  "Show me workflow templates"
];

export function WorkflowAssistant({ 
  onClose, 
  isMinimized = false, 
  onToggleMinimize 
}: WorkflowAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateAssistantResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Simple response logic based on keywords
    const message = userMessage.toLowerCase();
    
    if (message.includes("customer") || message.includes("onboarding")) {
      return "Great! For customer onboarding automation, I recommend starting with these key components:\n\n🎯 **Trigger**: New customer signup (Webhook or Database trigger)\n📧 **Welcome Email**: Send personalized welcome message\n📋 **Profile Setup**: Create customer profile in CRM\n🔔 **Internal Notification**: Alert your team\n✅ **Follow-up**: Schedule check-in emails\n\nWould you like me to help you set up any of these specific steps?";
    }
    
    if (message.includes("email") || message.includes("notification")) {
      return "Perfect! Email automation is one of our most popular workflows. Here's what I can help you build:\n\n📧 **Email Types**:\n• Welcome sequences\n• Reminder notifications  \n• Status updates\n• Marketing campaigns\n\n🔧 **Integration Options**:\n• Gmail/Outlook\n• SendGrid\n• Mailchimp\n• Custom SMTP\n\nWhat type of email automation are you looking to create?";
    }
    
    if (message.includes("data") || message.includes("processing")) {
      return "Data processing workflows are excellent for automation! Here are some common patterns:\n\n📊 **Data Sources**:\n• CSV/Excel files\n• Database queries\n• API responses\n• Web scraping\n\n🔄 **Processing Steps**:\n• Data validation\n• Transformation & formatting\n• Filtering & sorting\n• Aggregation & analysis\n\n📤 **Output Options**:\n• Save to database\n• Generate reports\n• Send notifications\n• Trigger other workflows\n\nWhat kind of data are you working with?";
    }
    
    if (message.includes("lead") || message.includes("qualification")) {
      return "Lead qualification is a game-changer for sales teams! Here's a comprehensive approach:\n\n🎯 **Lead Scoring Factors**:\n• Company size & industry\n• Engagement level\n• Budget indicators\n• Timeline to purchase\n\n🔀 **Routing Logic**:\n• High-value leads → Senior sales rep\n• Warm leads → Inside sales\n• Cold leads → Nurture campaign\n\n📈 **Automation Benefits**:\n• 40% faster response times\n• Better lead distribution\n• Improved conversion rates\n\nShall we start building your lead qualification workflow?";
    }
    
    if (message.includes("api") || message.includes("connect")) {
      return "Connecting APIs is straightforward with NexAgent! Here's how to do it effectively:\n\n🔌 **Connection Steps**:\n1. **Authentication**: API keys, OAuth, or tokens\n2. **Request Setup**: Headers, parameters, body\n3. **Response Handling**: Parse JSON/XML data\n4. **Error Management**: Retry logic & fallbacks\n\n💡 **Best Practices**:\n• Use environment variables for secrets\n• Implement rate limiting\n• Add proper error handling\n• Log requests for debugging\n\nWhich APIs are you looking to integrate?";
    }
    
    if (message.includes("error") || message.includes("handle")) {
      return "Error handling is crucial for reliable workflows! Here are the strategies I recommend:\n\n🛡️ **Error Types**:\n• Network timeouts\n• API rate limits\n• Invalid data formats\n• Authentication failures\n\n🔄 **Recovery Strategies**:\n• **Retry Logic**: Exponential backoff\n• **Fallback Actions**: Alternative paths\n• **Manual Review**: Queue for human intervention\n• **Notifications**: Alert operators immediately\n\n✅ **Monitoring**:\n• Error rate dashboards\n• Alert thresholds\n• Detailed error logs\n\nWould you like help setting up error handling for a specific workflow?";
    }
    
    if (message.includes("conditional") || message.includes("logic") || message.includes("if")) {
      return "Conditional logic helps create smart, dynamic workflows! Here's how to use it:\n\n🔀 **Common Conditions**:\n• **Data Validation**: Check if fields are complete\n• **Business Rules**: Route based on criteria\n• **Time-based**: Different actions by day/time\n• **User Attributes**: Personalized flows\n\n🧩 **Logic Nodes**:\n• **IF Node**: Simple true/false branching\n• **Switch Node**: Multiple condition paths\n• **Filter Node**: Process only matching items\n• **Merge Node**: Combine multiple branches\n\n💡 **Pro Tips**:\n• Keep conditions simple and clear\n• Use descriptive node names\n• Test all possible paths\n• Document complex logic\n\nWhat kind of conditional logic do you need help with?";
    }
    
    if (message.includes("template") || message.includes("example")) {
      return "I have tons of proven workflow templates! Here are some popular categories:\n\n📋 **Business Templates**:\n• Customer onboarding sequences\n• Invoice processing & approval\n• Employee offboarding\n• Lead nurturing campaigns\n\n🔧 **Technical Templates**:\n• Data synchronization\n• File processing & backup\n• System monitoring alerts\n• API data aggregation\n\n📊 **Analytics Templates**:\n• Daily/weekly reports\n• Performance dashboards\n• Anomaly detection\n• Trend analysis\n\nWhich category interests you most? I can walk you through a specific template.";
    }
    
    // Default response
    return "I'd be happy to help you with that! To provide the most relevant guidance, could you tell me more about:\n\n🎯 **Your Goal**: What business process are you trying to automate?\n🔧 **Your Tools**: What systems/apps do you currently use?\n📊 **Your Data**: What information flows through your process?\n👥 **Your Team**: Who will be involved in this workflow?\n\nThe more details you share, the better I can tailor my recommendations to your specific needs.";
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      status: "sent"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await simulateAssistantResponse(userMessage.content);
      
      setIsTyping(false);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response,
        timestamp: new Date(),
        suggestions: Math.random() > 0.7 ? [
          "Tell me more about this",
          "Show me an example",
          "What are the next steps?",
          "How do I get started?"
        ] : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setIsTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "I apologize, but I encountered an issue processing your request. Please try again, and if the problem persists, our support team is here to help.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isMinimized) {
    return (
      <div className="w-12 bg-zinc-950 border-l border-zinc-800 flex flex-col items-center py-4">
        <Button
          onClick={onToggleMinimize}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-2 h-10 w-10 mb-4"
        >
          <Bot className="w-5 h-5" />
        </Button>
        <div className="w-1 flex-1 bg-zinc-800 rounded-full relative">
          <div className="absolute top-0 left-0 w-1 h-4 bg-[#FF6900] rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Workflow Assistant</div>
            <div className="text-xs text-zinc-400">AI-powered guidance</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <Button
              onClick={onToggleMinimize}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 h-8 w-8"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.type === "assistant" && (
              <div className="w-7 h-7 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[280px] ${
              message.type === "user" 
                ? "bg-[#FF6900] text-white rounded-2xl rounded-br-md" 
                : "bg-zinc-900 border border-zinc-800 text-white rounded-2xl rounded-bl-md"
            } px-4 py-3`}>
              <div className="text-sm leading-relaxed whitespace-pre-line">
                {message.content}
              </div>
              
              {message.suggestions && (
                <div className="mt-3 space-y-2">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left text-xs px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-zinc-500">
                  {new Date(message.timestamp).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                  })}
                </div>
                {message.type === "user" && (
                  <div className="flex items-center gap-1">
                    {message.status === "sending" && (
                      <Clock className="w-3 h-3 text-zinc-400" />
                    )}
                    {message.status === "sent" && (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    )}
                    {message.status === "error" && (
                      <AlertCircle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {message.type === "user" && (
              <div className="w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Quick starts
          </div>
          <div className="space-y-1">
            {commonSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full text-left text-xs px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about workflow automation..."
            className="resize-none bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 pr-12 min-h-[44px] max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="absolute right-2 bottom-2 bg-[#FF6900] hover:bg-[#E55D00] text-white p-2 h-8 w-8 disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WorkflowAssistant;
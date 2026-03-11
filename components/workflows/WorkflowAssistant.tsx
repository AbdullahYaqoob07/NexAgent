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
  sources?: string[];
  workflowAction?: {
    type: "node_added" | "connection_made" | "workflow_generated";
    details: string;
  };
}

interface WorkflowAssistantProps {
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  getCurrentCanvasState?: () => any;
  onApplyWorkflowPatch?: (patchObj: any) => void;
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

const STORAGE_KEY = "nexagent_assistant_messages";

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Message[];
      // Restore Date objects from JSON strings
      return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch {
    // ignore
  }
  return initialMessages;
}

export function WorkflowAssistant({ 
  onClose, 
  isMinimized = false, 
  onToggleMinimize,
  getCurrentCanvasState,
  onApplyWorkflowPatch
}: WorkflowAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    let sessionId = sessionStorage.getItem('nxa_session');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('nxa_session', sessionId);
    }
    sessionIdRef.current = sessionId;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const cleanMarkdownFormatting = (text: string): string => {
    // Process line by line to handle list items vs bold text
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      let processedLine = line;
      
      // Handle lines that start with "** " or "* " (list items)
      const listMatch = processedLine.match(/^(\*+)\s+(.*)$/);
      if (listMatch) {
        // This is a list item - normalize to single asterisk
        processedLine = '* ' + listMatch[2];
        
        // Still need to handle bold within the list item text
        // Normalize any remaining asterisks in the content
        const content = listMatch[2];
        const normalizedContent = content.replace(/\*{1,3}/g, '**');
        processedLine = '* ' + normalizedContent;
      } else {
        // Not a list item - normalize all asterisks for bold
        processedLine = processedLine.replace(/\*{1,3}/g, '**');
      }
      
      // Ensure proper ** pairing within the line
      const count = (processedLine.match(/\*\*/g) || []).length;
      
      // If odd number of **, close the bold at end of line
      if (count % 2 === 1) {
        // Add closing ** if line doesn't already end with it
        if (!processedLine.endsWith('**')) {
          processedLine = processedLine + '**';
        } else {
          // Line ends with ** but count is odd - there's an opening one somewhere
          // Add one at the start if it doesn't start with **
          if (!processedLine.startsWith('**') && !processedLine.startsWith('* ')) {
            processedLine = '**' + processedLine;
          }
        }
      }
      
      return processedLine;
    });
    
    return processedLines.join('\n');
  };

  const renderMarkdown = (text: string) => {
    // Split by new lines
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Check if this is a list item
      const isListItem = line.trim().startsWith('* ');
      const lineContent = isListItem ? line.trim().substring(2) : line;
      
      // Split the line into parts (text and bold sections)
      const parts = [];
      let lastIndex = 0;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;
      
      while ((match = boldRegex.exec(lineContent)) !== null) {
        // Add text before the bold part
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lineIndex}-${lastIndex}`}>
              {lineContent.substring(lastIndex, match.index)}
            </span>
          );
        }
        
        // Add bold part
        parts.push(
          <strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold">
            {match[1]}
          </strong>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text after last bold part
      if (lastIndex < lineContent.length) {
        parts.push(
          <span key={`text-${lineIndex}-${lastIndex}`}>
            {lineContent.substring(lastIndex)}
          </span>
        );
      }
      
      // Render as list item or regular line
      const content = parts.length > 0 ? parts : lineContent;
      
      if (isListItem) {
        return (
          <div key={`line-${lineIndex}`} className="flex gap-2">
            <span className="select-none">•</span>
            <span>{content}</span>
          </div>
        );
      }
      
      // Return the line with a line break
      return (
        <span key={`line-${lineIndex}`}>
          {content}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  const fetchAssistantResponse = async (userMessage: string): Promise<{ answer: string; workflow_action?: any; sources?: string[] }> => {
    try {
      const parentState = getCurrentCanvasState ? getCurrentCanvasState() : null;
      
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          session_id: sessionIdRef.current,
          current_state: parentState
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Clean up markdown formatting in the response
      const answer = data.answer || "I couldn't generate a response. Please try again.";
      return { 
        answer: cleanMarkdownFormatting(answer),
        workflow_action: data.workflow_action,
        sources: data.sources
      };
    } catch (error) {
      console.error('Chatbot API error:', error);
      throw error;
    }
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
      const { answer, workflow_action, sources } = await fetchAssistantResponse(userMessage.content);
      
      setIsTyping(false);
      
      // Apply workflow changes if the assistant requested them
      if (workflow_action && workflow_action.type === 'UPDATE_CANVAS' && onApplyWorkflowPatch) {
        try {
           onApplyWorkflowPatch(workflow_action.payload);
        } catch (e) {
           console.error("Failed to apply workflow patch", e);
        }
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: answer,
        timestamp: new Date(),
        sources: sources,
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `I encountered an issue: ${errorMessage}. Please try again, and if the problem persists, our support team is here to help.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
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
              <div className="text-sm leading-relaxed">
                {renderMarkdown(message.content)}
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
              
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-700/50">
                  <div className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {message.sources.map((source, index) => (
                      <div key={index} className="text-xs px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400 break-all">
                        {source}
                      </div>
                    ))}
                  </div>
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
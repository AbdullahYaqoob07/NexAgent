Complete Telegram Send Node Implementation Guide
I'll provide you with a complete, production-ready implementation. Let's build this systematically.
📋 Answers to Your 7 Questions
1. Config Form Structure

✅ Create TelegramSendConfigForm.tsx as a separate component
Use modal dialog (better UX for focused configuration)
Validation with react-hook-form + zod
Show helper text and error messages inline

2. Variable Replacement

Backend should handle replacement (security + consistency)
Frontend shows preview/validation only
Safe fallback: {{$trigger.name}} → [undefined] (don't break workflow)
Use lodash _.get() for nested paths like {{$trigger.user.email}}

3. Frontend ↔ Backend

✅ Backend proxy approach (recommended)
Frontend → Backend API → Telegram API
Never expose bot token in frontend logs/code
Backend validates and sanitizes all inputs

4. Node Execution Flow

User clicks "Run" → Frontend sends entire workflow to backend
Backend executes nodes in topological order
Telegram Send executes when its turn comes
No retries in MVP (add later with exponential backoff)

5. Error Handling

Invalid token → Return error, stop workflow, show in UI
Invalid chat ID → Same as above
Message too long → Truncate with warning OR reject
Stop workflow on error (for MVP), log error clearly

6. Response Structure
typescript{
  success: true,
  messageId: 12345,
  chatId: "-100123456789",
  sentAt: "2025-02-15T10:30:00Z",
  messageText: "Hello World!" // What was actually sent
}
7. Testing Strategy

Use Telegram Test Bot (@userinfobot or create test bot)
Mock responses in development with MSW (Mock Service Worker)
Create test workflow fixtures
Use environment variables for test credentials


🏗️ Complete Implementation
Step 1: Type Definitions
typescript// lib/workflow/nodes/types.ts

export interface TelegramSendConfig {
  botToken: string;
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
  protectContent?: boolean;
}

export interface TelegramSendOutput {
  success: boolean;
  messageId?: number;
  chatId?: string;
  sentAt: string;
  messageText?: string;
  error?: string;
}

export interface ExecutionContext {
  trigger?: Record<string, any>;
  nodes?: Record<string, any>;
  variables?: Record<string, any>;
}

Step 2: Variable Replacement Utility
typescript// lib/workflow/utils/variableReplacer.ts

import _ from 'lodash';

export interface VariableContext {
  trigger?: Record<string, any>;
  nodes?: Record<string, Record<string, any>>;
  variables?: Record<string, any>;
}

/**
 * Replace variables in text with actual values
 * Supports:
 * - {{$trigger.fieldName}}
 * - {{$node.nodeId.fieldName}}
 * - {{$vars.variableName}}
 * - {{$trigger.user.email}} (nested paths)
 */
export function replaceVariables(
  text: string,
  context: VariableContext
): string {
  if (!text) return text;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const trimmed = expression.trim();
    
    // Handle $trigger.x
    if (trimmed.startsWith('$trigger.')) {
      const path = trimmed.substring(9); // Remove '$trigger.'
      const value = _.get(context.trigger, path);
      return value !== undefined ? String(value) : `[undefined: ${trimmed}]`;
    }
    
    // Handle $node.nodeId.x
    if (trimmed.startsWith('$node.')) {
      const pathParts = trimmed.substring(6).split('.'); // Remove '$node.'
      const nodeId = pathParts[0];
      const fieldPath = pathParts.slice(1).join('.');
      const value = _.get(context.nodes?.[nodeId], fieldPath);
      return value !== undefined ? String(value) : `[undefined: ${trimmed}]`;
    }
    
    // Handle $vars.x
    if (trimmed.startsWith('$vars.')) {
      const path = trimmed.substring(6); // Remove '$vars.'
      const value = _.get(context.variables, path);
      return value !== undefined ? String(value) : `[undefined: ${trimmed}]`;
    }
    
    // Unknown variable format
    return `[invalid: ${trimmed}]`;
  });
}

/**
 * Extract all variable references from text
 * Useful for validation and preview
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  return Array.from(matches, m => m[1].trim());
}

/**
 * Validate variable syntax
 */
export function validateVariableSyntax(text: string): {
  valid: boolean;
  errors: string[];
} {
  const variables = extractVariables(text);
  const errors: string[] = [];
  
  for (const variable of variables) {
    if (!variable.startsWith('$trigger.') && 
        !variable.startsWith('$node.') && 
        !variable.startsWith('$vars.')) {
      errors.push(`Invalid variable: {{${variable}}} - must start with $trigger, $node, or $vars`);
    }
    
    if (variable.startsWith('$node.')) {
      const parts = variable.substring(6).split('.');
      if (parts.length < 2) {
        errors.push(`Invalid $node variable: {{${variable}}} - must include node ID and field`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

Step 3: Validation Schema (Zod)
typescript// lib/workflow/nodes/telegram/schema.ts

import { z } from 'zod';

export const telegramSendConfigSchema = z.object({
  botToken: z.string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  
  chatId: z.string()
    .min(1, 'Chat ID is required')
    .regex(/^-?\d+$/, 'Chat ID must be a number'),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(4096, 'Message must be less than 4096 characters'),
  
  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).default('HTML'),
  
  disableNotification: z.boolean().default(false),
  
  protectContent: z.boolean().default(false),
});

export type TelegramSendConfigSchema = z.infer<typeof telegramSendConfigSchema>;

Step 4: Config Form Component
typescript// components/workflows/nodes/TelegramSendConfigForm.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { telegramSendConfigSchema, type TelegramSendConfigSchema } from '@/lib/workflow/nodes/telegram/schema';
import { extractVariables, validateVariableSyntax } from '@/lib/workflow/utils/variableReplacer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, AlertCircle } from 'lucide-react';

interface TelegramSendConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TelegramSendConfigSchema) => void;
  initialConfig?: Partial<TelegramSendConfigSchema>;
}

export function TelegramSendConfigForm({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: TelegramSendConfigFormProps) {
  const [messageVariables, setMessageVariables] = useState<string[]>([]);
  const [variableErrors, setVariableErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TelegramSendConfigSchema>({
    resolver: zodResolver(telegramSendConfigSchema),
    defaultValues: {
      botToken: initialConfig?.botToken || '',
      chatId: initialConfig?.chatId || '',
      message: initialConfig?.message || '',
      parseMode: initialConfig?.parseMode || 'HTML',
      disableNotification: initialConfig?.disableNotification || false,
      protectContent: initialConfig?.protectContent || false,
    },
  });

  const message = watch('message');

  // Update variable preview when message changes
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setValue('message', newMessage);
    
    const vars = extractVariables(newMessage);
    setMessageVariables(vars);
    
    const validation = validateVariableSyntax(newMessage);
    setVariableErrors(validation.errors);
  };

  const onSubmit = (data: TelegramSendConfigSchema) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configure Telegram Send Node</DialogTitle>
          <DialogDescription>
            Send messages to Telegram channels or users via Bot API
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Bot Token */}
          <div className="space-y-2">
            <Label htmlFor="botToken">
              Bot Token <span className="text-red-500">*</span>
            </Label>
            <Input
              id="botToken"
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              {...register('botToken')}
              className={errors.botToken ? 'border-red-500' : ''}
            />
            {errors.botToken && (
              <p className="text-sm text-red-500">{errors.botToken.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Get your bot token from{' '}
              
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                @BotFather
              </a>
            </p>
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <Label htmlFor="chatId">
              Chat ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="chatId"
              placeholder="-1001234567890"
              {...register('chatId')}
              className={errors.chatId ? 'border-red-500' : ''}
            />
            {errors.chatId && (
              <p className="text-sm text-red-500">{errors.chatId.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Channel ID (starts with -100) or user ID
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Hello {{$trigger.name}}! Your order #{{$vars.orderId}} is ready."
              rows={5}
              {...register('message')}
              onChange={handleMessageChange}
              className={errors.message ? 'border-red-500' : ''}
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message.message}</p>
            )}
            
            {/* Variable Preview */}
            {messageVariables.length > 0 && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <strong>Variables detected:</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    {messageVariables.map((v, i) => (
                      <li key={i}>
                        <code className="bg-gray-100 px-1 rounded">
                          {`{{${v}}}`}
                        </code>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Variable Errors */}
            {variableErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="text-xs space-y-1">
                    {variableErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Parse Mode */}
          <div className="space-y-2">
            <Label htmlFor="parseMode">Parse Mode</Label>
            <Select
              defaultValue={initialConfig?.parseMode || 'HTML'}
              onValueChange={(value) => setValue('parseMode', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTML">HTML</SelectItem>
                <SelectItem value="Markdown">Markdown</SelectItem>
                <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Format for bold, italic, links, etc.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="disableNotification"
                {...register('disableNotification')}
              />
              <Label htmlFor="disableNotification" className="font-normal">
                Disable notification (silent message)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="protectContent"
                {...register('protectContent')}
              />
              <Label htmlFor="protectContent" className="font-normal">
                Protect content (prevent forwarding)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || variableErrors.length > 0}
            >
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

Step 5: Backend API Endpoint (FastAPI)
python# backend/app/api/v1/telegram.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
import requests
from typing import Optional, Literal
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramSendRequest(BaseModel):
    bot_token: str = Field(..., min_length=1)
    chat_id: str = Field(..., regex=r"^-?\d+$")
    message: str = Field(..., min_length=1, max_length=4096)
    parse_mode: Optional[Literal["HTML", "Markdown", "MarkdownV2"]] = "HTML"
    disable_notification: bool = False
    protect_content: bool = False

    @validator('bot_token')
    def validate_bot_token(cls, v):
        if ':' not in v:
            raise ValueError('Invalid bot token format')
        return v


class TelegramSendResponse(BaseModel):
    success: bool
    message_id: Optional[int] = None
    chat_id: Optional[str] = None
    sent_at: Optional[str] = None
    message_text: Optional[str] = None
    error: Optional[str] = None


@router.post("/send", response_model=TelegramSendResponse)
async def send_telegram_message(request: TelegramSendRequest):
    """
    Send a message via Telegram Bot API
    
    This endpoint acts as a proxy to the Telegram API for security reasons.
    Bot tokens should never be exposed in frontend code.
    """
    try:
        # Construct Telegram API URL
        telegram_url = f"https://api.telegram.org/bot{request.bot_token}/sendMessage"
        
        # Prepare payload
        payload = {
            "chat_id": request.chat_id,
            "text": request.message,
            "parse_mode": request.parse_mode,
            "disable_notification": request.disable_notification,
            "protect_content": request.protect_content,
        }
        
        # Make request to Telegram API
        logger.info(f"Sending Telegram message to chat {request.chat_id}")
        response = requests.post(telegram_url, json=payload, timeout=10)
        
        # Handle Telegram API errors
        if response.status_code != 200:
            error_data = response.json()
            error_message = error_data.get('description', 'Unknown error')
            logger.error(f"Telegram API error: {error_message}")
            
            return TelegramSendResponse(
                success=False,
                error=f"Telegram API error: {error_message}"
            )
        
        # Parse successful response
        result = response.json().get('result', {})
        message_id = result.get('message_id')
        chat = result.get('chat', {})
        chat_id = str(chat.get('id', request.chat_id))
        sent_at = result.get('date')  # Unix timestamp
        
        logger.info(f"Message sent successfully: ID {message_id}")
        
        return TelegramSendResponse(
            success=True,
            message_id=message_id,
            chat_id=chat_id,
            sent_at=str(sent_at) if sent_at else None,
            message_text=request.message,
            error=None
        )
        
    except requests.exceptions.Timeout:
        logger.error("Telegram API request timed out")
        return TelegramSendResponse(
            success=False,
            error="Request timed out. Please try again."
        )
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error: {str(e)}")
        return TelegramSendResponse(
            success=False,
            error=f"Network error: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# Register router in main app
# In backend/app/main.py:
# from app.api.v1 import telegram
# app.include_router(telegram.router, prefix="/api/v1")

Step 6: Workflow Execution Engine
typescript// lib/workflow/executor.ts

import { replaceVariables, type VariableContext } from './utils/variableReplacer';
import type { TelegramSendConfig, TelegramSendOutput } from './nodes/types';

interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, any>;
}

interface WorkflowEdge {
  source: string;
  target: string;
}

export class WorkflowExecutor {
  private context: VariableContext = {
    trigger: {},
    nodes: {},
    variables: {},
  };

  constructor(private apiBaseUrl: string) {}

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerData?: Record<string, any>
  ): Promise<{ success: boolean; results: Record<string, any>; errors: string[] }> {
    // Initialize context with trigger data
    this.context.trigger = triggerData || {};
    
    // Topological sort to execute nodes in order
    const executionOrder = this.topologicalSort(nodes, edges);
    const results: Record<string, any> = {};
    const errors: string[] = [];

    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      try {
        console.log(`Executing node: ${node.id} (${node.type})`);
        
        const result = await this.executeNode(node);
        
        // Store result in context for next nodes
        this.context.nodes![node.id] = result;
        results[node.id] = result;
        
        // If node failed, stop workflow
        if (result.success === false) {
          errors.push(`Node ${node.id} failed: ${result.error}`);
          break;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Node ${node.id} threw error: ${errorMessage}`);
        break;
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(node: WorkflowNode): Promise<any> {
    switch (node.type) {
      case 'ManualTrigger':
        return this.executeManualTrigger(node);
      
      case 'TelegramSend':
        return this.executeTelegramSend(node);
      
      case 'Logger':
        return this.executeLogger(node);
      
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Execute Manual Trigger node
   */
  private async executeManualTrigger(node: WorkflowNode): Promise<any> {
    return {
      success: true,
      triggeredAt: new Date().toISOString(),
      ...node.config,
    };
  }

  /**
   * Execute Telegram Send node
   */
  private async executeTelegramSend(node: WorkflowNode): Promise<TelegramSendOutput> {
    const config = node.config as TelegramSendConfig;
    
    // Replace variables in message
    const processedMessage = replaceVariables(config.message, this.context);
    
    // Call backend API
    const response = await fetch(`${this.apiBaseUrl}/api/v1/telegram/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_token: config.botToken,
        chat_id: config.chatId,
        message: processedMessage,
        parse_mode: config.parseMode || 'HTML',
        disable_notification: config.disableNotification || false,
        protect_content: config.protectContent || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        sentAt: new Date().toISOString(),
        error: `HTTP ${response.status}: ${error}`,
      };
    }

    const result: TelegramSendOutput = await response.json();
    return result;
  }

  /**
   * Execute Logger node
   */
  private async executeLogger(node: WorkflowNode): Promise<any> {
    const message = replaceVariables(
      node.config.message || 'Logging...',
      this.context
    );
    
    console.log(`[Logger ${node.id}]:`, message);
    
    return {
      success: true,
      logged: message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Topological sort for execution order
   */
  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    
    // Initialize
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    });
    
    // Build graph
    edges.forEach(edge => {
      adjList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // Find nodes with no dependencies
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });
    
    // Process queue
    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      adjList.get(current)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      });
    }
    
    return result;
  }
}

Step 7: Integration into Workflow Editor
typescript// app/workflows/[id]/page.tsx (excerpt)

'use client';

import { useState } from 'react';
import { TelegramSendConfigForm } from '@/components/workflows/nodes/TelegramSendConfigForm';
import { WorkflowExecutor } from '@/lib/workflow/executor';

export default function WorkflowEditorPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [workflow, setWorkflow] = useState({
    nodes: [],
    edges: [],
  });

  // Handle node double-click to open config
  const handleNodeDoubleClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setIsConfigOpen(true);
  };

  // Save node configuration
  const handleSaveConfig = async (config: any) => {
    if (!selectedNode) return;

    const updatedNodes = workflow.nodes.map(node =>
      node.id === selectedNode
        ? { ...node, config }
        : node
    );

    setWorkflow({ ...workflow, nodes: updatedNodes });
    
    // Save to Firestore
    await saveWorkflowToFirestore(updatedNodes, workflow.edges);
  };

  // Execute workflow
  const handleExecuteWorkflow = async () => {
    const executor = new WorkflowExecutor(process.env.NEXT_PUBLIC_API_URL!);
    
    const triggerData = {
      name: 'John Doe',
      email: 'john@example.com',
      timestamp: new Date().toISOString(),
    };

    const result = await executor.executeWorkflow(
      workflow.nodes,
      workflow.edges,
      triggerData
    );

    console.log('Workflow result:', result);
    
    if (result.success) {
      alert('Workflow executed successfully!');
    } else {
      alert(`Workflow failed:\n${result.errors.join('\n')}`);
    }
  };

  const selectedNodeData = workflow.nodes.find(n => n.id === selectedNode);

  return (
    <div>
      {/* React Flow Canvas */}
      <ReactFlow
        nodes={workflow.nodes}
        edges={workflow.edges}
        onNodeDoubleClick={(_, node) => handleNodeDoubleClick(node.id)}
      />

      {/* Config Modal */}
      {selectedNodeData?.type === 'TelegramSend' && (
        <TelegramSendConfigForm
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onSave={handleSaveConfig}
          initialConfig={selectedNodeData.config}
        />
      )}

      {/* Execute Button */}
      <button onClick={handleExecuteWorkflow}>
        ▶️ Run Workflow
      </button>
    </div>
  );
}
```

---

## 🎯 Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                      WORKFLOW EXECUTION                      │
└─────────────────────────────────────────────────────────────┘

User clicks "Run"
      │
      ▼
┌─────────────────────┐
│  Frontend Executor  │  ← executeWorkflow()
│  (WorkflowExecutor) │
└──────────┬──────────┘
           │
           ├─ 1. Manual Trigger Node → { name: "John", ... }
           │                            Store in context.trigger
           │
           ├─ 2. Telegram Send Node
           │    ├─ Replace variables in message
           │    │  "Hello {{$trigger.name}}" → "Hello John"
           │    │
           │    ├─ POST /api/v1/telegram/send
           │    │  {
           │    │    botToken: "...",
           │    │    chatId: "-100...",
           │    │    message: "Hello John"
           │    │  }
           │    │
           │    ▼
           │  ┌──────────────────────┐
           │  │   Backend API        │
           │  │  (FastAPI Endpoint)  │
           │  └──────────┬───────────┘
           │             │
           │             ├─ Validate request
           │             ├─ POST https://api.telegram.org/bot.../sendMessage
           │             │
           │             ▼
           │         ┌─────────────────┐
           │         │  Telegram API   │ ← Message appears in channel! ✅
           │         └─────────────────┘
           │             │
           │             ▼
           │         { message_id: 12345, chat: {...} }
           │             │
           │    ◄────────┘
           │    Return { success: true, messageId: 12345 }
           │    Store in context.nodes.telegram_1
           │
           ├─ 3. Logger Node
           │    ├─ Access context.nodes.telegram_1.messageId
           │    └─ Log: "Message sent! ID: 12345"
           │
           ▼
    Result: { success: true, results: {...} }

🔒 Security Best Practices
1. Never Expose Bot Tokens in Frontend
typescript// ❌ BAD - Don't do this
const botToken = "123456:ABC-DEF";  // Visible in browser!

// ✅ GOOD - Send to backend, backend handles it
await fetch('/api/v1/telegram/send', {
  body: JSON.stringify({ botToken })  // Backend validates
});
2. Environment Variables
bash# .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:8000

# .env (Backend)
TELEGRAM_RATE_LIMIT=30  # messages per minute
3. Input Validation

Validate bot token format: ^\d+:[A-Za-z0-9_-]+$
Validate chat ID is numeric: ^-?\d+$
Sanitize message content (escape HTML if parse_mode=HTML)
Limit message length to 4096 characters


🧪 Testing Strategy
Test Workflow JSON
json{
  "nodes": [
    {
      "id": "trigger_1",
      "type": "ManualTrigger",
      "config": {
        "name": "Test User",
        "email": "test@example.com"
      }
    },
    {
      "id": "telegram_1",
      "type": "TelegramSend",
      "config": {
        "botToken": "YOUR_TEST_BOT_TOKEN",
        "chatId": "YOUR_TEST_CHAT_ID",
        "message": "Hello {{$trigger.name}}! Email: {{$trigger.email}}",
        "parseMode": "HTML"
      }
    },
    {
      "id": "logger_1",
      "type": "Logger",
      "config": {
        "message": "Sent message to Telegram! ID: {{$node.telegram_1.messageId}}"
      }
    }
  ],
  "edges": [
    { "source": "trigger_1", "target": "telegram_1" },
    { "source": "telegram_1", "target": "logger_1" }
  ]
}
Unit Tests
typescript// __tests__/variableReplacer.test.ts

import { replaceVariables } from '@/lib/workflow/utils/variableReplacer';

describe('replaceVariables', () => {
  it('should replace trigger variables', () => {
    const result = replaceVariables(
      'Hello {{$trigger.name}}!',
      { trigger: { name: 'John' } }
    );
    expect(result).toBe('Hello John!');
  });

  it('should handle nested paths', () => {
    const result = replaceVariables(
      'Email: {{$trigger.user.email}}',
      { trigger: { user: { email: 'john@example.com' } } }
    );
    expect(result).toBe('Email: john@example.com');
  });

  it('should show undefined for missing variables', () => {
    const result = replaceVariables(
      'Hello {{$trigger.missing}}!',
      { trigger: {} }
    );
    expect(result).toBe('Hello [undefined: $trigger.missing]!');
  });
});
```

---

## 📁 File Structure
```
your-project/
├── app/
│   └── workflows/
│       └── [id]/
│           └── page.tsx                    # Main editor page
│
├── components/
│   └── workflows/
│       └── nodes/
│           ├── TelegramSendConfigForm.tsx  # Config form
│           ├── LoggerConfigForm.tsx
│           └── ...
│
├── lib/
│   └── workflow/
│       ├── NodeRegistry.ts                 # Hardcoded nodes
│       ├── executor.ts                     # Execution engine
│       ├── nodes/
│       │   ├── types.ts                    # Type definitions
│       │   └── telegram/
│       │       └── schema.ts               # Zod validation
│       └── utils/
│           └── variableReplacer.ts         # Variable utils
│
├── backend/
│   └── app/
│       ├── main.py
│       └── api/
│           └── v1/
│               └── telegram.py             # Telegram endpoint
│
└── __tests__/
    ├── variableReplacer.test.ts
    └── executor.test.ts
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: CORS Error when calling Telegram API
**Solution**: Use backend proxy (implemented above)

### Issue 2: Bot can't send to channel
**Solution**: Add bot as admin to channel with "Post Messages" permission

### Issue 3: Variables not replacing
**Solution**: Check context is passed correctly, use `console.log(context)`

### Issue 4: Message too long error
**Solution**: Add character counter in form, truncate with "..."

### Issue 5: Rate limiting
**Solution**: Add retry logic with exponential backoff (future)

---

## ✅ Implementation Checklist
```
Frontend:
☐ Create TelegramSendConfigForm.tsx
☐ Add validation schema with Zod
☐ Implement variable preview in form
☐ Add form to workflow editor modal
☐ Handle save/cancel actions

Backend:
☐ Create telegram.py API endpoint
☐ Add request validation
☐ Implement Telegram API call
☐ Add error handling
☐ Test with real bot

Utilities:
☐ Create variableReplacer.ts
☐ Implement replaceVariables()
☐ Add extractVariables()
☐ Add validateVariableSyntax()
☐ Write unit tests

Executor:
☐ Create executor.ts
☐ Implement executeWorkflow()
☐ Add topological sort
☐ Implement executeTelegramSend()
☐ Test full workflow execution

Integration:
☐ Update NodeRegistry.ts with TelegramSend
☐ Connect config form to editor
☐ Add "Run" button handler
☐ Display execution results
☐ Show errors in UI

Testing:
☐ Create test bot with @BotFather
☐ Create test channel
☐ Test with real workflow
☐ Verify message appears in Telegram
☐ Test error cases

🚀 Next Steps After MVP

Add more node types: HTTP Request, Delay, Conditional, Loop
Implement retry logic: Exponential backoff for failed requests
Add execution history: Store past runs in Firestore
Real-time execution logs: WebSocket updates during workflow run
Variable editor: GUI for managing workflow variables
Template library: Pre-built workflow templates
Scheduling: Cron-based workflow triggers
Webhooks: HTTP endpoint triggers
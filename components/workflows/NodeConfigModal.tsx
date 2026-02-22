"use client";

import { useState, useEffect, useContext } from 'react';
import { 
  X, 
  Play, 
  Save, 
  Settings, 
  HelpCircle, 
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Zap,
  Database,
  Mail,
  Globe,
  MessageSquare,
  Bot,
  GitBranch,
  Calendar,
  FileText,
  Trash2,
  Plus,
  Braces
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { WorkflowNode, NodeCategory } from '@/lib/workflow/types';

import { getBrandLogo } from '@/lib/workflow/utils/BrandLogoMapping';
import { getNodeDefinitionByType } from '@/lib/workflow/NodeDefinitions';
import VariableReferencePicker from './VariableReferencePicker';

interface NodeConfigModalProps {
  node: WorkflowNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeConfig: Record<string, any>) => void;
  onTest?: (testWorkflow: any, config: Record<string, any>) => Promise<any>;
  onDelete?: () => void;
  workflowId?: string;
  nodes?: any[];
  connections?: any[];
}

// Dynamic node categories from API
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    'Triggers': <Zap className="w-4 h-4" />,
    'Actions': <Settings className="w-4 h-4" />,
    'Logic': <GitBranch className="w-4 h-4" />,
    'AI/ML': <Bot className="w-4 h-4" />,
    'Communication': <MessageSquare className="w-4 h-4" />,
    'Data': <Database className="w-4 h-4" />,
    'Utilities': <FileText className="w-4 h-4" />,
    'Integrations': <Globe className="w-4 h-4" />,
    'Storage': <Database className="w-4 h-4" />,
    'Notifications': <Mail className="w-4 h-4" />
  };
  return iconMap[category] || <Settings className="w-4 h-4" />;
};

export default function NodeConfigModal({
  node,
  isOpen,
  onClose,
  onSave,
  onTest,
  onDelete,
  workflowId,
  nodes: providedNodes = [],
  connections: providedConnections = [],
}: NodeConfigModalProps) {
  // State management
  const [config, setConfig] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'config' | 'settings' | 'test'>('config');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Triggers']);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [variablePickerField, setVariablePickerField] = useState('');
  const [workflowData, setWorkflowData] = useState<{nodes: any[]; connections: any[]}>({nodes: [], connections: []});
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>('');

  // Helper function to render dynamic form fields - now has access to component state
  const renderDynamicField = (field: any, value: any, onChange: (newValue: any) => void, fieldName?: string) => {
    const { type, placeholder, options, validation } = field;
    
    // Function to open variable picker
    const openVariablePicker = (fieldKey: string) => {
      setVariablePickerField(fieldKey);
      setShowVariablePicker(true);
    };
    
    // Function to handle variable selection
    const handleVariableSelect = (variablePath: string) => {
      const newValue = value ? `${value}${variablePath}` : variablePath;
      onChange(newValue);
    };
    
    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'password':
      case 'string':
        return (
          <div className="relative">
            <Input
              type={type === 'password' ? 'password' : 'text'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setVariablePickerField(fieldName || '')}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-purple-500');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-purple-500');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-purple-500');
                const varPath = e.dataTransfer.getData('text/plain');
                if (varPath) {
                  onChange((value || '') + varPath);
                }
              }}
              placeholder={placeholder}
              className="bg-slate-800 border-slate-700 text-white pr-10 transition-all"
            />
            {fieldName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => openVariablePicker(fieldName)}
                title="Pick variable from previous nodes"
              >
                <Braces className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
        
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setVariablePickerField(fieldName || '')}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('ring-2', 'ring-purple-500');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('ring-2', 'ring-purple-500');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('ring-2', 'ring-purple-500');
              const varPath = e.dataTransfer.getData('text/plain');
              if (varPath) {
                onChange((value || '') + varPath);
              }
            }}
            placeholder={placeholder}
            className="bg-slate-800 border-slate-700 text-white transition-all"
            rows={4}
          />
        );
        
      case 'number':
      case 'range':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={placeholder}
            min={validation?.min}
            max={validation?.max}
            className="bg-slate-800 border-slate-700 text-white"
          />
        );
        
      case 'boolean':
        return (
          <Switch
            checked={value || false}
            onCheckedChange={onChange}
          />
        );
        
      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'multiselect':
        // For multiselect, we'll use a simplified version for now
        return (
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : value || ''}
            onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean))}
            placeholder="Enter one option per line"
            className="bg-slate-800 border-slate-700 text-white"
            rows={3}
          />
        );
        
      case 'json':
      case 'code':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={placeholder}
            className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
            rows={6}
          />
        );
        
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      );
      
    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
        />
      );
      
    case 'color':
      return (
        <Input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-800 border-slate-700 w-20 h-10"
        />
      );
      
    case 'file':
      return (
        <Input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // For now, just store the file name
              // In a real app, you'd upload the file and store the URL
              onChange(file.name);
            }
          }}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      );
      
    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      );
    }
  };

  // Helpers for HTTP Request editor (Webhook/API)
  const addHeaderRow = () => {
    const list = Array.isArray(config.headersList) ? [...config.headersList] : [];
    list.push({ key: '', value: '' });
    setConfig(prev => ({ ...prev, headersList: list }));
  };
  const updateHeaderRow = (idx: number, field: 'key' | 'value', val: string) => {
    const list = Array.isArray(config.headersList) ? [...config.headersList] : [];
    if (list[idx]) list[idx][field] = val;
    const headersObj: Record<string, string> = {};
    list.filter((r: any) => r.key).forEach((r: any) => { headersObj[r.key] = r.value; });
    setConfig(prev => ({ ...prev, headersList: list, headers: headersObj }));
  };
  const removeHeaderRow = (idx: number) => {
    const list = Array.isArray(config.headersList) ? [...config.headersList] : [];
    list.splice(idx, 1);
    const headersObj: Record<string, string> = {};
    list.filter((r: any) => r.key).forEach((r: any) => { headersObj[r.key] = r.value; });
    setConfig(prev => ({ ...prev, headersList: list, headers: headersObj }));
  };

  const addParamRow = () => {
    const list = Array.isArray(config.paramsList) ? [...config.paramsList] : [];
    list.push({ key: '', value: '' });
    setConfig(prev => ({ ...prev, paramsList: list }));
  };
  const updateParamRow = (idx: number, field: 'key' | 'value', val: string) => {
    const list = Array.isArray(config.paramsList) ? [...config.paramsList] : [];
    if (list[idx]) list[idx][field] = val;
    setConfig(prev => ({ ...prev, paramsList: list }));
  };
  const removeParamRow = (idx: number) => {
    const list = Array.isArray(config.paramsList) ? [...config.paramsList] : [];
    list.splice(idx, 1);
    setConfig(prev => ({ ...prev, paramsList: list }));
  };
  const buildUrlWithParams = (base: string, paramsList: any[]): string => {
    try {
      const url = new URL(base || '');
      (paramsList || []).filter(p => p.key).forEach(p => url.searchParams.set(p.key, p.value));
      return url.toString();
    } catch {
      return base;
    }
  };
  
  // Dynamic node data from API
  const [nodeCategories, setNodeCategories] = useState<any[]>([]);
  const [nodeDefinition, setNodeDefinition] = useState<any>(null);
  
  // Debug effect to log nodeDefinition changes
  useEffect(() => {
    console.log('nodeDefinition changed:', nodeDefinition);
  }, [nodeDefinition]);
  const [isLoadingNodeData, setIsLoadingNodeData] = useState(false);

  useEffect(() => {
    console.log('NodeConfigModal useEffect triggered:', { nodeId: node?.id });
    if (node) {
      console.log('NodeConfigModal received node:', node);
      const initial = node.config || {};
      // Provide sensible defaults for HTTP/Webhook editor
      if (node.type === 'HTTP Request' || node.type === 'Webhook') {
        initial.method = initial.method || 'GET';
        initial.url = initial.url || '';
        initial.headers = initial.headers || {};
        initial.headersList = Array.isArray(initial.headersList) ? initial.headersList : [];
        initial.paramsList = Array.isArray(initial.paramsList) ? initial.paramsList : [];
        initial.timeout = initial.timeout || 30000;
      }
      setConfig(initial);
      setTestResult(null);
      loadNodeDefinition(node.type);
      loadWorkflowData();
    } else {
      console.log('Node is null in useEffect');
    }
  }, [node?.id]);
  
  useEffect(() => {
    if (isOpen) {
      loadNodeCategories();
    }
  }, [isOpen]);
  
  // Load all available nodes grouped by category
  const loadNodeCategories = async () => {
    try {
      const response = await fetch('/api/admin/nodes?active=true');
      const data = await response.json();
      
      if (data.success) {
        // Group nodes by category
        const categoriesMap = new Map<string, any>();
        
        // Handle both data.nodes and data.data response formats
        const nodes = data.nodes || data.data || [];
        
        nodes.forEach((nodeType: any) => {
          if (!categoriesMap.has(nodeType.category)) {
            categoriesMap.set(nodeType.category, {
              name: nodeType.category,
              icon: getCategoryIcon(nodeType.category),
              nodes: []
            });
          }
          categoriesMap.get(nodeType.category)?.nodes.push({
            id: nodeType.id,
            name: nodeType.name,
            type: nodeType.type,
            description: nodeType.description,
            trigger: nodeType.trigger
          });
        });
        
        setNodeCategories(Array.from(categoriesMap.values()));
      }
    } catch (error) {
      console.error('Error loading node categories:', error);
    }
  };
  
  // Load workflow data for variable references
  const loadWorkflowData = async () => {
    try {
      // If nodes are provided directly from parent component, use them immediately
      if (providedNodes && providedNodes.length > 0) {
        console.log('Using provided nodes from parent:', providedNodes.length);
        setWorkflowData({
          nodes: providedNodes,
          connections: providedConnections || []
        });
        return;
      }
      
      // Otherwise try to load from API
      const urlParams = new URLSearchParams(window.location.search);
      const workflowIdFromUrl = urlParams.get('workflowId') || workflowId || '';
      
      if (workflowIdFromUrl) {
        setCurrentWorkflowId(workflowIdFromUrl);
        
        // Load workflow data
        const response = await fetch(`/api/workflows/${workflowIdFromUrl}`);
        const data = await response.json();
        
        if (data.success && data.workflow) {
          setWorkflowData({
            nodes: data.workflow.nodes || [],
            connections: data.workflow.connections || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading workflow data:', error);
      // Fallback to provided nodes or empty data
      if (providedNodes && providedNodes.length > 0) {
        setWorkflowData({
          nodes: providedNodes,
          connections: providedConnections || []
        });
      } else {
        setWorkflowData({nodes: [], connections: []});
      }
    }
  };

  // Load specific node definition - uses hardcoded definitions for instant load
  const loadNodeDefinition = (nodeType: string) => {
    console.log('Loading node definition for:', nodeType);
    
    // Get definition from hardcoded definitions (instant, no API call)
    const definition = getNodeDefinitionByType(nodeType);
    
    if (definition) {
      console.log('Found node definition:', definition);
      setNodeDefinition(definition);
      // Don't set loading state - definition is loaded instantly
    } else {
      console.warn(`No node definition found for type: ${nodeType}`);
      // Use empty definition for unknown node types
      setNodeDefinition({
        type: nodeType,
        name: nodeType,
        description: 'Configure this node',
        category: 'Unknown',
        fields: []
      });
    }
  };

  if (!isOpen || !node) return null;

  const nodeDoc = nodeDefinition || { description: `Configure the ${node.type} node`, examples: [], fields: {} };
  const BrandLogo = getBrandLogo(node.type);

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate email node configuration
  const validateEmailNode = (): string[] => {
    const errors: string[] = [];
    
    if (!config.to) {
      errors.push('Recipient email address is required');
    } else {
      // Validate email format
      const emails = config.to.toString().split(',').map((email: string) => email.trim());
      for (const email of emails) {
        if (email && !isValidEmail(email)) {
          errors.push(`Invalid email address: ${email}`);
        }
      }
    }
    
    if (!config.subject) {
      errors.push('Email subject is required');
    }
    
    if (!config.body) {
      errors.push('Email body is required');
    }
    
    return errors;
  };

  // Validate Slack node configuration
  const validateSlackNode = (): string[] => {
    const errors: string[] = [];
    
    if (!config.channel) {
      errors.push('Slack channel is required');
    } else {
      // Validate channel format
      if (!config.channel.startsWith('#') && !config.channel.startsWith('@')) {
        errors.push('Channel must start with # for channels or @ for direct messages');
      }
    }
    
    if (!config.message) {
      errors.push('Message content is required');
    }
    
    return errors;
  };

  const handleSave = () => {
    // Validate configuration based on node type
    let validationErrors: string[] = [];
    
    if (nodeDefinition?.type === 'Email' || nodeDefinition?.name === 'Email' || 
        node?.type === 'Send Email' || node?.type === 'Email') {
      validationErrors = validateEmailNode();
    } else if (nodeDefinition?.type === 'Slack' || nodeDefinition?.name === 'Slack' || 
               node?.type === 'Slack Message' || node?.type === 'Slack' || node?.type === 'Send Slack Message') {
      validationErrors = validateSlackNode();
    }
    
    // Check for any validation errors
    if (validationErrors.length > 0) {
      // In a real implementation, we would show these errors to the user
      console.warn('Validation errors:', validationErrors);
      // For now, we'll still save but log the errors
    }
    
    onSave(config);
    onClose();
  };

  const handleTest = async () => {
    // Validate configuration before testing
    let validationErrors: string[] = [];
    
    if (nodeDefinition?.type === 'Email' || nodeDefinition?.name === 'Email' || 
        node?.type === 'Send Email' || node?.type === 'Email' || node?.type === 'EmailSend') {
      validationErrors = validateEmailNode();
    } else if (nodeDefinition?.type === 'Slack' || nodeDefinition?.name === 'Slack' || 
               node?.type === 'Slack Message' || node?.type === 'Slack' || node?.type === 'Send Slack Message' || node?.type === 'SlackMessage') {
      validationErrors = validateSlackNode();
    }
    
    // Check for any validation errors
    if (validationErrors.length > 0) {
      setTestResult({
        success: false,
        error: `Configuration validation failed: ${validationErrors.join(', ')}`,
        executionTime: 0
      });
      return;
    }
    if (!node) return;
    
    setIsTestLoading(true);
    const startTime = Date.now();
    
    try {
      // Create a single-node workflow for testing
      const testWorkflow = {
        id: `test_${Date.now()}`,
        name: `Test ${node.name}`,
        nodes: [
          {
            id: node.id,
            type: node.type,
            name: node.name,
            category: node.category,
            position: node.position,
            config: config, // Use current config from modal
            inputs: node.inputs,
            outputs: node.outputs,
            enabled: true,
          }
        ],
        connections: [],
        settings: {
          timeout: 30000,
          retryCount: 1,
          errorHandling: 'stop' as const,
          concurrency: 1
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      // Call the advanced workflow engine for testing
      if (onTest) {
        const result = await onTest(testWorkflow, config);
        
        setTestResult({
          success: result?.success !== false,
          data: result?.data || result || { message: 'Test executed successfully' },
          executionTime: Date.now() - startTime,
          metadata: result?.metadata || {}
        });
      } else {
        // Fallback to mock execution if no test handler
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTestResult({
          success: true,
          data: getMockTestResult(node.type, config),
          executionTime: Date.now() - startTime,
          metadata: { mock: true }
        });
      }
      
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test execution failed',
        executionTime: Date.now() - startTime
      });
    }
    
    setIsTestLoading(false);
  };
  
  // Specialized rendering for email nodes
  const renderEmailField = (field: any, value: any, onChange: (newValue: any) => void) => {
    const key = field.key;
    
    switch (key) {
      case 'to':
        return (
          <div className="space-y-2">
            <Input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || 'recipient@example.com'}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500">
              Enter email addresses separated by commas for multiple recipients
            </p>
          </div>
        );
        
      case 'subject':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Email subject'}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        );
        
      case 'body':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Email content...'}
            className="bg-zinc-800 border-zinc-700 text-white"
            rows={6}
          />
        );
        
      default:
        return renderDynamicField(field, value, onChange, key);
    }
  };

  // Specialized rendering for Slack nodes
  const renderSlackField = (field: any, value: any, onChange: (newValue: any) => void) => {
    const key = field.key;
    
    switch (key) {
      case 'channel':
        return (
          <div className="space-y-2">
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || '#general'}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500">
              Channel names should start with # (e.g., #general) or @ for direct messages
            </p>
          </div>
        );
        
      case 'message':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Your message...'}
            className="bg-zinc-800 border-zinc-700 text-white"
            rows={4}
          />
        );
        
      default:
        return renderDynamicField(field, value, onChange, key);
    }
  };

  // Get mock test result based on node type
  const getMockTestResult = (nodeType: string, nodeConfig: any) => {
    const mockResults: Record<string, any> = {
      // Triggers
      'ManualTrigger': {
        triggered: true,
        timestamp: new Date().toISOString(),
        executionId: `exec_${Date.now()}`
      },
      'On Clicking Execute': {
        triggered: true,
        timestamp: new Date().toISOString(),
        executionId: `exec_${Date.now()}`
      },
      'ChatInput': {
        triggered: true,
        trigger_type: 'chat_input',
        text: nodeConfig.text || 'Hello from test!',
        timestamp: new Date().toISOString()
      },
      'Scheduling': {
        triggered: true,
        trigger_type: 'schedule',
        cron: nodeConfig.cron || '0 */5 * * *',
        next_run: new Date(Date.now() + 300000).toISOString()
      },
      'Webhook': {
        triggered: true,
        trigger_type: 'webhook',
        url: nodeConfig.url || 'https://api.example.com/webhook',
        timestamp: new Date().toISOString()
      },
      // Communication / Actions
      'HTTP Request': {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { users: [{ id: 1, name: 'John Doe' }] },
        url: nodeConfig.url || 'https://api.example.com'
      },
      'HTTPRequest': {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { users: [{ id: 1, name: 'John Doe' }] },
        url: nodeConfig.url || 'https://api.example.com'
      },
      'Email': {
        sent: true,
        messageId: `msg_${Date.now()}`,
        to: nodeConfig.to || 'test@example.com',
        subject: nodeConfig.subject || 'Test Email'
      },
      'EmailSend': {
        sent: true,
        messageId: `msg_${Date.now()}`,
        to: nodeConfig.to || 'test@example.com',
        subject: nodeConfig.subject || 'Test Email'
      },
      'TelegramSend': {
        sent: true,
        messageId: Date.now(),
        chatId: nodeConfig.chatId || '123456789',
        message: nodeConfig.message || 'Test message'
      },
      'Slack': {
        ok: true,
        channel: nodeConfig.channel || '#general',
        ts: Date.now().toString(),
        message: { text: nodeConfig.text || 'Hello from NexAgent!' }
      },
      'SlackMessage': {
        ok: true,
        channel: nodeConfig.channel || '#general',
        ts: Date.now().toString(),
        message: { text: nodeConfig.text || 'Hello from NexAgent!' }
      },
      'Logger': {
        logged: true,
        level: nodeConfig.level || 'info',
        message: nodeConfig.message || 'Log entry',
        timestamp: new Date().toISOString()
      },
      // Logic
      'Conditional': {
        evaluated: true,
        condition: nodeConfig.condition ?? true,
        branch: 'true',
        result: 'Condition met'
      },
      'Loop': {
        completed: true,
        iterations: 3,
        items: [{ index: 0 }, { index: 1 }, { index: 2 }]
      },
      'Delay': {
        completed: true,
        duration: nodeConfig.duration || 1000,
        message: `Waited ${(nodeConfig.duration || 1000) / 1000}s`
      },
      'Stopper': {
        stopped: true,
        reason: nodeConfig.description || 'Workflow stopped',
        timestamp: new Date().toISOString()
      },
      // Data
      'DataFormatter': {
        formatted: true,
        format: nodeConfig.format || 'json',
        result: { sample: 'formatted data' }
      },
      'JSONParser': {
        parsed: true,
        data: { sample: 'value', nested: { key: 'parsed result' } }
      },
      'Database': {
        query: nodeConfig.query || 'SELECT * FROM users',
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
        affectedRows: 1
      },
      // Integrations
      'GoogleSheets': {
        success: true,
        operation: nodeConfig.operation || 'read',
        data: [['Name', 'Email'], ['John', 'john@test.com']],
        range: nodeConfig.range || 'Sheet1!A1:B2'
      },
      'GoogleDrive': {
        success: true,
        operation: nodeConfig.operation || 'list',
        files: [{ id: 'file1', name: 'Document.pdf', size: 1024 }]
      },
      'Stripe': {
        success: true,
        operation: nodeConfig.operation || 'create_payment',
        paymentId: `pi_${Date.now()}`,
        amount: nodeConfig.amount || 1000,
        currency: nodeConfig.currency || 'usd'
      },
      // AI/ML
      'OpenAI': {
        model: nodeConfig.model || 'gpt-3.5-turbo',
        prompt: nodeConfig.prompt || 'Test prompt',
        response: 'This is a test response from the AI model.',
        tokensUsed: 45,
        cost: 0.00009
      },
      'ClaudeAI': {
        model: nodeConfig.model || 'claude-3-sonnet-20240229',
        prompt: nodeConfig.prompt || 'Test prompt',
        response: 'This is a test response from Claude AI.',
        tokensUsed: 52,
        cost: 0.00012
      }
    };
    
    return mockResults[nodeType] || {
      nodeType,
      config: nodeConfig,
      result: 'Test executed successfully',
      timestamp: new Date().toISOString()
    };
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const renderConfigField = (field: any, key: string) => {
    if (!field) {
      // Fallback to simple input for legacy nodes
      return (
        <div className="relative">
          <Input
            value={config[key] || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={`Enter ${key}...`}
            className="bg-zinc-900 border-zinc-700 text-white pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-zinc-400 hover:text-white"
            onClick={() => {
              setVariablePickerField(key);
              setShowVariablePicker(true);
            }}
          >
            <Braces className="w-3 h-3" />
          </Button>
        </div>
      );
    }
    
    return renderDynamicField(
      field,
      config[key],
      (newValue) => setConfig(prev => ({ ...prev, [key]: newValue })),
      key
    );
  };

  // Get all upstream (ancestor) node IDs by walking backward through connections
  const getUpstreamNodeIds = (targetNodeId: string, conns: any[]): Set<string> => {
    const upstream = new Set<string>();
    const queue = [targetNodeId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      for (const conn of conns) {
        if (conn.to === currentId && !upstream.has(conn.from)) {
          upstream.add(conn.from);
          queue.push(conn.from);
        }
      }
    }
    return upstream;
  };

  // Compute upstream node IDs for the current node
  const upstreamNodeIds = node?.id
    ? getUpstreamNodeIds(node.id, workflowData.connections || [])
    : new Set<string>();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-950 rounded-2xl shadow-2xl overflow-hidden flex max-h-[90vh]">
        {/* Variables Panel - Left Sidebar */}
        <div className="w-72 border-r border-slate-700 bg-slate-900 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Braces className="w-4 h-4 text-purple-400" />
              Previous Nodes
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {workflowData.nodes && workflowData.nodes.length > 0 && upstreamNodeIds.size > 0 ? (
              workflowData.nodes.map((n: any) => {
                // Only show upstream (ancestor) nodes
                if (!upstreamNodeIds.has(n.id)) return null;
                
                // Get node definition to show its outputs
                const nodeDef = getNodeDefinitionByType(n.type);
                const nodeLabel = n.label || n.name || nodeDef?.name || n.type;
                
                // Get output definitions
                const outputs = nodeDef?.outputs;
                
                // Helper function to get type icon
                const getTypeIcon = (type: string) => {
                  const icons: Record<string, string> = {
                    'string': '🔤',
                    'number': '🔢',
                    'boolean': '✓',
                    'object': '{}',
                    'array': '[]',
                    'date': '📅',
                    'json': '{ }',
                  };
                  return icons[type] || '•';
                };
                
                // Recursive function to render fields with nesting
                const renderFields = (fields: any[], basePath: string[] = []) => {
                  return fields.map((field: any) => {
                    const fullPath = [...basePath, field.name];
                    const varPath = `{{$node["${n.id}"].${fullPath.join('.')}}}`;
                    
                    return (
                      <div key={field.path.join('.')}>
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData('text/plain', varPath);
                          }}
                          onClick={() => {
                            if (variablePickerField) {
                              setConfig(prev => ({
                                ...prev,
                                [variablePickerField]: (prev[variablePickerField] || '') + varPath
                              }));
                              setVariablePickerField('');
                            }
                          }}
                          className="block w-full text-left px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-gray-300 hover:text-white transition-colors cursor-move hover:cursor-grab active:cursor-grabbing"
                          title={`${field.description} | Drag to insert`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">{getTypeIcon(field.type)}</span>
                            <code className="text-purple-300 flex-1 truncate font-mono">{field.name}</code>
                            <span className="text-gray-600 text-xs bg-slate-700 px-1.5 py-0.5 rounded whitespace-nowrap">{field.type}</span>
                          </div>
                          {field.description && (
                            <div className="text-gray-500 text-xs mt-1 ml-5">{field.description}</div>
                          )}
                        </div>
                        
                        {/* Render nested children if object */}
                        {field.children && field.children.length > 0 && (
                          <div className="ml-3 mt-1 space-y-1 border-l border-slate-700 pl-2">
                            {renderFields(field.children, fullPath)}
                          </div>
                        )}
                      </div>
                    );
                  });
                };
                
                return (
                  <div key={n.id} className="space-y-2">
                    {/* Node Header */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">⚡</div>
                      <p className="text-xs font-semibold text-white truncate flex-1">{nodeLabel}</p>
                    </div>
                    
                    {/* Output Groups */}
                    <div className="space-y-2 ml-2">
                      {outputs && Object.entries(outputs).length > 0 ? (
                        Object.entries(outputs).map(([outputKey, output]: [string, any]) => (
                          <div key={outputKey} className="space-y-1.5">
                            {/* Output type label */}
                            {Object.keys(outputs).length > 1 && (
                              <div className="flex items-center gap-1.5 px-2 py-1">
                                <span className="text-xs font-semibold text-slate-400">
                                  {output.displayName || outputKey}
                                </span>
                                {output.dynamic && (
                                  <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 rounded">Dynamic</span>
                                )}
                              </div>
                            )}
                            
                            {/* Fields */}
                            <div className="space-y-1">
                              {output.fields && output.fields.length > 0 ? (
                                renderFields(output.fields)
                              ) : (
                                <p className="text-xs text-gray-600 italic px-2">No output fields</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-600 italic">No outputs defined</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Braces className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-gray-500">No previous nodes connected</p>
                <p className="text-xs text-gray-600 mt-1">Connect upstream nodes to see their output fields here</p>
              </div>
            )}
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-gray-500 space-y-2">
                <div>💡 <strong>Click</strong> to insert into active field</div>
                <div>🖱️ <strong>Drag</strong> to drop in fields</div>
              </p>
            </div>
          </div>
        </div>

        {/* Config Panel - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Clean Header */}
        <div className="border-b border-slate-700 px-8 py-6 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6] flex items-center justify-center text-white text-lg">
              ⚙️
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{node?.label || node?.type}</h2>
              <p className="text-sm text-gray-400 mt-1">{getNodeDefinitionByType(node?.type || '')?.description || 'Configure node'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Main Content - Simplified Single Column */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Configuration Section */}
            <div className="space-y-6">
              {/* Default Name Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Node Name</label>
                <input
                  type="text"
                  value={config.name || node?.label || ''}
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 bg-slate-800"
                  placeholder="Enter node name"
                />
              </div>

              {/* Node Definition Fields */}
              {nodeDefinition?.fields && nodeDefinition.fields.length > 0 && (
                <div className="space-y-6">
                  <div className="h-px bg-slate-700"></div>
                  {nodeDefinition.fields.map((field: any, index: number) => (
                    <div key={field.name || index}>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-semibold text-white">
                          {field.label || field.name}
                        </label>
                        {field.required && <span className="text-red-400">*</span>}
                        {field.description && (
                          <span className="text-xs text-gray-400 italic">({field.description})</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {renderDynamicField(
                          field,
                          config[field.name],
                          (value) => setConfig({...config, [field.name]: value}),
                          field.name
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Advanced Section */}
              {showAdvanced && (
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <Button
                    variant="outline"
                    className="w-full border-slate-700 text-gray-300 hover:bg-slate-700 mb-3"
                    onClick={() => setShowAddFieldModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Field
                  </Button>
                </div>
              )}
            </div>
          </div>

        {/* Clean Footer with Actions */}
        <div className="border-t border-slate-700 bg-slate-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showAdvanced && (
              <button
                onClick={() => setShowAdvanced(false)}
                className="text-sm font-medium text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 text-gray-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            {onTest && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTestLoading}
                className="border-slate-700 text-gray-300 hover:bg-slate-800"
              >
                {isTestLoading ? (
                  <RotateCcw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
            )}
            <Button
              onClick={handleSave}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add Configuration Field</h3>
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewFieldName('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-white text-sm font-medium mb-2 block">
                  Field Name
                </Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., timeout, message"
                  className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFieldName.trim()) {
                      setConfig(prev => ({ ...prev, [newFieldName.trim()]: '' }));
                      setShowAddFieldModal(false);
                      setNewFieldName('');
                    }
                    if (e.key === 'Escape') {
                      setShowAddFieldModal(false);
                      setNewFieldName('');
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 text-gray-300 hover:bg-slate-800"
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldName('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                disabled={!newFieldName.trim()}
                onClick={() => {
                  if (newFieldName.trim()) {
                    setConfig(prev => ({ ...prev, [newFieldName.trim()]: '' }));
                    setShowAddFieldModal(false);
                    setNewFieldName('');
                  }
                }}
              >
                Add Field
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Variable Reference Picker */}
      {showVariablePicker && node && (
        <VariableReferencePicker
          workflowNodes={workflowData.nodes}
          workflowConnections={workflowData.connections}
          currentNodeId={node.id}
          workflowId={currentWorkflowId}
          onSelect={(variablePath) => {
            setConfig(prev => ({
              ...prev,
              [variablePickerField]: (prev[variablePickerField] || '') + variablePath
            }));
          }}
          onClose={() => setShowVariablePicker(false)}
        />
      )}

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-zinc-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add Configuration Field</h3>
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewFieldName('');
                  }}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-white text-sm font-medium mb-2 block">
                  Field Name
                </Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Enter field name (e.g. timeout, url, message)"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFieldName.trim()) {
                      setConfig(prev => ({ ...prev, [newFieldName.trim()]: '' }));
                      setShowAddFieldModal(false);
                      setNewFieldName('');
                    }
                    if (e.key === 'Escape') {
                      setShowAddFieldModal(false);
                      setNewFieldName('');
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-zinc-400 mt-2">
                  This will add a new configuration field to the node.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldName('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#FF6900] hover:bg-[#E55D00] text-white"
                disabled={!newFieldName.trim()}
                onClick={() => {
                  if (newFieldName.trim()) {
                    setConfig(prev => ({ ...prev, [newFieldName.trim()]: '' }));
                    setShowAddFieldModal(false);
                    setNewFieldName('');
                  }
                }}
              >
                Add Field
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Variable Reference Picker */}
      {showVariablePicker && node && (
        <VariableReferencePicker
          workflowNodes={workflowData.nodes}
          workflowConnections={workflowData.connections}
          currentNodeId={node.id}
          workflowId={currentWorkflowId}
          onSelect={(variablePath) => {
            // Update the config with the selected variable
            setConfig(prev => ({
              ...prev,
              [variablePickerField]: (prev[variablePickerField] || '') + variablePath
            }));
          }}
          onClose={() => setShowVariablePicker(false)}
        />
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from 'react';
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
  Plus
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
import { getNodeMapping } from '@/lib/workflow/utils/NodeMapping';
import { getBrandLogo } from '@/lib/workflow/utils/BrandLogoMapping';

interface NodeConfigModalProps {
  node: WorkflowNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeConfig: Record<string, any>) => void;
  onTest?: (testWorkflow: any, config: Record<string, any>) => Promise<any>;
  onDelete?: () => void;
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

// Helper function to render dynamic form fields
const renderDynamicField = (field: any, value: any, onChange: (newValue: any) => void) => {
  const { type, placeholder, options, validation } = field;
  
  switch (type) {
    case 'text':
    case 'email':
    case 'url':
    case 'password':
      return (
        <Input
          type={type === 'password' ? 'password' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      );
      
    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-800 border-zinc-700 text-white"
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
          className="bg-zinc-800 border-zinc-700 text-white"
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
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
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
          className="bg-zinc-800 border-zinc-700 text-white"
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
          className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
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
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      );
      
    case 'color':
      return (
        <Input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700 w-20 h-10"
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

export default function NodeConfigModal({ 
  node, 
  isOpen, 
  onClose, 
  onSave, 
  onTest, 
  onDelete 
}: NodeConfigModalProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'config' | 'settings' | 'test'>('config');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Triggers']);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  
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
  const [isLoadingNodeData, setIsLoadingNodeData] = useState(false);

  useEffect(() => {
    if (node) {
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
    }
  }, [node]);
  
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
        
        data.data.forEach((nodeType: any) => {
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
  
  // Load specific node definition
  const loadNodeDefinition = async (nodeType: string) => {
    setIsLoadingNodeData(true);
    try {
      // Find node by type
      const response = await fetch(`/api/admin/nodes?search=${nodeType}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const definition = data.data.find((n: any) => n.type === nodeType);
        if (definition) {
          setNodeDefinition(definition);
        }
      }
    } catch (error) {
      console.error('Error loading node definition:', error);
    } finally {
      setIsLoadingNodeData(false);
    }
  };

  if (!isOpen || !node) return null;

  const nodeMapping = getNodeMapping(node.type);
  const nodeDoc = nodeDefinition || { description: `Configure the ${node.type} node`, examples: [], fields: {} };
  const BrandLogo = getBrandLogo(node.type);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleTest = async () => {
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
  
  // Get mock test result based on node type
  const getMockTestResult = (nodeType: string, nodeConfig: any) => {
    const mockResults: Record<string, any> = {
      'HTTP Request': {
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
      'Database': {
        query: nodeConfig.query || 'SELECT * FROM users',
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
        affectedRows: 1
      },
      'Slack': {
        ok: true,
        channel: nodeConfig.channel || '#general',
        ts: Date.now().toString(),
        message: { text: nodeConfig.text || 'Hello from NexAgent!' }
      },
      'OpenAI': {
        model: nodeConfig.model || 'gpt-3.5-turbo',
        prompt: nodeConfig.prompt || 'Test prompt',
        response: 'This is a test response from the AI model.',
        tokensUsed: 45,
        cost: 0.00009
      },
      'On Clicking Execute': {
        triggered: true,
        timestamp: new Date().toISOString(),
        executionId: `exec_${Date.now()}`
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
        <Input
          value={config[key] || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={`Enter ${key}...`}
          className="bg-zinc-900 border-zinc-700 text-white"
        />
      );
    }
    
    return renderDynamicField(
      field,
      config[key],
      (newValue) => setConfig(prev => ({ ...prev, [key]: newValue }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-8">
      <div className="w-full h-full max-w-7xl max-h-[90vh] bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex">
        {/* Left Sidebar - Node Navigation */}
        <div className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-white mb-2">Nodes</h3>
            <div className="relative">
              <Input
                placeholder="Search nodes..."
                className="bg-zinc-900 border-zinc-700 text-white text-sm pl-8"
              />
              <Globe className="absolute left-2.5 top-2.5 w-3 h-3 text-zinc-500" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {nodeCategories.map((category) => (
              <div key={category.name} className="mb-2">
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 text-left"
                >
                  <div className="flex items-center gap-2 text-sm text-white">
                    {category.icon}
                    <span>{category.name}</span>
                  </div>
                  {expandedCategories.includes(category.name) ? 
                    <ChevronDown className="w-4 h-4 text-zinc-400" /> :
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  }
                </button>
                
                {expandedCategories.includes(category.name) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {category.nodes.map((nodeItem: any) => (
                      <button
                        key={nodeItem.id || nodeItem.name}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          node.type === nodeItem.type 
                            ? 'bg-[#FF6900] text-white' 
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        {nodeItem.name || nodeItem.type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Column - Main Configuration */}
        <div className="flex-1 bg-zinc-900 flex flex-col">
          {/* Header */}
          <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <BrandLogo size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{node.name}</h2>
                <p className="text-sm text-zinc-400">{node.type}</p>
              </div>
              <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                {node.category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTestLoading}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                {isTestLoading ? (
                  <RotateCcw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-[#FF6900] hover:bg-[#E55D00] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab as any} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 w-fit bg-zinc-800 border-zinc-700 flex-shrink-0">
              <TabsTrigger value="config" className="data-[state=active]:bg-[#FF6900]">
                Configuration
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-[#FF6900]">
                Settings
              </TabsTrigger>
              <TabsTrigger value="test" className="data-[state=active]:bg-[#FF6900]">
                Test & Output
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <TabsContent value="config" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Node Configuration</h3>
                  <div className="grid gap-6">
                    {/* Basic Configuration */}
                    <div className="space-y-4">
                      <Label className="text-white text-sm font-medium">Name</Label>
                      <Input
                        value={node.name}
                        onChange={(e) => {/* Update node name */}}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>

                    {/* HTTP Request (Webhook/API) Editor */}
                    {(node.type === 'HTTP Request' || node.type === 'Webhook') && (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-5 gap-3 items-end">
                          <div className="md:col-span-1">
                            <Label className="text-white text-sm">Method</Label>
                            <Select value={config.method || 'GET'} onValueChange={(v) => setConfig(prev => ({ ...prev, method: v }))}>
                              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                {['GET','POST','PUT','PATCH','DELETE','HEAD'].map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-4">
                            <Label className="text-white text-sm">URL</Label>
                            <Input
                              value={config.url || ''}
                              onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                              placeholder="https://api.example.com/resource"
                              className="bg-zinc-900 border-zinc-700 text-white"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-white text-sm">Headers</Label>
                              <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800" onClick={addHeaderRow}>+ Add</Button>
                            </div>
                            <div className="space-y-2">
                              {(config.headersList || [{key: '', value: ''}]).map((row: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-5 gap-2">
                                  <Input placeholder="Key" value={row.key} onChange={(e) => updateHeaderRow(idx, 'key', e.target.value)} className="col-span-2 bg-zinc-900 border-zinc-700 text-white" />
                                  <Input placeholder="Value" value={row.value} onChange={(e) => updateHeaderRow(idx, 'value', e.target.value)} className="col-span-3 bg-zinc-900 border-zinc-700 text-white" />
                                  <div className="col-span-5 text-right">
                                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => removeHeaderRow(idx)}>Remove</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-white text-sm">Query Params</Label>
                              <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800" onClick={addParamRow}>+ Add</Button>
                            </div>
                            <div className="space-y-2">
                              {(config.paramsList || [{key: '', value: ''}]).map((row: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-5 gap-2">
                                  <Input placeholder="Key" value={row.key} onChange={(e) => updateParamRow(idx, 'key', e.target.value)} className="col-span-2 bg-zinc-900 border-zinc-700 text-white" />
                                  <Input placeholder="Value" value={row.value} onChange={(e) => updateParamRow(idx, 'value', e.target.value)} className="col-span-3 bg-zinc-900 border-zinc-700 text-white" />
                                  <div className="col-span-5 text-right">
                                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => removeParamRow(idx)}>Remove</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Bearer Token (Authorization)</Label>
                            <Input
                              type="password"
                              value={config.bearerToken || ''}
                              onChange={(e) => {
                                const token = e.target.value;
                                const current = Array.isArray(config.headersList) ? [...config.headersList] : [];
                                const idx = current.findIndex((r: any) => r.key.toLowerCase() === 'authorization');
                                const val = token ? `Bearer ${token}` : '';
                                if (idx >= 0) current[idx].value = val; else current.push({ key: 'Authorization', value: val });
                                const headersObj: Record<string,string> = {};
                                current.filter((r: any) => r.key).forEach((r: any) => { headersObj[r.key] = r.value; });
                                setConfig(prev => ({ ...prev, bearerToken: token, headersList: current, headers: headersObj }));
                              }}
                              placeholder="sk-..."
                              className="bg-zinc-900 border-zinc-700 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Timeout (ms)</Label>
                            <Input type="number" value={config.timeout || 30000} onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))} className="bg-zinc-900 border-zinc-700 text-white" />
                          </div>
                        </div>

                        {!(config.method || 'GET').match(/GET|HEAD/) && (
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Body (JSON)</Label>
                            <Textarea
                              rows={6}
                              value={typeof config.body === 'string' ? config.body : JSON.stringify(config.body || {}, null, 2)}
                              onChange={(e) => {
                                try { setConfig(prev => ({ ...prev, body: JSON.parse(e.target.value) })); }
                                catch { setConfig(prev => ({ ...prev, body: e.target.value })); }
                              }}
                              placeholder='{"name":"John"}'
                              className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
                            />
                          </div>
                        )}

                        <div className="text-xs text-zinc-400">
                          Final URL used on test/save: {buildUrlWithParams(config.url || '', config.paramsList || [])}
                        </div>
                      </div>
                    )}

                    {/* Dynamic Config Fields from Node Definition */}
                    {isLoadingNodeData ? (
                      <div className="text-center py-8 text-zinc-400">
                        Loading node configuration...
                      </div>
                    ) : nodeDefinition?.fields?.length > 0 ? (
                      // Group fields by their group property
                      Object.entries(
                        nodeDefinition.fields.reduce((groups: any, field: any) => {
                          const group = field.group || 'General';
                          if (!groups[group]) groups[group] = [];
                          groups[group].push(field);
                          return groups;
                        }, {})
                      ).map(([groupName, fields]) => (
                        <div key={groupName} className="space-y-4">
                          {groupName !== 'General' && (
                            <h4 className="text-md font-medium text-white border-b border-zinc-800 pb-2">
                              {groupName}
                            </h4>
                          )}
                          {(fields as any[]).sort((a, b) => (a.order || 0) - (b.order || 0)).map((field) => (
                            <div key={field.key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-white text-sm font-medium">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-red-400 ml-1">*</span>
                                  )}
                                </Label>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              {field.description && (
                                <p className="text-xs text-zinc-400 mb-2">{field.description}</p>
                              )}
                              {renderConfigField(field, field.key)}
                              {field.helpText && (
                                <p className="text-xs text-zinc-500 mt-1">{field.helpText}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      // Fallback to legacy config fields
                      Object.entries(config).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-white text-sm font-medium capitalize">
                              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                            </Label>
                            {['url', 'to', 'query', 'prompt'].includes(key) && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          {renderConfigField(null, key)}
                        </div>
                      ))
                    )}

                    {/* Add New Field */}
                    <Button
                      variant="outline"
                      className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 w-fit"
                      onClick={() => setShowAddFieldModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Field
                    </Button>

                    {/* Advanced Settings Toggle */}
                    <div className="pt-4 border-t border-zinc-800">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
                      >
                        {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                      </button>
                      
                      {showAdvanced && (
                        <div className="mt-4 space-y-4 p-4 bg-zinc-800/50 rounded-lg">
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Timeout (ms)</Label>
                            <Input
                              type="number"
                              value={config.timeout || 30000}
                              onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                              className="bg-zinc-900 border-zinc-700 text-white"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Retry Count</Label>
                            <Input
                              type="number"
                              value={config.retryCount || 3}
                              onChange={(e) => setConfig(prev => ({ ...prev, retryCount: parseInt(e.target.value) }))}
                              className="bg-zinc-900 border-zinc-700 text-white"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label className="text-white text-sm">Continue on Error</Label>
                            <Switch
                              checked={config.continueOnError || false}
                              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, continueOnError: checked }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Node Settings</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white text-sm font-medium">Enable Node</Label>
                        <p className="text-xs text-zinc-400 mt-1">Enable or disable this node in the workflow</p>
                      </div>
                      <Switch checked={node.enabled} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white text-sm font-medium">Description</Label>
                      <Textarea
                        value={node.description || ''}
                        placeholder="Add a description for this node..."
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-800">
                      <Label className="text-white text-sm font-medium mb-4 block">Danger Zone</Label>
                      <Button
                        variant="destructive"
                        onClick={onDelete}
                        className="w-fit"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Node
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="test" className="space-y-6 mt-0">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Test Node</h3>
                    <Button
                      onClick={handleTest}
                      disabled={isTestLoading}
                      className="bg-[#FF6900] hover:bg-[#E55D00] text-white"
                    >
                      {isTestLoading ? (
                        <RotateCcw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Execute Test
                    </Button>
                  </div>
                  
                  {testResult && (
                    <div className={`p-4 rounded-lg border-2 ${
                      testResult.success 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">
                          {testResult.success ? '✅ Test Successful' : '❌ Test Failed'}
                        </h4>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                            {testResult.executionTime}ms
                          </Badge>
                          {testResult.metadata?.mock && (
                            <Badge variant="secondary" className="bg-blue-900/20 border-blue-500/30 text-blue-300">
                              Mock Data
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Test Result Data */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-zinc-400 mb-1 block">Result Data</label>
                          <div className="bg-zinc-900/50 p-3 rounded text-sm max-h-48 overflow-auto">
                            <pre className="text-white text-xs leading-relaxed">
                              {JSON.stringify(testResult.data || testResult.error, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Execution Logs if available */}
                        {testResult.metadata?.logs && testResult.metadata.logs.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-zinc-400 mb-1 block">Execution Logs</label>
                            <div className="bg-zinc-900/50 p-3 rounded text-sm max-h-24 overflow-auto">
                              {testResult.metadata.logs.map((log: any, index: number) => (
                                <div key={index} className="text-xs text-zinc-300 mb-1">
                                  <span className={`inline-block px-1 rounded text-xs ${
                                    log.status === 'completed' ? 'bg-green-600/20 text-green-300' :
                                    log.status === 'failed' ? 'bg-red-600/20 text-red-300' :
                                    'bg-yellow-600/20 text-yellow-300'
                                  }`}>
                                    {log.status}
                                  </span>
                                  <span className="ml-2">{log.nodeName}</span>
                                  {log.duration && <span className="ml-2 text-zinc-500">({log.duration}ms)</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Test Metadata */}
                        {testResult.metadata && Object.keys(testResult.metadata).length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-zinc-400 mb-1 block">Metadata</label>
                            <div className="bg-zinc-900/50 p-3 rounded text-sm max-h-40 overflow-auto">
                              <pre className="text-zinc-300 text-xs leading-relaxed">
                                {JSON.stringify(testResult.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(testResult, null, 2))}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(testResult.data, null, 2))}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Result
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                          onClick={() => setTestResult(null)}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar - Documentation & Help */}
        <div className="w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-[#FF6900]" />
              <h3 className="text-sm font-medium text-white">Documentation</h3>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">About {node.type}</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {nodeDoc.description}
              </p>
            </div>

            {/* Field Descriptions */}
            {nodeDefinition?.fields?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Configuration Fields</h4>
                <div className="space-y-3">
                  {nodeDefinition.fields
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                    .map((field: any) => (
                    <div key={field.key} className="p-3 bg-zinc-900/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs text-[#FF6900] font-mono">{field.key}</code>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs px-1 py-0 h-4">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-white mb-1">{field.label}</p>
                      <p className="text-xs text-zinc-400">{field.description || 'No description available'}</p>
                      {field.helpText && (
                        <p className="text-xs text-zinc-500 mt-1 italic">{field.helpText}</p>
                      )}
                      {field.type && (
                        <Badge variant="outline" className="mt-2 text-xs border-zinc-600">{field.type}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            {nodeDefinition?.examples?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Examples</h4>
                <div className="space-y-3">
                  {nodeDefinition.examples.map((example: any, index: number) => (
                    <div key={index} className="border border-zinc-800 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-800">
                        <p className="text-sm font-medium text-white">{example.name}</p>
                        {example.description && (
                          <p className="text-xs text-zinc-400 mt-1">{example.description}</p>
                        )}
                      </div>
                      <div className="p-3">
                        <pre className="text-xs text-zinc-300 overflow-x-auto">
                          {JSON.stringify(example.config, null, 2)}
                        </pre>
                        {example.expectedOutput && (
                          <div className="mt-2 p-2 bg-zinc-800/50 rounded">
                            <p className="text-xs text-zinc-500 mb-1">Expected Output:</p>
                            <pre className="text-xs text-zinc-400">
                              {JSON.stringify(example.expectedOutput, null, 2)}
                            </pre>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-xs h-7"
                          onClick={() => {
                            // Merge example config with current config
                            const newConfig = { ...config };
                            Object.entries(example.config).forEach(([key, value]) => {
                              newConfig[key] = value;
                            });
                            setConfig(newConfig);
                          }}
                        >
                          Use Example
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation Link */}
            {nodeDefinition?.documentation && (
              <div className="p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">📖 Documentation</h4>
                <div className="prose prose-invert prose-xs max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: nodeDefinition.documentation }} />
                </div>
              </div>
            )}
            
            {/* Trigger Information */}
            {nodeDefinition?.trigger && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-300 mb-2">⚡ Trigger Node</h4>
                <p className="text-xs text-yellow-200 mb-2">
                  This node can trigger workflows automatically.
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Type:</span>
                    <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                      {nodeDefinition.trigger.type}
                    </Badge>
                  </div>
                  {nodeDefinition.trigger.platform?.platform && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Platform:</span>
                      <span className="text-yellow-200 capitalize">{nodeDefinition.trigger.platform.platform}</span>
                    </div>
                  )}
                  {nodeDefinition.trigger.platform?.event && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Event:</span>
                      <span className="text-yellow-200">{nodeDefinition.trigger.platform.event}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Tips */}
            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Pro Tip</h4>
              <p className="text-xs text-blue-200">
                Use the Test button to validate your configuration before saving. This will help you catch any issues early.
                {nodeDefinition?.fields?.some((f: any) => f.required) && (
                  ' Make sure to fill in all required fields (marked with *)!'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      
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
    </div>
  );
}
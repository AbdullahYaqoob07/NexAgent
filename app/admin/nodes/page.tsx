'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Settings, 
  Play, 
  Pause,
  Copy,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  Code,
  Globe,
  Database,
  Clock,
  Webhook,
  FileText,
  Eye
} from 'lucide-react';
import { NodeDefinition, NodeField, FieldType, PLATFORM_EVENTS } from '@/lib/schemas/node';

interface AdminNodesPageProps {}

const AdminNodesPage: React.FC<AdminNodesPageProps> = () => {
  // State management
  const [nodes, setNodes] = useState<NodeDefinition[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<NodeDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNode, setEditingNode] = useState<NodeDefinition | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  // Form state for create/edit modal
  const [formData, setFormData] = useState<any>({
    name: '',
    type: '',
    category: '',
    description: '',
    fields: [],
    examples: [],
    implementation: {
      type: 'javascript',
      code: ''
    },
    isActive: true,
    isStartNode: false,
    isEndNode: false
  });

  // Load nodes and metadata
  useEffect(() => {
    loadNodes();
    loadMetadata();
  }, []);

  // Filter nodes
  useEffect(() => {
    let filtered = nodes;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(node => node.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(node =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredNodes(filtered);
  }, [nodes, selectedCategory, searchQuery]);

  const loadNodes = async () => {
    try {
      const response = await fetch('/api/admin/nodes');
      const data = await response.json();
      
      if (data.success) {
        setNodes(data.nodes || data.data || []);
      }
    } catch (error) {
      console.error('Error loading nodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const response = await fetch('/api/admin/nodes/metadata');
      const data = await response.json();
      
      if (data.success) {
        setMetadata(data.data);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  const handleCreateNode = () => {
    setFormData({
      name: '',
      type: '',
      category: '',
      description: '',
      fields: [],
      examples: [],
      implementation: {
        type: 'javascript',
        code: ''
      },
      isActive: true,
      isStartNode: false,
      isEndNode: false
    });
    setEditingNode(null);
    setShowCreateModal(true);
  };

  const handleEditNode = (node: NodeDefinition) => {
    setFormData(node);
    setEditingNode(node);
    setShowCreateModal(true);
  };

  const handleSaveNode = async () => {
    try {
      const url = editingNode ? `/api/admin/nodes/${editingNode.id}` : '/api/admin/nodes';
      const method = editingNode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowCreateModal(false);
        await loadNodes();
      } else {
        console.error('Error saving node:', data.error);
      }
    } catch (error) {
      console.error('Error saving node:', error);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node?')) return;
    
    try {
      const response = await fetch(`/api/admin/nodes/${nodeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadNodes();
      } else {
        console.error('Error deleting node:', data.error);
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleToggleNodeStatus = async (nodeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/nodes/${nodeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadNodes();
      }
    } catch (error) {
      console.error('Error toggling node status:', error);
    }
  };


  const addField = () => {
    const newField: NodeField = {
      key: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text' as FieldType,
      required: false,
      order: formData.fields?.length || 0
    };
    
    setFormData((prev: any) => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
  };

  const updateField = (index: number, field: Partial<NodeField>) => {
    setFormData((prev: any) => ({
      ...prev,
      fields: prev.fields?.map((f: any, i: number) => i === index ? { ...f, ...field } : f) || []
    }));
  };

  const removeField = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      fields: prev.fields?.filter((_: any, i: number) => i !== index) || []
    }));
  };

  const categories = metadata?.categories || [];
  const fieldTypes = metadata?.fieldTypes || [];
  const triggerTypes = metadata?.triggerTypes || [];
  const implementationTypes = metadata?.implementationTypes || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Node Management</h1>
            <p className="text-zinc-400">Create and manage workflow nodes with custom actions and triggers</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleCreateNode} className="bg-[#FF6900] hover:bg-[#E55D00]">
              <Plus className="w-4 h-4 mr-2" />
              Create Node
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category: string) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Nodes</p>
                  <p className="text-2xl font-bold">{nodes.length}</p>
                </div>
                <Settings className="w-8 h-8 text-[#FF6900]" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Active Nodes</p>
                  <p className="text-2xl font-bold">{nodes.filter(n => n.isActive).length}</p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Trigger Nodes</p>
                  <p className="text-2xl font-bold">{nodes.filter(n => n.trigger).length}</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Categories</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <Filter className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nodes Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Nodes</CardTitle>
            <CardDescription>
              Manage your workflow nodes and their configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredNodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-zinc-700 rounded-lg flex items-center justify-center">
                      <Settings className="w-6 h-6 text-zinc-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{node.name}</h3>
                        <Badge variant={node.isActive ? "default" : "secondary"}>
                          {node.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {node.trigger && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            Trigger
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-zinc-400 mb-2 line-clamp-2">
                        {node.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>{node.category}</span>
                        <span>•</span>
                        <span>{node.fields?.length || 0} fields</span>
                        <span>•</span>
                        <span>v{node.version}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleNodeStatus(node.id, !node.isActive)}
                    >
                      {node.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNode(node)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNode(node.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {filteredNodes.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  No nodes found. Create your first node to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Node Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>
              {editingNode ? 'Edit Node' : 'Create New Node'}
            </DialogTitle>
            <DialogDescription>
              Configure the node properties, fields, and implementation
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-zinc-800">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="triggers">Triggers</TabsTrigger>
              <TabsTrigger value="implementation">Implementation</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Type (Unique ID)</Label>
                  <Input
                    id="type"
                    value={formData.type || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="e.g., shopify_new_order"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category || ''}
                    onValueChange={(value) => setFormData((prev: any) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {categories.map((category: string) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version || '1.0.0'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, version: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive || false}
                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isStartNode"
                    checked={formData.isStartNode || false}
                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, isStartNode: checked }))}
                  />
                  <Label htmlFor="isStartNode">Can Start Workflow</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isEndNode"
                    checked={formData.isEndNode || false}
                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, isEndNode: checked }))}
                  />
                  <Label htmlFor="isEndNode">Can End Workflow</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Configuration Fields</h3>
                <Button onClick={addField} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>

              {formData.fields?.map((field: any, index: number) => (
                <Card key={index} className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Field Key</Label>
                        <Input
                          value={field.key}
                          onChange={(e) => updateField(index, { key: e.target.value })}
                          className="bg-zinc-900 border-zinc-700"
                        />
                      </div>
                      
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          className="bg-zinc-900 border-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateField(index, { type: value as FieldType })}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            {fieldTypes.map((type: any) => (
                              <SelectItem key={type.type} value={type.type}>
                                {type.icon} {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          className="bg-zinc-900 border-zinc-700"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(index, { required: checked })}
                        />
                        <Label>Required</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label>Description</Label>
                        <Textarea
                          value={field.description || ''}
                          onChange={(e) => updateField(index, { description: e.target.value })}
                          className="bg-zinc-900 border-zinc-700"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(index)}
                        className="ml-4 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!formData.fields?.length && (
                <div className="text-center py-8 text-zinc-400">
                  No fields added yet. Click "Add Field" to create configuration fields.
                </div>
              )}
            </TabsContent>

            <TabsContent value="triggers" className="space-y-4">
              <div>
                <Label>Trigger Type</Label>
                <Select
                  value={formData.trigger?.type || 'manual'}
                  onValueChange={(value) => setFormData((prev: any) => ({
                    ...prev,
                    trigger: { type: value as any, ...prev.trigger }
                  }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {triggerTypes.map((trigger: any) => (
                      <SelectItem key={trigger.type} value={trigger.type}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger?.type === 'event' && (
                <div className="space-y-4">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={formData.trigger?.platform?.platform || ''}
                      onValueChange={(value) => setFormData((prev: any) => ({
                        ...prev,
                        trigger: {
                          type: prev.trigger?.type || 'event',
                          ...prev.trigger,
                          platform: { ...prev.trigger?.platform, platform: value as any }
                        }
                      }))}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {Object.keys(PLATFORM_EVENTS).map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.trigger?.platform?.platform && (
                    <div>
                      <Label>Event</Label>
                      <Select
                        value={formData.trigger?.platform?.event || ''}
                        onValueChange={(value) => setFormData((prev: any) => ({
                          ...prev,
                          trigger: {
                            type: prev.trigger?.type || 'event',
                            ...prev.trigger,
                            platform: { ...prev.trigger?.platform, event: value }
                          }
                        }))}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {PLATFORM_EVENTS[formData.trigger.platform.platform as keyof typeof PLATFORM_EVENTS]?.map((event) => (
                            <SelectItem key={event.event} value={event.event}>
                              {event.label} - {event.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="implementation" className="space-y-4">
              <div>
                <Label>Implementation Type</Label>
                <Select
                  value={formData.implementation?.type || 'javascript'}
                  onValueChange={(value) => setFormData((prev: any) => ({
                    ...prev,
                    implementation: { ...prev.implementation, type: value as any }
                  }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {implementationTypes.map((impl: any) => (
                      <SelectItem key={impl.type} value={impl.type}>
                        {impl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(formData.implementation?.type === 'javascript' || formData.implementation?.type === 'python') && (
                <div>
                  <Label>Code</Label>
                  <Textarea
                    value={formData.implementation?.code || ''}
                    onChange={(e) => setFormData((prev: any) => ({
                      ...prev,
                      implementation: { ...prev.implementation, code: e.target.value }
                    }))}
                    className="bg-zinc-800 border-zinc-700 font-mono text-sm"
                    rows={10}
                    placeholder={`Enter your ${formData.implementation?.type} code here...`}
                  />
                </div>
              )}

              {formData.implementation?.type === 'api' && (
                <div>
                  <Label>API Endpoint</Label>
                  <Input
                    value={formData.implementation?.apiEndpoint || ''}
                    onChange={(e) => setFormData((prev: any) => ({
                      ...prev,
                      implementation: { ...prev.implementation, apiEndpoint: e.target.value }
                    }))}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNode} className="bg-[#FF6900] hover:bg-[#E55D00]">
              <Save className="w-4 h-4 mr-2" />
              {editingNode ? 'Update Node' : 'Create Node'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNodesPage;
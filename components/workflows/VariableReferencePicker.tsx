"use client";

import { useState, useMemo } from 'react';
import { Search, X, Copy, Database, Zap, Globe, MessageSquare, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getNodeDefinitionByType } from '@/lib/workflow/NodeDefinitions';
import { getNodeByType } from '@/lib/workflow/NodeRegistry';

interface VariableReferencePickerProps {
  workflowNodes: any[];
  workflowConnections: any[];
  currentNodeId: string;
  workflowId?: string;
  lastNodeOutputs?: Record<string, Record<string, any>>;
  onSelect: (variablePath: string) => void;
  onClose: () => void;
}

// Flatten an object into dot-notation field list
function flattenOutput(obj: any, prefix = ''): Array<{ path: string; type: string; preview: string }> {
  if (obj == null || typeof obj !== 'object') return [];
  return Object.entries(obj).flatMap(([key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const isObj = val != null && typeof val === 'object' && !Array.isArray(val);
    const isArr = Array.isArray(val);
    const type = isArr ? 'array' : isObj ? 'object' : typeof val;
    const preview = isObj || isArr ? '' : String(val).substring(0, 40);
    return [
      { path: fullKey, type, preview },
      ...(isObj ? flattenOutput(val, fullKey) : []),
    ];
  });
}

const getNodeIcon = (nodeType: string): string => {
  const registryNode = getNodeByType(nodeType);
  if (registryNode?.icon) return registryNode.icon;

  // Fallbacks for legacy/unknown types
  const iconMap: Record<string, string> = {
    'HTTP Request': '🌐',
    'Logger': '🧾',
    'Variable Setter': '📌',
    'ManualTrigger': '⚡',
    'Manual Trigger': '⚡',
    'Schedule': '🕐',
    'Webhook': '🪝',
    'ChatInput': '💬',
  };

  return iconMap[nodeType] || '🧩';
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    string: '🔤', number: '🔢', boolean: '✓',
    object: '{}', array: '[]', date: '📅', json: '{ }',
  };
  return icons[type] || '•';
};

export default function VariableReferencePicker({
  workflowNodes,
  workflowConnections,
  currentNodeId,
  lastNodeOutputs,
  onSelect,
  onClose,
}: VariableReferencePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Build list of upstream nodes with their output field definitions
  const upstreamNodes = useMemo(() => {
    if (!workflowNodes.length || !currentNodeId) return [];

    // Collect all node IDs that are upstream of currentNodeId via BFS
    const upstreamIds = new Set<string>();
    const queue = [currentNodeId];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      for (const conn of workflowConnections) {
        // Support both {from/to} and {source/target} connection formats
        const src = conn.from ?? conn.source ?? conn.sourceNodeId;
        const tgt = conn.to ?? conn.target ?? conn.targetNodeId;
        if (tgt === nodeId && src && !upstreamIds.has(src)) {
          upstreamIds.add(src);
          queue.push(src);
        }
      }
    }

    return workflowNodes
      .filter(n => upstreamIds.has(n.id))
      .map(n => {
        const def = getNodeDefinitionByType(n.type);
        const defFields: Array<{ path: string; type: string; preview: string }> =
          (def?.outputs?.main?.fields ?? []).map((f: any) => ({
            path: f.name,
            type: f.type,
            preview: f.description ?? '',
          }));

        // Merge with flattened actual execution output (includes nested keys)
        const execOutput = lastNodeOutputs?.[n.id];
        const execFields = execOutput ? flattenOutput(execOutput) : [];

        // Use exec fields if available (they include nested paths), fall back to def fields
        const fields = execFields.length > 0 ? execFields : defFields;

        return { node: n, fields };
      })
      .filter(({ fields }) => fields.length > 0);
  }, [workflowNodes, workflowConnections, currentNodeId]);

  const filtered = useMemo(() => {
    if (!searchTerm) return upstreamNodes;
    const lower = searchTerm.toLowerCase();
    return upstreamNodes
      .map(({ node, fields }) => ({
        node,
        fields: fields.filter(
          (f) =>
            f.path.toLowerCase().includes(lower) ||
            (f.preview || '').toLowerCase().includes(lower) ||
            (node.name || node.type || '').toLowerCase().includes(lower)
        ),
      }))
      .filter(({ fields }) => fields.length > 0);
  }, [upstreamNodes, searchTerm]);

  const handleSelect = (nodeId: string, fieldName: string) => {
    onSelect(`{{$node.${nodeId}.${fieldName}}}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#FF6900]" />
            <h3 className="text-lg font-semibold text-white">Variable References</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              {upstreamNodes.length === 0 ? (
                <>
                  <p className="text-sm">No upstream nodes connected</p>
                  <p className="text-xs mt-1">Connect nodes before this one to reference their outputs</p>
                </>
              ) : (
                <>
                  <p className="text-sm">No variables match your search</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(({ node, fields }) => (
                <div key={node.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center">
                      {(() => {
                        const icon = getNodeIcon(node.type);
                        return icon.startsWith('/') || icon.startsWith('http') ? (
                          <img src={icon} alt={node.type} className="w-4 h-4 object-contain" />
                        ) : (
                          <span className="text-sm">{icon}</span>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{node.name || node.type}</div>
                      <div className="text-xs text-zinc-400 font-mono truncate">{node.id}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {fields.length} fields
                    </Badge>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {fields.map((field) => {
                      const varPath = `{{$node.${node.id}.${field.path}}}`;
                      const depth = field.path.split('.').length - 1;
                      return (
                        <div
                          key={field.path}
                          className="px-3 py-2 hover:bg-zinc-800/50 cursor-pointer group flex items-center gap-2"
                          style={{ paddingLeft: `${12 + depth * 16}px` }}
                          onClick={() => { onSelect(varPath); onClose(); }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', varPath);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                        >
                          <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
                          <span className="text-xs text-zinc-500 shrink-0">{getTypeIcon(field.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-mono text-[#FF6900] group-hover:text-white truncate">
                              {field.path}
                            </div>
                            {field.preview && (
                              <div className="text-xs text-amber-400/70 font-mono truncate">= {field.preview}</div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(varPath);
                            }}
                            title="Copy to clipboard"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700 bg-zinc-900/50">
          <p className="text-xs text-zinc-500">
            Click a variable to insert · Drag to drop into any field · Syntax: <span className="font-mono text-zinc-400">{'{{$node.nodeId.field}}'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

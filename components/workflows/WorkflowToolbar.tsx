"use client";

import { 
  Play, 
  Save, 
  Undo, 
  Redo, 
  Settings, 
  Download,
  Upload,
  Home,
  ChevronDown,
  Bot,
  Minimize2,
  Maximize2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface WorkflowToolbarProps {
  showAssistant?: boolean;
  onToggleAssistant?: () => void;
  assistantMinimized?: boolean;
  onExecute?: () => void;
  isExecuting?: boolean;
}

export function WorkflowToolbar({ 
  showAssistant = true, 
  onToggleAssistant,
  assistantMinimized = false,
  onExecute,
  isExecuting = false
}: WorkflowToolbarProps = {}) {
  const router = useRouter();

  return (
    <div className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4">
      {/* Left Section - Logo & Navigation */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-white hover:text-[#FF6900] transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="font-semibold">NexAgent</span>
        </button>
        
        <div className="text-zinc-400 text-sm">|</div>
        
        <div className="flex items-center gap-1">
          <span className="text-sm text-white">Untitled Workflow</span>
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </div>
      </div>

      {/* Center Section - Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3"
        >
          <Undo className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3"
        >
          <Redo className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-zinc-700 mx-2" />
        
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3 gap-2"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">Import</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3 gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Export</span>
        </Button>
      </div>

      {/* Right Section - Execute & Settings */}
      <div className="flex items-center gap-2">
        {/* AI Assistant Toggle */}
        <Button
          onClick={onToggleAssistant}
          variant="ghost"
          size="sm"
          className={`h-8 px-3 gap-2 ${
            showAssistant 
              ? "text-[#FF6900] bg-[#FF6900]/10 hover:bg-[#FF6900]/20" 
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span className="text-sm">
            {assistantMinimized ? "AI" : "Assistant"}
            {showAssistant && (
              <span className="ml-1 text-xs opacity-75">
                {assistantMinimized ? "●" : "online"}
              </span>
            )}
          </span>
        </Button>
        
        <div className="w-px h-6 bg-zinc-700" />
        
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3 gap-2"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm">Save</span>
        </Button>
        
        <Button
          onClick={onExecute}
          disabled={isExecuting}
          size="sm"
          className="bg-[#FF6900] hover:bg-[#E55D00] text-white h-8 px-4 gap-2 disabled:opacity-50"
        >
          {isExecuting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Executing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span className="text-sm">Execute</span>
            </>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 px-3"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default WorkflowToolbar;
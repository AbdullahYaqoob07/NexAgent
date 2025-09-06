"use client";

import { motion } from "framer-motion";
import { Copy, CheckCircle, Code, Database, Settings, Zap, GitBranch, FileText, Terminal, Layers, BookOpen, ArrowRight, ChevronRight, Workflow, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import DocsLayout from "@/components/docs/DocsLayout";
import { useState } from "react";

const JsonNodeEnginePage = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const quickStartExample = `import { WorkflowEngine } from './lib/workflow/engine';
import { ImportWorkflowFromJSON } from './lib/workflow/json-utils';

// Initialize the engine
const engine = new WorkflowEngine();

// Simple workflow JSON
const simpleWorkflow = {
  name: "Welcome Email Flow",
  description: "Send welcome email to new users",
  nodes: [
    {
      type: "webhook",
      name: "User Signup",
      position: { x: 100, y: 100 },
      config: {
        method: "POST",
        path: "/webhook/signup",
        authentication: "none"
      }
    },
    {
      type: "email_send", 
      name: "Send Welcome Email",
      position: { x: 400, y: 100 },
      config: {
        to: ["${'{{user.email}}'}'],
        subject: "Welcome to NexAgent!",
        body: "Thank you for signing up!"
      }
    }
  ],
  connections: [
    {
      from: "User Signup",
      to: "Send Welcome Email"
    }
  ]
};

// Create workflow from JSON
const workflow = await engine.createWorkflowFromJSON(simpleWorkflow);
console.log("Workflow created:", workflow.name);`;

  const nodeTypesExample = `// Available Node Types in NexAgent

// 🎯 Triggers
{
  type: "http_webhook",    // HTTP webhook endpoints
  type: "schedule",        // Cron-based scheduling
  type: "file_watch",      // File system monitoring
  type: "database_trigger", // Database change detection
  type: "email_trigger"    // Email monitoring
}

// ⚡ Actions  
{
  type: "http_request",    // Make HTTP calls
  type: "email_send",      // Send emails
  type: "database_query",  // Database operations
  type: "file_operation",  // File system operations
  type: "slack_message"    // Slack notifications
}

// 🧠 Logic & Control
{
  type: "condition",       // If/else logic
  type: "switch",          // Multi-branch logic
  type: "loop",           // Iteration control  
  type: "merge",          // Data merging
  type: "delay"           // Wait/pause execution
}

// 🤖 AI & ML
{
  type: "openai_completion",     // OpenAI text generation
  type: "text_analysis",        // Text processing
  type: "image_processing",     // Image manipulation
  type: "data_transform"        // AI-powered data transformation
}

// 📊 Data Processing
{
  type: "json_parse",      // JSON data parsing
  type: "xml_parse",       // XML data parsing
  type: "csv_parse",       // CSV data parsing
  type: "data_filter"      // Data filtering
}`;

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-[#FF6900]" />,
      title: "Lightning Fast",
      description: "Optimized JSON parsing and validation with minimal overhead"
    },
    {
      icon: <Settings className="w-6 h-6 text-[#FF6900]" />,
      title: "Enterprise Ready",
      description: "Full TypeScript support, error handling, and production-grade validation"
    },
    {
      icon: <Database className="w-6 h-6 text-[#FF6900]" />,
      title: "Extensible",
      description: "Easy to add custom node types and extend functionality"
    }
  ];

  return (
    <DocsLayout>
      <div>
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-white/60 mb-8">
          <Link href="/docs" className="hover:text-[#FF6900] transition-colors">
            Documentation
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">JSON Node Engine</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              JSON Node Engine System
            </h1>
            <p className="text-xl text-white/70 max-w-3xl mb-6">
              NexAgent&apos;s enterprise-grade JSON workflow system enables developers to create, validate, and execute complex automation workflows using a declarative JSON format. Built for scalability, type safety, and AI-driven workflow generation.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                className="bg-[#FF6900] hover:bg-[#FF8555] text-white"
                onClick={() => copyToClipboard(quickStartExample, 'quick-start')}
              >
                {copiedSection === 'quick-start' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Example
                  </>
                )}
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Download className="w-4 h-4 mr-2" />
                Download Examples
              </Button>
            </div>
          </motion.div>
        </header>

        {/* Overview */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Workflow className="w-8 h-8 text-[#FF6900]" />
            System Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="glass-card p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  {feature.icon}
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-white/70 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Key Components</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#FF6900]" />
                  Core Engine
                </h4>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>• WorkflowEngine - Main orchestration system</li>
                  <li>• NodeTemplateRegistry - Template management</li>
                  <li>• JSON validation with Zod schemas</li>
                  <li>• TypeScript type safety throughout</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#FF6900]" />
                  Node System
                </h4>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>• 15+ built-in node types</li>
                  <li>• Custom node type support</li>
                  <li>• Dynamic configuration validation</li>
                  <li>• Environment variable templating</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Play className="w-8 h-8 text-[#FF6900]" />
            Quick Start Example
          </h2>
          
          <div className="glass-card p-6 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Basic Workflow Creation</h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => copyToClipboard(quickStartExample, 'example')}
                className="text-white/70 hover:text-white"
              >
                {copiedSection === 'example' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="bg-black/50 p-4 rounded border border-white/10 overflow-x-auto">
              <pre className="text-sm text-white/90">
                <code>{quickStartExample}</code>
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-lg">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#FF6900]" />
                What This Creates
              </h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>• A webhook trigger listening on /webhook/signup</li>
                <li>• Email node that sends welcome messages</li>
                <li>• Automatic data flow between connected nodes</li>
                <li>• Built-in error handling and validation</li>
              </ul>
            </div>
            
            <div className="glass-card p-6 rounded-lg">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FF6900]" />
                Production Ready
              </h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>• <strong className="text-white">Scalable:</strong> Handle thousands of executions</li>
                <li>• <strong className="text-white">Reliable:</strong> Automatic retries and error recovery</li>
                <li>• <strong className="text-white">Observable:</strong> Built-in logging and monitoring</li>
                <li>• <strong className="text-white">Secure:</strong> Input validation and sanitization</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Node Types */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-[#FF6900]" />
            Available Node Types
          </h2>
          
          <div className="glass-card p-6 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">15+ Built-in Node Types</h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => copyToClipboard(nodeTypesExample, 'nodes')}
                className="text-white/70 hover:text-white"
              >
                {copiedSection === 'nodes' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="bg-black/50 p-4 rounded border border-white/10 overflow-x-auto">
              <pre className="text-sm text-white/90">
                <code>{nodeTypesExample}</code>
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">🎯 Triggers</h4>
              <ul className="space-y-1 text-white/70 text-xs">
                <li>• Webhooks</li>
                <li>• Scheduled tasks</li>
                <li>• File watchers</li>
                <li>• Database changes</li>
              </ul>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">⚡ Actions</h4>
              <ul className="space-y-1 text-white/70 text-xs">
                <li>• HTTP requests</li>
                <li>• Email sending</li>
                <li>• Database queries</li>
                <li>• File operations</li>
              </ul>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">🧠 Logic</h4>
              <ul className="space-y-1 text-white/70 text-xs">
                <li>• Conditionals</li>
                <li>• Loops</li>
                <li>• Delays</li>
                <li>• Parallel execution</li>
              </ul>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">🤖 AI/ML</h4>
              <ul className="space-y-1 text-white/70 text-xs">
                <li>• Text generation</li>
                <li>• Image creation</li>
                <li>• Classification</li>
                <li>• Sentiment analysis</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="glass-card p-8 rounded-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Build Workflows?</h2>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto">
              Start creating powerful automation workflows with our enterprise-grade JSON system. From simple triggers to complex AI-driven processes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/docs/getting-started">
                <Button className="bg-[#FF6900] hover:bg-[#FF8555] text-white">
                  Get Started
                </Button>
              </Link>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                View Examples
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                API Reference
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
};

export default JsonNodeEnginePage;

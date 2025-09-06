"use client";

import { motion } from "framer-motion";
import { Copy, CheckCircle, Code, Zap, Settings, Terminal, Download, ExternalLink, ArrowRight, Play, Github, BookOpen, Workflow, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import DocsLayout from "@/components/docs/DocsLayout";
import { useState } from "react";

const GettingStartedPage = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const installCode = `npm install nexagent
# or
yarn add nexagent
# or
pnpm add nexagent`;

  const quickStartCode = `import { WorkflowEngine } from 'nexagent';
import { ImportWorkflowFromJSON } from 'nexagent/json-utils';

// Initialize the engine
const engine = new WorkflowEngine();

// Create your first workflow
const workflow = await engine.createWorkflowFromJSON({
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
        to: ["{{user.email}}"],
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
});

console.log("Workflow created:", workflow.name);`;

  const envCode = `# .env.local
NEXAGENT_API_KEY=your_api_key_here
NEXAGENT_ENVIRONMENT=development

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/nexagent

# SMTP (for email nodes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password`;

  return (
    <DocsLayout>
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-white/60 mb-8">
        <Link href="/docs" className="hover:text-[#FF6900] transition-colors">
          Documentation
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">Getting Started</span>
      </nav>

      {/* Header */}
      <header className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Getting Started with NexAgent
          </h1>
          <p className="text-xl text-white/70 max-w-3xl">
            NexAgent is an enterprise-grade intelligent automation platform that enables developers to build, deploy, and scale AI-powered workflows with ease. This guide will get you up and running in minutes.
          </p>
        </motion.div>
      </header>

      {/* Quick Start */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Zap className="w-8 h-8 text-[#FF6900]" />
          Quick Start
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="glass-card p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Installation</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(installCode, 'install')}
                  className="text-white/70 hover:text-white"
                >
                  {copiedSection === 'install' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="bg-black/50 p-4 rounded border border-white/10">
                <pre className="text-sm text-white/90">
                  <code>{installCode}</code>
                </pre>
              </div>
            </div>
          </div>
          
          <div>
            <div className="glass-card p-6 rounded-lg h-full">
              <h3 className="text-lg font-semibold text-white mb-4">Requirements</h3>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Node.js 18+</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>TypeScript 5.0+</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Modern Browser</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#FF6900]" />
          Configuration
        </h2>
        
        <div className="glass-card p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Environment Variables</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(envCode, 'env')}
              className="text-white/70 hover:text-white"
            >
              {copiedSection === 'env' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="bg-black/50 p-4 rounded border border-white/10">
            <pre className="text-sm text-white/90">
              <code>{envCode}</code>
            </pre>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-white">i</span>
            </div>
            <div>
              <h4 className="font-semibold text-blue-200 mb-1">API Key Required</h4>
              <p className="text-blue-200/80 text-sm">
                You&apos;ll need a NexAgent API key to use most features. Sign up at our dashboard to get your free API key with 1000 monthly executions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* First Workflow */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Workflow className="w-8 h-8 text-[#FF6900]" />
          Your First Workflow
        </h2>
        
        <div className="glass-card p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Create a Welcome Email Workflow</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(quickStartCode, 'workflow')}
              className="text-white/70 hover:text-white"
            >
              {copiedSection === 'workflow' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="bg-black/50 p-4 rounded border border-white/10 overflow-x-auto">
            <pre className="text-sm text-white/90">
              <code>{quickStartCode}</code>
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#FF6900]" />
              What This Does
            </h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Creates a webhook endpoint that listens for user signups</li>
              <li>• Automatically sends a welcome email to new users</li>
              <li>• Uses our JSON-based workflow system for easy configuration</li>
              <li>• Includes error handling and validation out of the box</li>
            </ul>
          </div>
          
          <div className="glass-card p-6 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Code className="w-5 h-5 text-[#FF6900]" />
              Key Features
            </h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• <strong className="text-white">Type Safety:</strong> Full TypeScript support</li>
              <li>• <strong className="text-white">Validation:</strong> Automatic JSON schema validation</li>
              <li>• <strong className="text-white">Scalable:</strong> Enterprise-ready architecture</li>
              <li>• <strong className="text-white">Extensible:</strong> Add custom nodes easily</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-6">Next Steps</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/docs/json-node-engine" className="group">
            <div className="glass-card p-6 rounded-lg h-full hover:shadow-lg hover:shadow-[#FF6900]/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <Workflow className="w-6 h-6 text-[#FF6900]" />
                <h3 className="font-semibold text-white group-hover:text-[#FF6900] transition-colors">
                  JSON Node Engine
                </h3>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Dive deep into our JSON-based workflow system with 15+ node types, validation, and AI integration.
              </p>
              <div className="flex items-center text-[#FF6900] text-sm">
                <span>Learn more</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>

          <Link href="/docs/api" className="group">
            <div className="glass-card p-6 rounded-lg h-full hover:shadow-lg hover:shadow-[#FF6900]/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <Code className="w-6 h-6 text-[#FF6900]" />
                <h3 className="font-semibold text-white group-hover:text-[#FF6900] transition-colors">
                  API Reference
                </h3>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Complete API documentation with TypeScript definitions, examples, and interactive playground.
              </p>
              <div className="flex items-center text-[#FF6900] text-sm">
                <span>View API docs</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>

          <Link href="/docs/examples" className="group">
            <div className="glass-card p-6 rounded-lg h-full hover:shadow-lg hover:shadow-[#FF6900]/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-6 h-6 text-[#FF6900]" />
                <h3 className="font-semibold text-white group-hover:text-[#FF6900] transition-colors">
                  Examples
                </h3>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Real-world examples including customer onboarding, data processing, and AI integration patterns.
              </p>
              <div className="flex items-center text-[#FF6900] text-sm">
                <span>Browse examples</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Support */}
      <section className="glass-card p-8 rounded-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
          <p className="text-white/70 mb-6 max-w-2xl mx-auto">
            Join our growing community of developers building the future of intelligent automation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button className="bg-[#FF6900] hover:bg-[#FF8555] text-white">
              <Github className="w-4 h-4 mr-2" />
              Star on GitHub
            </Button>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Join Discord Community
            </Button>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              View Examples
            </Button>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
};

export default GettingStartedPage;

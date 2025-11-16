"use client";

import { motion } from "framer-motion";
import { Copy, CheckCircle, BookOpen, Rocket, Zap, Settings, Users, Workflow, ShoppingCart, FileText, Terminal, ChevronRight, Play, Download, ArrowRight, Code, Database, Globe, Lock, Bell, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import DocsLayout from "@/components/docs/DocsLayout";
import { useState } from "react";

const UserGuidePage = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const quickStartExample = `// Step 1: Sign up and login
Visit https://nexagent.com/sign-up
Create your account with email/password or Google

// Step 2: Create your first workflow
1. Navigate to Dashboard → Workflows
2. Click "Create Workflow" button
3. Drag and drop nodes from the sidebar
4. Connect nodes to create your automation flow
5. Configure each node with your settings
6. Click "Save" to store your workflow

// Step 3: Test your workflow
1. Click "Test" button in the workflow editor
2. Provide sample input data
3. Watch the execution in real-time
4. Check output and logs

// Step 4: Deploy to production
1. Click "Activate" to enable your workflow
2. Set up triggers (webhook, schedule, etc.)
3. Monitor executions in the Dashboard`;

  const features = [
    {
      icon: <Workflow className="w-6 h-6 text-[#FF6900]" />,
      title: "Visual Workflow Builder",
      description: "Drag-and-drop interface to create complex automations without code"
    },
    {
      icon: <ShoppingCart className="w-6 h-6 text-[#FF6900]" />,
      title: "Marketplace Integration",
      description: "Access pre-built workflows, templates, and AI models from the marketplace"
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-[#FF6900]" />,
      title: "Real-time Analytics",
      description: "Monitor performance, track executions, and get actionable insights"
    }
  ];

  const sections = [
    {
      id: "getting-started",
      icon: <Rocket className="w-8 h-8 text-[#FF6900]" />,
      title: "Getting Started",
      description: "Learn the basics and create your first workflow",
      items: [
        {
          title: "1. Account Setup",
          content: [
            "Sign up with email or Google account",
            "Verify your email address",
            "Complete the onboarding wizard",
            "Choose your subscription plan (Free, Pro, or Enterprise)"
          ]
        },
        {
          title: "2. Dashboard Overview",
          content: [
            "View your workflow statistics and metrics",
            "Access recent workflows and executions",
            "Monitor system health and alerts",
            "Quick actions for common tasks"
          ]
        },
        {
          title: "3. Create Your First Workflow",
          content: [
            "Click 'Create Workflow' from the dashboard",
            "Choose a template or start from scratch",
            "Add nodes by dragging from the sidebar",
            "Connect nodes to define the flow",
            "Configure node settings and parameters"
          ]
        }
      ]
    },
    {
      id: "workflows",
      icon: <Workflow className="w-8 h-8 text-[#FF6900]" />,
      title: "Working with Workflows",
      description: "Master the workflow editor and automation features",
      items: [
        {
          title: "Creating Workflows",
          content: [
            "Use the visual editor to drag and drop nodes",
            "Configure triggers (webhooks, schedules, events)",
            "Add action nodes (HTTP, email, database, etc.)",
            "Use logic nodes (conditions, loops, switches)",
            "Connect nodes to define execution flow"
          ]
        },
        {
          title: "Node Types",
          content: [
            "🎯 Triggers: Webhook, Schedule, File Watch, Database",
            "⚡ Actions: HTTP Request, Email, Database Query, API Calls",
            "🧠 Logic: If/Else, Switch, Loop, Delay, Merge",
            "🤖 AI: OpenAI, Text Analysis, Image Processing",
            "📊 Data: JSON Parse, Transform, Filter, Aggregate"
          ]
        },
        {
          title: "Testing & Debugging",
          content: [
            "Test workflows with sample data before deployment",
            "View real-time execution logs and outputs",
            "Debug failed nodes with detailed error messages",
            "Use breakpoints to pause execution",
            "Inspect variable values at each step"
          ]
        }
      ]
    },
    {
      id: "marketplace",
      icon: <ShoppingCart className="w-8 h-8 text-[#FF6900]" />,
      title: "Marketplace",
      description: "Browse and use pre-built workflows and templates",
      items: [
        {
          title: "Exploring the Marketplace",
          content: [
            "Browse featured workflows and templates",
            "Filter by category, rating, and popularity",
            "Search for specific automation solutions",
            "Preview workflow details before purchase",
            "Read reviews and ratings from other users"
          ]
        },
        {
          title: "Using Templates",
          content: [
            "Clone templates to your workspace",
            "Customize templates to fit your needs",
            "Save customized templates for reuse",
            "Share your templates with the community",
            "Monetize your popular templates"
          ]
        },
        {
          title: "Selling on Marketplace",
          content: [
            "Submit your workflows for approval",
            "Set pricing and licensing terms",
            "Track sales and revenue analytics",
            "Respond to customer feedback",
            "Update and maintain your listings"
          ]
        }
      ]
    },
    {
      id: "integrations",
      icon: <Globe className="w-8 h-8 text-[#FF6900]" />,
      title: "Integrations",
      description: "Connect external services and APIs",
      items: [
        {
          title: "Available Integrations",
          content: [
            "OpenAI, Anthropic, Cohere (AI/ML models)",
            "Gmail, SendGrid, Mailchimp (Email)",
            "Slack, Discord, Teams (Communication)",
            "Stripe, PayPal (Payments)",
            "Google Sheets, Airtable (Databases)",
            "GitHub, GitLab (Version Control)"
          ]
        },
        {
          title: "Setting Up Connections",
          content: [
            "Navigate to Settings → Integrations",
            "Click 'Connect' on desired service",
            "Authenticate with OAuth or API key",
            "Test the connection",
            "Use in your workflows"
          ]
        },
        {
          title: "Managing Credentials",
          content: [
            "Securely store API keys and tokens",
            "Update expired credentials",
            "Rotate keys for security",
            "Share credentials with team (Enterprise)",
            "Monitor credential usage"
          ]
        }
      ]
    },
    {
      id: "billing",
      icon: <FileText className="w-8 h-8 text-[#FF6900]" />,
      title: "Billing & Subscriptions",
      description: "Manage your account and payment information",
      items: [
        {
          title: "Subscription Plans",
          content: [
            "Free: 10 workflows, 1000 executions/month",
            "Pro ($29/mo): Unlimited workflows, 10K executions",
            "Enterprise: Custom limits, dedicated support",
            "Annual billing: Save 20%",
            "Cancel anytime, no long-term contracts"
          ]
        },
        {
          title: "Usage & Limits",
          content: [
            "Monitor usage in Dashboard",
            "View detailed usage breakdown",
            "Set up usage alerts",
            "Upgrade plan when needed",
            "Track API call consumption"
          ]
        },
        {
          title: "Payment Methods",
          content: [
            "Credit/Debit cards (Visa, Mastercard, Amex)",
            "PayPal and bank transfers",
            "Invoicing for Enterprise plans",
            "Automatic billing and receipts",
            "Manage payment methods in Settings"
          ]
        }
      ]
    },
    {
      id: "security",
      icon: <Lock className="w-8 h-8 text-[#FF6900]" />,
      title: "Security & Privacy",
      description: "Keep your data safe and secure",
      items: [
        {
          title: "Data Security",
          content: [
            "End-to-end encryption for sensitive data",
            "SOC 2 Type II certified infrastructure",
            "Regular security audits and penetration testing",
            "GDPR and CCPA compliant",
            "Data residency options for Enterprise"
          ]
        },
        {
          title: "Authentication",
          content: [
            "Email/password with strong requirements",
            "Google OAuth single sign-on",
            "Two-factor authentication (2FA)",
            "Session management and timeouts",
            "IP whitelisting for Enterprise"
          ]
        },
        {
          title: "Access Control",
          content: [
            "Role-based access control (RBAC)",
            "Team member permissions",
            "Workspace isolation",
            "Audit logs for all actions",
            "API key scope restrictions"
          ]
        }
      ]
    },
    {
      id: "analytics",
      icon: <BarChart3 className="w-8 h-8 text-[#FF6900]" />,
      title: "Analytics & Monitoring",
      description: "Track performance and optimize workflows",
      items: [
        {
          title: "Dashboard Metrics",
          content: [
            "Total workflows and execution count",
            "Success rate and error rate",
            "Average execution time",
            "Real-time active executions",
            "System health indicators"
          ]
        },
        {
          title: "Workflow Analytics",
          content: [
            "Execution history and logs",
            "Performance trends over time",
            "Bottleneck identification",
            "Cost analysis per workflow",
            "Custom metric tracking"
          ]
        },
        {
          title: "Alerts & Notifications",
          content: [
            "Set up alerts for failures",
            "Email/Slack notifications",
            "Custom alert thresholds",
            "Escalation policies",
            "Alert acknowledgment tracking"
          ]
        }
      ]
    },
    {
      id: "advanced",
      icon: <Terminal className="w-8 h-8 text-[#FF6900]" />,
      title: "Advanced Features",
      description: "Power user features and API access",
      items: [
        {
          title: "API Access",
          content: [
            "RESTful API for programmatic access",
            "Create and manage workflows via API",
            "Trigger executions remotely",
            "Query execution history",
            "Webhook endpoints for integration"
          ]
        },
        {
          title: "Version Control",
          content: [
            "Automatic workflow versioning",
            "Rollback to previous versions",
            "Compare workflow changes",
            "Export/import workflows as JSON",
            "GitHub integration for CI/CD"
          ]
        },
        {
          title: "Team Collaboration",
          content: [
            "Invite team members (Pro/Enterprise)",
            "Share workflows and templates",
            "Collaborative editing",
            "Comments and annotations",
            "Activity feed and notifications"
          ]
        }
      ]
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
          <span className="text-white">User Guide</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              NexAgent User Guide
            </h1>
            <p className="text-xl text-white/70 max-w-3xl mb-6">
              Complete guide to using NexAgent&apos;s powerful workflow automation platform. From creating your first workflow to advanced features and integrations.
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
                    Copy Quick Start
                  </>
                )}
              </Button>
              <Link href="/dashboard">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Play className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </header>

        {/* Overview */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#FF6900]" />
            Platform Overview
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
            <h3 className="text-lg font-semibold text-white mb-4">Quick Start Guide</h3>
            <div className="bg-black/50 p-4 rounded border border-white/10 overflow-x-auto">
              <pre className="text-sm text-white/90">
                <code>{quickStartExample}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Main Sections */}
        {sections.map((section, sectionIndex) => (
          <section key={section.id} className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              {section.icon}
              {section.title}
            </h2>
            <p className="text-white/70 mb-8">{section.description}</p>
            
            <div className="space-y-6">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="glass-card p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">{item.title}</h3>
                  <ul className="space-y-2">
                    {item.content.map((point, pointIndex) => (
                      <li key={pointIndex} className="text-white/70 flex items-start gap-2">
                        <span className="text-[#FF6900] mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="glass-card p-8 rounded-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Need More Help?</h2>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto">
              Can&apos;t find what you&apos;re looking for? Check out our additional resources or contact our support team.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/docs/getting-started">
                <Button className="bg-[#FF6900] hover:bg-[#FF8555] text-white">
                  Getting Started
                </Button>
              </Link>
              <Link href="/docs/json-node-engine">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  API Reference
                </Button>
              </Link>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Bell className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
};

export default UserGuidePage;

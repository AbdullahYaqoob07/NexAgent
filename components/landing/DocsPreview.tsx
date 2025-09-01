"use client";

import { motion } from "framer-motion";
import { FileText, Code, BookOpen, Terminal, Layers, GitBranch, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const documents = [
  {
    id: 1,
    type: "Quick Start",
    icon: <BookOpen className="w-5 h-5" />,
    title: "Getting Started Guide",
    description: "Set up and deploy your first AI solution in minutes with our comprehensive quick-start guide.",
    readTime: "5 min read"
  },
  {
    id: 2,
    type: "API Reference",
    icon: <Code className="w-5 h-5" />,
    title: "API Documentation",
    description: "Complete API reference with endpoints, authentication, and integration examples.",
    readTime: "12 min read"
  },
  {
    id: 3,
    type: "Workflow",
    icon: <GitBranch className="w-5 h-5" />,
    title: "Automation Workflows",
    description: "Build powerful automation workflows with our visual workflow designer and templates.",
    readTime: "8 min read"
  },
  {
    id: 4,
    type: "Integration",
    icon: <Layers className="w-5 h-5" />,
    title: "Enterprise Integration",
    description: "Connect NexAgent with your existing systems using our enterprise integration patterns.",
    readTime: "10 min read"
  },
  {
    id: 5,
    type: "CLI Tools",
    icon: <Terminal className="w-5 h-5" />,
    title: "Command Line Interface",
    description: "Manage deployments and monitor performance using our powerful CLI tools and scripts.",
    readTime: "6 min read"
  },
  {
    id: 6,
    type: "Tutorial",
    icon: <FileText className="w-5 h-5" />,
    title: "Building Your First Agent",
    description: "Step-by-step tutorial covering agent creation, training, and deployment best practices.",
    readTime: "15 min read"
  }
];

const DocumentCard = ({ doc, index }: { doc: typeof documents[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="surface-elevated p-6 rounded-lg h-full hover-lift hover:border-orange/20 transition-standard">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange/20 transition-standard">
            <div className="text-orange">
              {doc.icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-orange mb-1">{doc.type}</div>
            <h3 className="text-white font-semibold group-hover:text-orange transition-standard leading-tight">
              {doc.title}
            </h3>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-orange transition-standard flex-shrink-0" />
        </div>
        
        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {doc.description}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{doc.readTime}</span>
          <div className="w-2 h-2 bg-orange/60 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
};

const DocsPreview = () => {
  return (
    <section id="docs" className="section-padding">
      <div className="content-max container-padding">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-white">
            Developer
            <span className="block text-orange">Documentation</span>
          </h2>
          
          <p className="lead max-w-2xl mx-auto">
            Everything you need to integrate, deploy, and scale AI solutions in your organization.
          </p>
        </motion.div>
        
        {/* Document grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {documents.map((doc, index) => (
            <DocumentCard key={doc.id} doc={doc} index={index} />
          ))}
        </div>
        
        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="surface-elevated p-8 rounded-lg text-center max-w-lg mx-auto">
            <h3 className="text-xl font-semibold text-white mb-3">
              Need more resources?
            </h3>
            <p className="text-muted-foreground mb-6">
              Access our complete documentation with examples, SDKs, and community support.
            </p>
            <Button className="bg-orange hover:bg-orange-dark text-white font-medium px-8 py-3 rounded-md transition-standard">
              View All Documentation
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DocsPreview;

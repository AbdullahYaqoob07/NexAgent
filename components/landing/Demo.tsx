"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  Zap, 
  Workflow, 
  Code, 
  ArrowRight, 
  CheckCircle,
  Clock,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function Demo() {
  const router = useRouter();
  const { user } = useAuth();

  const handleTryDemo = () => {
    if (user) {
      router.push('/demo/workflow-engine');
    } else {
      router.push('/sign-in');
    }
  };

  const features = [
    {
      icon: Workflow,
      title: "Visual Workflow Builder",
      description: "Drag-and-drop interface for creating complex workflows"
    },
    {
      icon: Code,
      title: "JSON-Based Configuration",
      description: "Define workflows using simple, readable JSON schemas"
    },
    {
      icon: Activity,
      title: "Real-time Execution",
      description: "Watch your workflows run with live monitoring and logs"
    },
    {
      icon: Clock,
      title: "Parallel Processing",
      description: "Execute multiple tasks simultaneously for maximum efficiency"
    }
  ];

  return (
    <section id="demo" className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            See NexAgent in <span className="text-[#FF6900]">Action</span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Experience the power of our workflow engine with interactive demos. 
            Build, test, and execute workflows in real-time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Demo Preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-[#FF6900]/10 to-[#FF8555]/10 rounded-2xl p-8 border border-[#FF6900]/20">
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Workflow Engine Demo</h3>
                    <p className="text-white/70">Interactive workflow execution</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm">Sequential Workflow Running</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm">Parallel Processing Active</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-2 h-2 bg-[#FF6900] rounded-full animate-pulse"></div>
                    <span className="text-white text-sm">Conditional Branching</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Execution Time: 1.2s</span>
                    <span>Success Rate: 99.8%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF6900] rounded-full flex items-center justify-center"
            >
              <Play className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>

          {/* Features & CTA */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Try Our Workflow Engine
              </h3>
              <p className="text-white/70 text-lg mb-6">
                Get hands-on experience with our powerful workflow automation engine. 
                Create, test, and execute workflows with real-time feedback.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                      <p className="text-sm text-white/70">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleTryDemo}
                size="lg"
                className="w-full bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-8 py-4 rounded-xl group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Try Interactive Demo
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="flex items-center justify-center gap-6 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>No setup required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Real-time execution</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

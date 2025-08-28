"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  pulsePhase: number;
  connections: number[];
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse tracking for interactive effects
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Initialize nodes for workflowy network
    const initNodes = () => {
      const nodes: Node[] = [];
      const numNodes = Math.floor((canvas.width * canvas.height) / 25000);

      // Create nodes in a more structured pattern
      for (let i = 0; i < numNodes; i++) {
        const node: Node = {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 3 + 2,
          opacity: Math.random() * 0.3 + 0.1,
          pulsePhase: Math.random() * Math.PI * 2,
          connections: [],
        };
        nodes.push(node);
      }

      // Create connections between nearby nodes
      nodes.forEach((node, index) => {
        const nearbyNodes: number[] = [];
        nodes.forEach((otherNode, otherIndex) => {
          if (index !== otherIndex) {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 200) {
              nearbyNodes.push(otherIndex);
            }
          }
        });
        // Limit connections per node
        node.connections = nearbyNodes.slice(0, 3);
      });

      nodesRef.current = nodes;
    };

    initNodes();

    // Animation loop
    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines first (behind nodes)
      nodesRef.current.forEach((node, index) => {
        node.connections.forEach(connectionIndex => {
          const connectedNode = nodesRef.current[connectionIndex];
          if (connectedNode) {
            const dx = connectedNode.x - node.x;
            const dy = connectedNode.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Draw flowing connection lines
            const gradient = ctx.createLinearGradient(
              node.x, node.y,
              connectedNode.x, connectedNode.y
            );
            
            const flowOffset = (timestamp / 50) % 100;
            const lineOpacity = (1 - distance / 200) * 0.15;
            
            gradient.addColorStop(0, `rgba(100, 200, 255, 0)`);
            gradient.addColorStop(0.5, `rgba(100, 200, 255, ${lineOpacity})`);
            gradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
            
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(connectedNode.x, connectedNode.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw data flow particles along connections
            const flowProgress = ((timestamp / 2000) % 1);
            const flowX = node.x + dx * flowProgress;
            const flowY = node.y + dy * flowProgress;
            
            ctx.beginPath();
            ctx.arc(flowX, flowY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 200, 255, ${lineOpacity * 2})`;
            ctx.fill();
          }
        });
      });

      // Update and draw nodes
      nodesRef.current.forEach((node, index) => {
        // Update position with gentle floating motion
        node.x += node.vx;
        node.y += node.vy;
        
        // Add subtle floating effect
        node.pulsePhase += 0.02;
        const floatOffset = Math.sin(node.pulsePhase) * 0.5;
        
        // Boundary behavior with soft bounce
        if (node.x < 50 || node.x > canvas.width - 50) node.vx *= -0.9;
        if (node.y < 50 || node.y > canvas.height - 50) node.vy *= -0.9;
        
        // Keep nodes on screen
        node.x = Math.max(20, Math.min(canvas.width - 20, node.x));
        node.y = Math.max(20, Math.min(canvas.height - 20, node.y));
        
        // Interactive response to mouse
        const mouseDistance = Math.sqrt(
          Math.pow(node.x - mouseRef.current.x, 2) +
          Math.pow(node.y - mouseRef.current.y, 2)
        );
        
        const interactionRadius = 150;
        const nodeGlow = mouseDistance < interactionRadius 
          ? (1 - mouseDistance / interactionRadius) * 0.3 
          : 0;
        
        // Draw node with glow effect
        const pulseSize = node.size + Math.sin(node.pulsePhase) * 0.5;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y + floatOffset, pulseSize + 8, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y + floatOffset, 0,
          node.x, node.y + floatOffset, pulseSize + 8
        );
        glowGradient.addColorStop(0, `rgba(100, 200, 255, ${node.opacity + nodeGlow})`);
        glowGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Core node
        ctx.beginPath();
        ctx.arc(node.x, node.y + floatOffset, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 220, 255, ${node.opacity * 2 + nodeGlow})`;
        ctx.fill();
        
        // Inner bright core
        ctx.beginPath();
        ctx.arc(node.x, node.y + floatOffset, pulseSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 240, 255, ${node.opacity * 3 + nodeGlow})`;
        ctx.fill();
      });
      
      // Update node connections dynamically
      if (Math.random() < 0.001) {
        nodesRef.current.forEach((node, index) => {
          const nearbyNodes: number[] = [];
          nodesRef.current.forEach((otherNode, otherIndex) => {
            if (index !== otherIndex) {
              const dx = node.x - otherNode.x;
              const dy = node.y - otherNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 200) {
                nearbyNodes.push(otherIndex);
              }
            }
          });
          node.connections = nearbyNodes.slice(0, 3);
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Canvas for particle system */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      />
      
      {/* Subtle geometric overlays for year 3025 aesthetic */}
      <div className="absolute inset-0">
        {/* Holographic circuit patterns */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-cyan-500/10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute top-3/4 right-1/4 w-96 h-96 rounded-full border border-blue-400/5"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Subtle hexagonal grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="hexgrid"
                width="80"
                height="140"
                patternUnits="userSpaceOnUse"
              >
                <polygon
                  points="40,10 70,30 70,70 40,90 10,70 10,30"
                  fill="none"
                  stroke="#64b5f6"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexgrid)" />
          </svg>
        </div>

        {/* Subtle data flow indicators */}
        <motion.div
          className="absolute top-1/3 right-1/3 w-2 h-2 bg-cyan-400/20 rounded-full"
          animate={{
            y: [-10, 10, -10],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute bottom-1/3 left-1/3 w-3 h-3 border border-blue-400/20 rounded-full"
          animate={{
            y: [10, -10, 10],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Subtle gradient overlays */}
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-cyan-500/5 to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-t from-blue-500/5 to-transparent" />
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { DoubleForkLogo, TripleForkLogo, QuadraForkLogo, CustomForkLogo } from '@/components/icons/brands';

export default function ForkIconsDemo() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          🚀 Beautiful Fork Icons for NexAgent
        </h1>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Double Fork */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <DoubleForkLogo size={80} />
            </div>
            <h3 className="text-white font-semibold mb-2">Double Fork</h3>
            <p className="text-zinc-400 text-sm">Splits into 2 branches</p>
            <div className="mt-4 bg-zinc-900 rounded px-3 py-1 text-xs text-emerald-400">
              #10B981 • Green
            </div>
          </div>
          
          {/* Triple Fork */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TripleForkLogo size={80} />
            </div>
            <h3 className="text-white font-semibold mb-2">Triple Fork</h3>
            <p className="text-zinc-400 text-sm">Splits into 3 branches</p>
            <div className="mt-4 bg-zinc-900 rounded px-3 py-1 text-xs text-blue-400">
              #0EA5E9 • Blue
            </div>
          </div>
          
          {/* Quadra Fork */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <QuadraForkLogo size={80} />
            </div>
            <h3 className="text-white font-semibold mb-2">Quadra Fork</h3>
            <p className="text-zinc-400 text-sm">Splits into 4 branches</p>
            <div className="mt-4 bg-zinc-900 rounded px-3 py-1 text-xs text-purple-400">
              #8B5CF6 • Purple
            </div>
          </div>
          
          {/* Custom Fork */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CustomForkLogo size={80} outputCount={5} />
            </div>
            <h3 className="text-white font-semibold mb-2">Custom Fork</h3>
            <p className="text-zinc-400 text-sm">Configurable branches</p>
            <div className="mt-4 bg-zinc-900 rounded px-3 py-1 text-xs text-orange-400">
              #F59E0B • Orange
            </div>
          </div>
        </div>
        
        {/* Custom Fork Variations */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Custom Fork Variations
          </h2>
          
          <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
            {[2, 3, 4, 5, 6, 8].map((count) => (
              <div key={count} className="text-center">
                <div className="flex justify-center mb-2">
                  <CustomForkLogo size={64} outputCount={count} />
                </div>
                <div className="text-white text-sm">{count} outputs</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Visual Features */}
        <div className="mt-16 bg-zinc-900 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">✨ Visual Features</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">🎨 Design Elements</h3>
              <ul className="space-y-2 text-zinc-300 text-sm">
                <li>• Clean white fork lines on colored backgrounds</li>
                <li>• Central junction point showing the split</li>
                <li>• Output dots indicating connection points</li>
                <li>• Distinct colors for each fork type</li>
                <li>• Rounded corners matching the square node design</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">⚡ Special Features</h3>
              <ul className="space-y-2 text-zinc-300 text-sm">
                <li>• Custom fork shows output count badge</li>
                <li>• Dynamic branch generation (up to 6 visual)</li>
                <li>• Consistent visual language across all types</li>
                <li>• Perfect integration with workflow canvas</li>
                <li>• Hover states and animations supported</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Integration Info */}
        <div className="mt-8 text-center">
          <p className="text-zinc-400 text-sm">
            These icons are now live in your NexAgent workflow editor! 🚀<br/>
            Try dragging fork nodes from the sidebar to see them in action.
          </p>
        </div>
      </div>
    </div>
  );
}
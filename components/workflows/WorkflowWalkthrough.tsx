"use client";

import { useEffect, useState, useRef } from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetRef: React.RefObject<HTMLElement>;
}

interface WorkflowWalkthroughProps {
  steps: WalkthroughStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export function WorkflowWalkthrough({ steps, onComplete, onSkip }: WorkflowWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const updateHighlightPosition = () => {
    const step = steps[currentStep];
    if (!step?.targetRef?.current) {
      // Try again in a moment if element is not ready
      setTimeout(() => {
        if (step?.targetRef?.current) {
          const element = step.targetRef.current;
          const rect = element.getBoundingClientRect();
          
          setHighlightPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      }, 50);
      return;
    }

    const element = step.targetRef.current;
    const rect = element.getBoundingClientRect();
    
    setHighlightPosition({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  };

  useEffect(() => {
    // Add a small delay to ensure DOM elements are fully rendered
    const timer = setTimeout(() => {
      updateHighlightPosition();
    }, 50);
    
    const handleResize = () => updateHighlightPosition();
    const handleScroll = () => updateHighlightPosition();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    // Update position periodically in case of layout changes
    const interval = setInterval(updateHighlightPosition, 100);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      clearInterval(interval);
    };
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  if (!currentStepData) return null;

  // Force re-render if highlight position is not set after a delay
  useEffect(() => {
    if (!highlightPosition && steps[currentStep]?.targetRef?.current) {
      const timer = setTimeout(updateHighlightPosition, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightPosition, currentStep, steps]);

  return (
    <>
      {/* Overlay with cutout - creates dark overlay with transparent hole for highlighted area */}
      {highlightPosition && (
        <>
          {/* Top overlay */}
          {highlightPosition.top > 0 && (
            <div
              className="fixed left-0 right-0 z-[9998] pointer-events-none"
              style={{
                top: 0,
                height: highlightPosition.top,
                background: 'rgba(0, 0, 0, 0.85)',
              }}
            />
          )}
          
          {/* Left overlay */}
          {highlightPosition.left > 0 && (
            <div
              className="fixed z-[9998] pointer-events-none"
              style={{
                top: highlightPosition.top,
                left: 0,
                width: highlightPosition.left,
                height: highlightPosition.height,
                background: 'rgba(0, 0, 0, 0.85)',
              }}
            />
          )}
          
          {/* Right overlay */}
          {highlightPosition.left + highlightPosition.width < window.innerWidth && (
            <div
              className="fixed z-[9998] pointer-events-none"
              style={{
                top: highlightPosition.top,
                left: highlightPosition.left + highlightPosition.width,
                right: 0,
                height: highlightPosition.height,
                background: 'rgba(0, 0, 0, 0.85)',
              }}
            />
          )}
          
          {/* Bottom overlay */}
          {highlightPosition.top + highlightPosition.height < window.innerHeight && (
            <div
              className="fixed left-0 right-0 z-[9998] pointer-events-none"
              style={{
                top: highlightPosition.top + highlightPosition.height,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
              }}
            />
          )}
        </>
      )}

      {/* Highlight border with glow - appears above overlay */}
      {highlightPosition && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            top: highlightPosition.top - 4,
            left: highlightPosition.left - 4,
            width: highlightPosition.width + 8,
            height: highlightPosition.height + 8,
            border: '3px solid #FF6900',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgba(255, 105, 0, 0.6), 0 0 40px rgba(255, 105, 0, 0.3)',
          }}
        />
      )}

      {/* Info Card - Always visible */}
      {(highlightPosition || steps[currentStep]?.targetRef?.current) && (
        <div
          className="fixed z-[10000] bg-zinc-900 border-2 border-[#FF6900] rounded-xl shadow-2xl p-6 w-full max-w-md pointer-events-auto"
          style={{
            top: highlightPosition ? 
              (highlightPosition.top + highlightPosition.height + 20 > window.innerHeight - 350
                ? Math.max(20, highlightPosition.top - 350) // Show above if not enough space below
                : Math.max(20, highlightPosition.top + highlightPosition.height + 20))
              : 100, // Fallback position if highlightPosition is null
            left: highlightPosition ? Math.max(20, Math.min(highlightPosition.left, window.innerWidth - 440)) : '50%',
            right: 'auto',
            transform: highlightPosition ? 'none' : 'translateX(-50%)', // Center horizontally if using fallback
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#FF6900] font-bold text-sm">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">
                {currentStepData.title}
              </h3>
            </div>
            <button
              onClick={onSkip}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-zinc-300 mb-6 leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="text-zinc-400 hover:text-white disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-zinc-400 hover:text-white"
              >
                Skip Tour
              </Button>
              <Button
                onClick={handleNext}
                className="bg-[#FF6900] hover:bg-[#E55D00] text-white"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 mt-4 justify-center">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-[#FF6900] w-8'
                    : index < currentStep
                    ? 'bg-[#FF6900]/50 w-4'
                    : 'bg-zinc-700 w-4'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}


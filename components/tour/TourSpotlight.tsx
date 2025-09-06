"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourStep } from '@/hooks/useTour';

interface TourSpotlightProps {
  isVisible: boolean;
  targetElement: HTMLElement | null;
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourSpotlight({
  isVisible,
  targetElement,
  step,
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete
}: TourSpotlightProps) {
  const [elementRect, setElementRect] = useState<ElementRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; placement: string }>({ x: 0, y: 0, placement: 'bottom' });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Update element position and tooltip placement
  useEffect(() => {
    if (!targetElement || !isVisible) {
      setElementRect(null);
      return;
    }

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const newRect = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      };
      
      setElementRect(newRect);

      // Intelligent tooltip positioning
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 20;
        const arrowSize = 12; // Account for arrow size
        
        // Calculate available space in each direction
        const spaceTop = rect.top;
        const spaceBottom = viewportHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = viewportWidth - rect.right;
        
        // Determine the best placement based on available space
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;
        
        let placement = step.placement || 'bottom';
        let x = 0;
        let y = 0;
        
        // Smart placement selection if auto or if preferred placement doesn't fit
        const canFitTop = spaceTop >= tooltipHeight + margin + arrowSize;
        const canFitBottom = spaceBottom >= tooltipHeight + margin + arrowSize;
        const canFitLeft = spaceLeft >= tooltipWidth + margin + arrowSize;
        const canFitRight = spaceRight >= tooltipWidth + margin + arrowSize;
        
        // If the preferred placement doesn't fit, choose the best alternative
        // But be more lenient for 'right' placement (sidebar case)
        if (placement === 'right') {
          // For right placement, be more lenient - allow it unless there's really no space
          if (spaceRight < tooltipWidth * 0.5) {
            if (canFitLeft) placement = 'left';
            else if (canFitBottom) placement = 'bottom';
            else if (canFitTop) placement = 'top';
          }
        } else if (placement === 'top' && !canFitTop) {
          if (canFitBottom) placement = 'bottom';
          else if (canFitRight) placement = 'right';
          else if (canFitLeft) placement = 'left';
          else placement = 'bottom'; // fallback
        } else if (placement === 'bottom' && !canFitBottom) {
          if (canFitTop) placement = 'top';
          else if (canFitRight) placement = 'right';
          else if (canFitLeft) placement = 'left';
          else placement = 'top'; // fallback
        } else if (placement === 'left' && !canFitLeft) {
          if (canFitRight) placement = 'right';
          else if (canFitBottom) placement = 'bottom';
          else if (canFitTop) placement = 'top';
          else placement = 'right'; // fallback
        }
        
        // Calculate position based on final placement
        switch (placement) {
          case 'top':
            x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            y = rect.top - tooltipHeight - margin;
            break;
            
          case 'bottom':
            x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            y = rect.bottom + margin;
            break;
            
          case 'left':
            x = rect.left - tooltipWidth - margin;
            y = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            break;
            
          case 'right':
            x = rect.right + margin;
            y = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            break;
        }
        
        // Fine-tune position to keep tooltip within viewport bounds
        if (placement === 'top' || placement === 'bottom') {
          // For top/bottom placement, adjust horizontal position
          const minX = margin;
          const maxX = viewportWidth - tooltipWidth - margin;
          x = Math.max(minX, Math.min(maxX, x));
          
          // Ensure vertical position is within bounds
          if (placement === 'top') {
            y = Math.max(margin, y);
          } else {
            y = Math.min(viewportHeight - tooltipHeight - margin, y);
          }
        } else {
          // For left/right placement, adjust vertical position
          const minY = margin;
          const maxY = viewportHeight - tooltipHeight - margin;
          y = Math.max(minY, Math.min(maxY, y));
          
          // Ensure horizontal position is within bounds
          if (placement === 'left') {
            x = Math.max(margin, x);
          } else {
            x = Math.min(viewportWidth - tooltipWidth - margin, x);
          }
        }
        
        setTooltipPosition({ x, y, placement });
      }
    };

    updatePosition();

    // Listen for resize and scroll events
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetElement, isVisible, step.placement]);

  if (!isVisible || !elementRect || !targetElement) {
    return null;
  }

  const spotlightPadding = 8;
  const spotlightRect = {
    top: elementRect.top - spotlightPadding,
    left: elementRect.left - spotlightPadding,
    width: elementRect.width + spotlightPadding * 2,
    height: elementRect.height + spotlightPadding * 2
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        {/* Dark Overlay with Spotlight Cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 ${step.allowClickThrough ? 'pointer-events-none' : 'pointer-events-auto'}`}
          style={{
            background: `radial-gradient(circle at ${spotlightRect.left + spotlightRect.width/2}px ${spotlightRect.top + spotlightRect.height/2}px, transparent ${Math.max(spotlightRect.width, spotlightRect.height)/2 + 20}px, rgba(0,0,0,0.8) ${Math.max(spotlightRect.width, spotlightRect.height)/2 + 40}px)`
          }}
          onClick={(e) => {
            if (step.allowClickOutside && e.target === e.currentTarget) {
              onSkip();
            }
          }}
        />

        {/* Spotlight Highlight Ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`absolute border-2 border-[#FF6900] rounded-lg shadow-lg ${step.allowClickThrough ? 'pointer-events-none' : ''}`}
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            boxShadow: '0 0 20px rgba(255, 105, 0, 0.4), inset 0 0 20px rgba(255, 105, 0, 0.1)'
          }}
        >
          {/* Pulsing animation */}
          <div className="absolute inset-0 border-2 border-[#FF6900] rounded-lg animate-pulse opacity-60" />
        </motion.div>
        

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="absolute pointer-events-auto"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div className="relative">
            {/* Tooltip Arrow */}
            <div
              className={`absolute w-3 h-3 bg-zinc-900 border border-zinc-700 rotate-45 ${
                tooltipPosition.placement === 'top' ? 'bottom-[-6px] left-1/2 transform -translate-x-1/2' :
                tooltipPosition.placement === 'bottom' ? 'top-[-6px] left-1/2 transform -translate-x-1/2' :
                tooltipPosition.placement === 'left' ? 'right-[-6px] top-1/2 transform -translate-y-1/2' :
                'left-[-6px] top-1/2 transform -translate-y-1/2'
              }`}
            />
            
            {/* Tooltip Content */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-sm p-6 backdrop-blur-sm bg-opacity-95">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF6900]" />
                  <h3 className="font-semibold text-white text-lg">{step.title}</h3>
                </div>
                <button
                  onClick={onSkip}
                  className="text-zinc-400 hover:text-white transition-colors p-1 -mt-1 -mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {step.content}
              </p>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#FF6900] to-[#E55D00] rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {currentStep + 1} of {totalSteps}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      onClick={onPrevious}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <ArrowLeft className="w-3 h-3 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={onSkip}
                    variant="ghost"
                    size="sm"
                    className="text-zinc-400 hover:text-white"
                  >
                    Skip Tour
                  </Button>
                </div>

                <Button
                  onClick={isLastStep ? onComplete : onNext}
                  className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-medium"
                  size="sm"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                  {!isLastStep && <ArrowRight className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

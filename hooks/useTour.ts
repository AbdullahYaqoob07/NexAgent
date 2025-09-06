"use client";

import { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector or element ID
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'none';
  allowClickOutside?: boolean;
  allowClickThrough?: boolean;
  showSkip?: boolean;
  isOptional?: boolean;
}

export interface TourOptions {
  onComplete?: () => void;
  onSkip?: () => void;
  onStepChange?: (step: number) => void;
  localStorage?: boolean;
  localStorageKey?: string;
}

export function useTour(steps: TourStep[], options: TourOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const {
    onComplete,
    onSkip,
    onStepChange,
    localStorage = true,
    localStorageKey = 'nexagent-tour'
  } = options;

  // Check if tour should be shown (first-time visitor)
  const checkShouldShowTour = useCallback(() => {
    if (!localStorage) return true;
    
    try {
      const tourData = window.localStorage.getItem(localStorageKey);
      if (!tourData) return true;
      
      const { completed } = JSON.parse(tourData);
      return !completed;
    } catch {
      return true;
    }
  }, [localStorage, localStorageKey]);

  // Start the tour
  const startTour = useCallback(() => {
    if (steps.length === 0) return;
    
    setCurrentStep(0);
    setIsActive(true);
    setIsVisible(true);
    onStepChange?.(0);
  }, [steps.length, onStepChange]);

  // Go to next step
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      onStepChange?.(nextStepIndex);
    } else {
      completeTour();
    }
  }, [currentStep, steps.length, onStepChange]);

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      onStepChange?.(prevStepIndex);
    }
  }, [currentStep, onStepChange]);

  // Skip tour
  const skipTour = useCallback(() => {
    if (localStorage) {
      try {
        window.localStorage.setItem(localStorageKey, JSON.stringify({ 
          completed: true, 
          skipped: true,
          timestamp: Date.now() 
        }));
      } catch {}
    }
    
    setIsActive(false);
    setIsVisible(false);
    onSkip?.();
  }, [localStorage, localStorageKey, onSkip]);

  // Complete tour
  const completeTour = useCallback(() => {
    if (localStorage) {
      try {
        window.localStorage.setItem(localStorageKey, JSON.stringify({ 
          completed: true, 
          skipped: false,
          timestamp: Date.now() 
        }));
      } catch {}
    }
    
    setIsActive(false);
    setIsVisible(false);
    onComplete?.();
  }, [localStorage, localStorageKey, onComplete]);

  // Reset tour (for development/testing)
  const resetTour = useCallback(() => {
    if (localStorage) {
      try {
        window.localStorage.removeItem(localStorageKey);
      } catch {}
    }
    setIsActive(false);
    setIsVisible(false);
    setCurrentStep(0);
  }, [localStorage, localStorageKey]);

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !isVisible || !steps[currentStep]) {
      setTargetElement(null);
      return;
    }

    const step = steps[currentStep];
    const element = document.querySelector(step.target) as HTMLElement;
    
    if (element) {
      setTargetElement(element);
      
      // Scroll element into view with smooth animation
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    } else {
      // Element not found, wait a bit and try again
      const timeout = setTimeout(() => {
        const retryElement = document.querySelector(step.target) as HTMLElement;
        if (retryElement) {
          setTargetElement(retryElement);
          retryElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          });
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [isActive, isVisible, currentStep, steps]);

  // Auto-start tour for first-time visitors
  useEffect(() => {
    const shouldShow = checkShouldShowTour();
    if (shouldShow && steps.length > 0) {
      // Delay to ensure page is fully loaded
      const timeout = setTimeout(() => {
        startTour();
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [checkShouldShowTour, steps.length, startTour]);

  const currentStepData = steps[currentStep] || null;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return {
    // State
    isActive,
    isVisible,
    currentStep,
    currentStepData,
    targetElement,
    isFirstStep,
    isLastStep,
    totalSteps: steps.length,

    // Actions
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetTour,
    
    // Utilities
    shouldShowTour: checkShouldShowTour
  };
}

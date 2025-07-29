import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy';

export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: HapticType = 'light', element?: HTMLElement) => {
    // Try native haptic feedback first (if available)
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate(patterns[type]);
    }

    // Add visual haptic feedback as fallback
    if (element) {
      const className = `haptic-${type}`;
      element.classList.add(className);
      
      // Remove the class after animation completes
      const duration = type === 'light' ? 100 : type === 'medium' ? 150 : 200;
      setTimeout(() => {
        element.classList.remove(className);
      }, duration);
    }
  }, []);

  const lightHaptic = useCallback((element?: HTMLElement) => triggerHaptic('light', element), [triggerHaptic]);
  const mediumHaptic = useCallback((element?: HTMLElement) => triggerHaptic('medium', element), [triggerHaptic]);
  const heavyHaptic = useCallback((element?: HTMLElement) => triggerHaptic('heavy', element), [triggerHaptic]);

  return {
    triggerHaptic,
    lightHaptic,
    mediumHaptic,
    heavyHaptic
  };
}
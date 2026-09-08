import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useSmartBack } from '@/hooks/useSmartBack';

// Unified back button — quiet text element with ArrowRight, no border/background.
// Touch target ≥40px via invisible vertical padding (py-2 -my-2).
export default function BackButton({ className, onBeforeBack }) {
  const { goBack, backLabel } = useSmartBack();

  const handleClick = () => {
    if (onBeforeBack && onBeforeBack() === false) return;
    goBack();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] py-2 -my-2 ${className || ''}`}
    >
      <ArrowRight className="w-4 h-4 flex-shrink-0" />
      <span>{backLabel}</span>
    </button>
  );
}
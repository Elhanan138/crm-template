import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * Linear-style unified status/completion trigger.
 * Uses optimistic local state so the morph animation plays instantly on click,
 * before the server round-trip completes.
 * Respects prefers-reduced-motion.
 */
export default function CompletionCircle({ done, onToggle, title }) {
  const [rippleKey, setRippleKey] = useState(0);
  const [optimistic, setOptimistic] = useState(null);
  const reduceMotion = useReducedMotion();

  // Reset optimistic state once the server value catches up
  useEffect(() => { setOptimistic(null); }, [done]);

  const isDone = optimistic !== null ? optimistic : done;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isDone && !reduceMotion) setRippleKey(k => k + 1);
    setOptimistic(!isDone);
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className="relative flex-shrink-0 group/circle w-[18px] h-[18px]"
    >
      {rippleKey > 0 && !reduceMotion && (
        <motion.span
          key={rippleKey}
          initial={{ scale: 1, opacity: 0.15 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-primary pointer-events-none"
        />
      )}
      <span
        className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 transition-colors duration-200 ${
          isDone
            ? 'bg-primary border-primary'
            : 'bg-transparent border-border group-hover/circle:border-primary'
        }`}
      >
        <motion.span
          initial={false}
          animate={{ scale: isDone ? 1 : 0.7 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
          className={`transition-opacity duration-200 ${
            isDone
              ? 'opacity-100 text-primary-foreground'
              : 'opacity-0 group-hover/circle:opacity-40 text-primary'
          }`}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </motion.span>
      </span>
    </button>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

const STEPS = ['מנתח את הבקשה', 'שולף נתונים', 'מנסח תשובה'];

export default function AgentTraceCard() {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setCompletedSteps(1), 500),
      setTimeout(() => setCompletedSteps(2), 1100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      dir="rtl"
      style={{
        border: '1px solid hsl(var(--border))',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'hsl(var(--card))',
      }}
    >
      {/* Header bar — same structure as agent message */}
      <div
        style={{
          background: 'hsl(var(--muted))',
          borderBottom: '1px solid hsl(var(--border))',
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Bot size={14} color="hsl(var(--primary))" />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--primary))', letterSpacing: '0.06em' }}>
          {AGENT_LABEL}
        </span>
      </div>

      {/* Body — checklist */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {STEPS.map((label, i) => {
          const isDone = i < completedSteps;
          const isActive = i === completedSteps;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isDone ? (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '5px',
                    background: 'hsl(var(--primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : isActive ? (
                <motion.div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '5px',
                    background: 'hsl(var(--success-muted))',
                    flexShrink: 0,
                  }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--primary))', margin: '5px' }} />
                </motion.div>
              ) : (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '5px',
                    border: '1.5px solid hsl(var(--border))',
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isDone ? 'hsl(var(--muted-foreground))' : isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
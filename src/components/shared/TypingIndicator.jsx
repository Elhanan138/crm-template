import React from 'react';

export default function TypingIndicator({ className = '' }) {
  return (
    <span className={`flex items-center gap-1 ${className}`} aria-label="טוען">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
    </span>
  );
}
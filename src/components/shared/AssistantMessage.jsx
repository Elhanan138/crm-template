import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Copy, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';

const SOURCE_LABELS = {
  data: 'מהמערכת',
  cache: 'מהמערכת',
  document: 'מהמסמכים',
  llm: 'ניתוח AI',
  pending: 'פעולה',
};

function formatResponseTime(ms) {
  if (!ms) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function useTypewriter(text, enabled, duration = 600) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text);
      setDone(true);
      return;
    }
    setDisplayed('');
    setDone(false);
    const chars = text.length;
    if (chars === 0) {
      setDisplayed('');
      setDone(true);
      return;
    }
    const interval = Math.max(8, duration / chars);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= chars) {
        clearInterval(timer);
        setDone(true);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [text, enabled, duration]);

  return { displayed, done };
}

function VisualAnswer({ visual }) {
  if (!visual) return null;

  if (visual.type === 'hours_bank') {
    return (
      <div className="mt-2 space-y-1.5 pt-1.5 border-t border-border/30">
        {visual.data.banks.map((bank, i) => {
          const pct = bank.purchased > 0 ? Math.min(100, Math.round((bank.used / bank.purchased) * 100)) : 0;
          const isLow = bank.purchased > 0 && bank.remaining / bank.purchased < 0.2;
          return (
            <div key={i}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="font-medium text-foreground">{bank.label}</span>
                <span className={isLow ? 'text-warning font-medium' : 'text-muted-foreground'}>
                  {bank.remaining} שעות נשארו
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLow ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${100 - pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (visual.type === 'status_breakdown') {
    const { items = [], total = 0 } = visual.data;
    if (total === 0) return null;
    const toneClasses = {
      success: 'bg-success',
      info: 'bg-info',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
      muted: 'bg-muted-foreground',
    };
    return (
      <div className="mt-2 pt-1.5 border-t border-border/30">
        <div className="flex h-2 rounded-full overflow-hidden bg-muted gap-0.5">
          {items.map((item, i) => (
            <div
              key={i}
              className={`h-full ${toneClasses[item.tone] || 'bg-muted-foreground'}`}
              style={{ width: `${item.pct}%` }}
              title={`${item.label}: ${item.count}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${toneClasses[item.tone] || 'bg-muted-foreground'}`} />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function AssistantMessage({ msg, onFollowUp, isNew = false, onFeedback }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(msg.feedback || null);
  const { displayed, done } = useTypewriter(msg.content || '', isNew && !isUser);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        dir="rtl"
        style={{ display: 'flex', justifyContent: 'flex-end' }}
      >
        <div style={{
          maxWidth: '85%',
          background: 'hsl(var(--accent))',
          borderRadius: '14px',
          padding: '11px 14px',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'hsl(var(--foreground))', margin: 0 }}>
            {msg.content}
          </p>
        </div>
      </motion.div>
    );
  }



  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      dir="rtl"
      style={{ width: '100%' }}
    >
      <div style={{ position: 'relative' }}>
        <ReactMarkdown
          className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-1.5"
          components={{
            p: ({ children }) => (
              <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'hsl(var(--foreground))', margin: 0 }}>
                {children}
                {!done && <span style={{ display: 'inline-block', width: '2px', height: '16px', background: 'hsl(var(--primary))', marginRight: '2px', animation: 'blink 1s step-end infinite' }} />}
              </p>
            ),
          }}
        >
          {displayed}
        </ReactMarkdown>
        {msg.visual && <VisualAnswer visual={msg.visual} />}
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            padding: '4px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            opacity: 0.4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
          title="העתק"
        >
          {copied
            ? <CheckCircle2 size={14} color="hsl(var(--primary))" />
            : <Copy size={14} color="hsl(var(--muted-foreground))" />}
        </button>
      </div>

      {/* Like / Dislike — very small, subtle */}
      {done && onFeedback && !msg.pendingAction && (
        <div style={{ display: 'flex', gap: '2px', marginTop: '6px', opacity: feedback ? 1 : 0.35 }}>
          <button
            onClick={() => {
              if (feedback) return;
              setFeedback('like');
              onFeedback('like');
            }}
            style={{
              padding: '3px',
              borderRadius: '6px',
              border: 'none',
              background: feedback === 'like' ? 'hsl(var(--success-muted))' : 'transparent',
              cursor: feedback ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { if (!feedback) e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            title="תשובה טובה"
          >
            <ThumbsUp size={13} color={feedback === 'like' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
          </button>
          <button
            onClick={() => {
              if (feedback) return;
              setFeedback('dislike');
              onFeedback('dislike');
            }}
            style={{
              padding: '3px',
              borderRadius: '6px',
              border: 'none',
              background: feedback === 'dislike' ? 'hsl(var(--destructive) / 0.1)' : 'transparent',
              cursor: feedback ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { if (!feedback) e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            title="תשובה לא מדויקת"
          >
            <ThumbsDown size={13} color={feedback === 'dislike' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'} />
          </button>
        </div>
      )}

      {/* Follow-up chips */}
      {msg.followUps && msg.followUps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {msg.followUps.map((fu, fi) => (
            <button
              key={fi}
              onClick={() => onFollowUp(fu)}
              style={{
                padding: '5px 10px',
                borderRadius: '99px',
                fontSize: '12px',
                background: 'hsl(var(--accent))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
                cursor: 'pointer',
              }}
            >
              {fu}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
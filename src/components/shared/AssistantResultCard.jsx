import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Undo2, ThumbsUp, ThumbsDown } from 'lucide-react';

function getNavTarget(action) {
  switch (action) {
    case 'createTask':
    case 'updateTask':
    case 'markTaskDone':
    case 'addTaskComment':
      return '/tasks';
    case 'createSupportTicket':
    case 'updateTicketStatus':
      return '/support';
    case 'openGuide':
      return '/guides';
    default:
      return null;
  }
}

export default function AssistantResultCard({ pendingAction, onRevert, onNavigate, onFeedback }) {
  const [feedback, setFeedback] = useState(null);
  if (!pendingAction) return null;
  const navTarget = getNavTarget(pendingAction.action);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={{
        background: 'hsl(var(--success-muted))',
        borderRadius: '10px',
        padding: '12px 14px',
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'hsl(var(--primary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <CheckCircle2 size={12} color="white" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pendingAction.summary}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {navTarget && (
          <button
            onClick={() => onNavigate?.(navTarget)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'hsl(var(--primary))',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            פתח
            <ArrowLeft size={14} />
          </button>
        )}
        <button
          onClick={onRevert}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'hsl(var(--muted-foreground))',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <Undo2 size={12} />
          בטל
        </button>
        {onFeedback && (
          <div style={{ display: 'flex', gap: '2px', borderRight: '1px solid hsl(var(--border))', paddingRight: '8px' }}>
            <button
              onClick={() => { if (feedback) return; setFeedback('like'); onFeedback('like'); }}
              style={{
                padding: '3px', borderRadius: '6px', border: 'none',
                background: feedback === 'like' ? 'hsl(var(--success-muted))' : 'transparent',
                cursor: feedback ? 'default' : 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
              title="תשובה טובה"
            >
              <ThumbsUp size={13} color={feedback === 'like' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
            </button>
            <button
              onClick={() => { if (feedback) return; setFeedback('dislike'); onFeedback('dislike'); }}
              style={{
                padding: '3px', borderRadius: '6px', border: 'none',
                background: feedback === 'dislike' ? 'hsl(var(--destructive) / 0.1)' : 'transparent',
                cursor: feedback ? 'default' : 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
              title="תשובה לא מדויקת"
            >
              <ThumbsDown size={13} color={feedback === 'dislike' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
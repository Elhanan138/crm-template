import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';

export default function AssistantHistoryPanel({ sessions, activeSessionId, onSelect, onDelete, onNewChat }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ overflow: 'hidden', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))' }}
      >
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '208px', overflowY: 'auto' }}>
          <button
            onClick={onNewChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              borderRadius: '14px',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              fontSize: '13px',
              fontWeight: 600,
              color: 'hsl(var(--primary))',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            שיחה חדשה
          </button>
          {sessions.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '12px 0' }}>אין שיחות קודמות</p>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px',
                  borderRadius: '14px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--accent))';
                  e.currentTarget.style.background = 'hsl(var(--muted))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                  e.currentTarget.style.background = 'hsl(var(--card))';
                }}
              >
                <MessageSquare size={14} color={s.id === activeSessionId ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title || 'שיחה'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{formatDate(s.timestamp, 'datetime-short')}</p>
                </div>
                <button
                  onClick={(e) => onDelete(s.id, e)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={12} color="hsl(var(--destructive))" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
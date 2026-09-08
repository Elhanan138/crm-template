import React from 'react';
import { getSuggestionCards } from '@/lib/agentCapabilities';

function getFirstName(name) {
  if (!name || !name.trim()) return '';
  let firstPart = name.trim().split(/[\s@]/)[0];
  if (firstPart.includes('.') && !firstPart.includes(' ')) {
    firstPart = firstPart.split('.')[0];
  }
  if (firstPart.length > 0) {
    firstPart = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  }
  return firstPart;
}

export default function AssistantEmptyState({ scope = 'global', userName, onSampleClick, systemDisabledFeatures, userDisabledActions, isAdmin }) {
  const cards = getSuggestionCards({
    scope,
    systemDisabledFeatures: systemDisabledFeatures || new Set(),
    userDisabledActions: userDisabledActions || new Set(),
    isAdmin: isAdmin || false,
  });
  const firstName = getFirstName(userName);

  return (
    <div dir="rtl" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Greeting */}
      <div>
        <h3 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: '22px', color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.2 }}>
          {firstName ? <>במה נתחיל, <bdi>{firstName}</bdi>?</> : 'במה נתחיל?'}
        </h3>
        <p style={{ fontSize: '15px', fontWeight: 400, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0 0' }}>
          בחר פעולה או תאר מה צריך לקרות.
        </p>
      </div>

      {/* 2×2 action grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={() => onSampleClick(card.prompt)}
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                padding: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
                textAlign: 'right',
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                e.currentTarget.style.boxShadow = '0 6px 18px -12px rgba(11,44,27,.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'hsl(var(--success-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color="hsl(var(--primary))" />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>{card.title}</div>
                <div style={{ fontSize: '10px', fontWeight: 400, color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{card.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
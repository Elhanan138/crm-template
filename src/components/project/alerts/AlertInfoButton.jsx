import React, { useState, useRef, useEffect } from 'react';
import { Info, Bell, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatDate } from '@/lib/formatDate';

/**
 * Clean "i"info button for project alert rows.
 * Shows a short delivery report in a clean popover.
 */
export default function AlertInfoButton({ alert }) {
 const [open, setOpen] = useState(false);
 const btnRef = useRef(null);

 useEffect(() => {
  if (!open || !btnRef.current) return;
  const rect = btnRef.current.getBoundingClientRect();
  const panelWidth = 280;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openDown = spaceBelow > 200;
  let rightOffset = window.innerWidth - rect.right;
  if (rightOffset + panelWidth > window.innerWidth - 8) {
   rightOffset = Math.max(8, window.innerWidth - panelWidth - 8);
  }
  setPosition({ top: openDown ? rect.bottom + 6 : rect.top - 6, right: rightOffset, openDown });
 }, [open]);

 const [position, setPosition] = useState({ top: 0, right: 0, openDown: true });

 useEffect(() => {
  if (!open) return;
  const handler = (e) => {
   if (btnRef.current && !btnRef.current.contains(e.target)) {
    const panel = document.getElementById('alert-info-popover');
    if (panel && !panel.contains(e.target)) setOpen(false);
   }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
 }, [open]);

 const isActive = alert.active;
 const channels = alert.channels || {};
 const lastSent = alert.last_sent_at;

 return (
  <>
   <button
    ref={btnRef}
    onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
    className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
    title="פרטי שליחה"
   >
    <Info className="w-3.5 h-3.5"/>
   </button>
   {open && createPortal(
    <div
     id="alert-info-popover"
     className="fixed z-[10000] bg-card rounded-lg border border-border shadow-lg p-3 space-y-2.5"
     style={{
      top: position.top,
      right: position.right,
      width: 280,
      transform: position.openDown ? 'none' : 'translateY(-100%)',
     }}
     onClick={(e) => e.stopPropagation()}
    >
     <div className="flex items-center gap-2 pb-2 border-b border-border">
      {isActive ? (
       <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0"/>
      ) : (
       <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
      )}
      <span className="text-xs font-bold text-foreground">
       {isActive ? 'פעילה' : 'מושבתת'}
      </span>
     </div>

     <div className="flex items-center gap-2">
      <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
      <div className="min-w-0">
       <p className="text-[10px] text-muted-foreground">שליחה אחרונה</p>
       <p className="text-xs text-foreground font-medium truncate">
        {lastSent ? formatDate(lastSent, 'full-he-time') : '—'}
       </p>
      </div>
     </div>

     <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-shrink-0">
       {channels.bell && <Bell className="w-3.5 h-3.5 text-primary"/>}
       {channels.email && <Mail className="w-3.5 h-3.5 text-info"/>}
       {!channels.bell && !channels.email && <span className="text-[10px] text-muted-foreground">אין ערוצים</span>}
      </div>
      <div className="min-w-0">
       <p className="text-[10px] text-muted-foreground">ערוצי שליחה</p>
       <p className="text-xs text-foreground font-medium">
        {[channels.bell && 'פעמון', channels.email && 'מייל'].filter(Boolean).join(', ') || '—'}
       </p>
      </div>
     </div>
    </div>,
    document.body
   )}
  </>
 );
}
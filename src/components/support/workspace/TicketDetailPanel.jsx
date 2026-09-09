import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, PauseCircle, CheckCircle2, User, Clock, Save, Trash2, Lock, Copy, Check } from 'lucide-react';
import ResolutionTextarea from '../ResolutionTextarea';
import { formatDate } from '@/lib/formatDate';
import { TYPE_CONFIG } from '../supportConfig';
import StatusBadge from '@/components/shared/StatusBadge';
import Field from '@/components/shared/Field';
import { promoteTarget, ticketAgeDays, ageTone, ageLabel } from './supportGroups';
import { resolveSubmitterName } from '@/lib/userDisplay';
import TicketConversation from '../TicketConversation';
import { useAccessControl } from '@/hooks/useAccessControl';

// Full ticket detail — decision row, content, resolution note (user-facing), internal note.
export default function TicketDetailPanel({ ticket, projects = [], teamMembers = [], onUpdate, onDelete }) {
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionImages, setResolutionImages] = useState([]);
  const [devSummary, setDevSummary] = useState('');
  const [resolveHint, setResolveHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const noteRef = useRef(null);
  const { currentUser } = useAccessControl();

  const handleCopy = () => {
    navigator.clipboard?.writeText(ticket.description || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setResolutionNote(ticket?.resolution_note || '');
    setResolutionImages(ticket?.resolution_image_urls || []);
    setDevSummary(ticket?.dev_summary || '');
    setResolveHint(false);
  }, [ticket?.id]);

  if (!ticket) return null;

  const tc = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
  const Icon = tc.icon;
  const date = ticket.created_date ? formatDate(ticket.created_date, 'medium') : '';
  const promote = promoteTarget(ticket.status);
  const days = ticketAgeDays(ticket);
  const noteDirty = resolutionNote !== (ticket.resolution_note || '') || JSON.stringify(resolutionImages) !== JSON.stringify(ticket.resolution_image_urls || []);
  const summaryDirty = devSummary !== (ticket.dev_summary || '');
  const submitterName = resolveSubmitterName(ticket, teamMembers);

  const handleResolve = () => {
    if (!resolutionNote.trim()) {
      setResolveHint(true);
      noteRef.current?.focus();
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onUpdate(ticket.id, { status: 'resolved', resolution_note: resolutionNote, resolution_image_urls: resolutionImages });
    setResolveHint(false);
  };

  return (
    <div className="space-y-5">
      {/* Decision row — the core flow */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!promote}
          onClick={() => promote && onUpdate(ticket.id, { status: promote.status })}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {promote ? promote.label : 'קדם'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={ticket.status === 'on_hold' || ticket.status === 'resolved'}
          onClick={() => onUpdate(ticket.id, { status: 'on_hold' })}
        >
          <PauseCircle className="w-3.5 h-3.5" />
          הקפא
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={ticket.status === 'resolved'}
          onClick={handleResolve}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          בוצע
        </Button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
            <Icon className={`w-4 h-4 ${tc.color}`} />
          </div>
          <h3 className="text-card-title leading-tight flex-1 min-w-0">{ticket.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <StatusBadge status={ticket.status} />
          <StatusBadge label={ageLabel(days)} tone={ageTone(days)} />
          {ticket.internal && <StatusBadge label="יזום" tone="accent" />}
          {submitterName && !ticket.internal && (
            <span className="text-caption flex items-center gap-1"><User className="w-3 h-3" />{submitterName}</span>
          )}
          {date && <span className="text-caption flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>}
        </div>
      </div>

      {/* Description */}
      <div className="relative bg-muted/40 rounded-lg p-4">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed select-text">{ticket.description}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute left-2 bottom-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'הועתק' : 'העתק'}
        </button>
      </div>

      {/* Screenshots */}
      {(ticket.image_urls || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ticket.image_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity">
              <img src={url} alt={`צרופה ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* Classification: project, type, priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="פרויקט">
          <Select value={ticket.project_id || 'none'} onValueChange={v => onUpdate(ticket.id, { project_id: v === 'none' ? '' : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא שיוך</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="סוג">
          <Select value={ticket.type} onValueChange={v => onUpdate(ticket.id, { type: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="עדיפות">
          <Select value={ticket.priority || 'medium'} onValueChange={v => onUpdate(ticket.id, { priority: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Resolution note — user-facing, with embedded screenshot upload */}
      <Field label="מה בוצע" help="הטקסט והצילומים משתקפים למשתמש שפתח את הפנייה">
        <ResolutionTextarea
          value={resolutionNote}
          onChange={setResolutionNote}
          images={resolutionImages}
          onImagesChange={setResolutionImages}
          textareaRef={noteRef}
          placeholder="תיאור קצר של מה שבוצע... (ניתן להדביק צילומי מסך ישירות)"
          className={resolveHint ? 'ring-2 ring-ring' : ''}
        />
        {resolveHint && (
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <p className="text-xs text-foreground">מה בוצע? התיאור יוצג למשתמש.</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onUpdate(ticket.id, { status: 'resolved' }); setResolveHint(false); }}>
              דלג וסמן בוצע
            </Button>
          </div>
        )}
        {noteDirty && !resolveHint && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 mt-1.5" onClick={() => onUpdate(ticket.id, { resolution_note: resolutionNote, resolution_image_urls: resolutionImages })}>
            <Save className="w-3.5 h-3.5" />
            שמור
          </Button>
        )}
      </Field>

      {/* Internal dev note */}
      <div className="bg-muted rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">פנימי — פתק פיתוח</span>
        </div>
        <Textarea
          value={devSummary}
          onChange={e => setDevSummary(e.target.value)}
          placeholder="הערות פנימיות — לא מוצג למשתמש..."
          className="min-h-[70px] text-sm resize-none bg-card"
        />
        {summaryDirty && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => onUpdate(ticket.id, { dev_summary: devSummary })}>
            <Save className="w-3.5 h-3.5" />
            שמור פתק
          </Button>
        )}
      </div>

      {/* Secondary actions */}
      <div className="flex flex-col gap-2 pt-1">
        <Button onClick={() => onDelete(ticket)} variant="outline" size="sm" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="w-4 h-4" />
          מחק פנייה
        </Button>
      </div>

      {/* Conversation with submitter */}
      <TicketConversation
        ticket={ticket}
        isAdmin={true}
        userEmail={currentUser?.email || ''}
        userDisplayName={currentUser?.full_name || ''}
      />
    </div>
  );
}
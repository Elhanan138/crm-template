import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Printer, FileDown, Trash2, ChevronLeft, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { elementToPdf, pdfFileName } from '@/lib/htmlToPdf';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CardSkeleton from '@/components/shared/CardSkeleton';
import HebrewDateInput from '@/components/shared/HebrewDateInput';
import {
  PROPOSAL_STATUSES, PROPOSAL_COMPLEXITIES, proposalStatusMeta, VAT_RATE,
  computePricing, generateProposalNumber,
} from '@/lib/proposalPricing';
import StatusBadge from '@/components/shared/StatusBadge';
import DocumentLetterhead, { DocumentFooter, DocumentSheet } from '@/components/shared/DocumentLetterhead';
import RelatedRecords from '@/components/crm/RelatedRecords';
import { normalizeHebrew } from '@/lib/hebrewSearch';
import { useRecordViewer, visibleModuleRecords } from '@/lib/crm/visibility';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { useI18n } from '@/lib/i18n';

function ProposalCard({ proposal, clientName, onEdit, onPrint, onPdf, pdfBusy }) {
  const { t } = useI18n();
  const status = proposalStatusMeta(proposal.status);
  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer" onClick={() => onEdit(proposal)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate" dir="ltr">{proposal.proposal_number || t('ללא מספר')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{clientName || t('לקוח לא מוגדר')}</p>
        </div>
        <StatusBadge
          label={t(status.label)}
          tone={status.tone}
          className="flex-shrink-0 text-[10px] px-2 py-0.5"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-start">
          <p className="text-lg font-bold text-primary" dir="ltr">
            {proposal.final_total ? `₪${Number(proposal.final_total).toLocaleString()}` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {proposal.issue_date ? `${t('תאריך')}: ${proposal.issue_date}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPdf(proposal)}
            disabled={pdfBusy}
            title={t('ייצוא PDF')}
            aria-label={t('ייצוא PDF')}
          >
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrint(proposal)} title={t('הדפסה')} aria-label={t('הדפסה')}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(proposal)} title={t('עריכה')} aria-label={t('עריכה')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProposalForm({ open, onOpenChange, proposal, clients, projects, existingCount, onSave, projectId }) {
  const { t, dir } = useI18n();
  const [form, setForm] = useState(() => proposal || {
    proposal_number: generateProposalNumber(existingCount),
    client_id: '',
    project_id: projectId || '',
    status: 'draft',
    issue_date: new Date().toISOString().slice(0, 10),
    valid_until: '',
    base_hourly_rate: 350,
    complexity: 'basic',
    line_items: [{ name: '', hours: 0, adjusted_rate: 0, total: 0 }],
    discount_percent: 0,
    vat_percent: VAT_RATE,
    notes: '',
  });

  const pricing = computePricing(form);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const addLineItem = () => setForm(prev => ({
    ...prev,
    line_items: [...(prev.line_items || []), { name: '', hours: 0, adjusted_rate: 0, total: 0 }],
  }));

  const removeLineItem = (idx) => setForm(prev => ({
    ...prev,
    line_items: prev.line_items.filter((_, i) => i !== idx),
  }));

  const updateLineItem = (idx, key, value) => setForm(prev => ({
    ...prev,
    line_items: prev.line_items.map((item, i) =>
      i === idx ? { ...item, [key]: key === 'name' ? value : Number(value) || 0 } : item
    ),
  }));

  const handleSave = () => {
    const computed = computePricing(form);
    onSave({
      ...form,
      // The customer's NAME, written beside the id it was chosen by.
      //
      // Every other module stores the customer as text — `company`,
      // `client_name`, `customer` — and the relations graph matches on it
      // through accountKey(). A proposal held only `client_id`, so it was the
      // one record in the revenue journey that could not be linked to anything:
      // no lead, no invoice, no contact. The id stays the source of truth; this
      // is the value the graph reads.
      client_name: clients?.find((c) => c.id === form.client_id)?.company_name || form.client_name || '',
      base_hourly_rate: Number(form.base_hourly_rate) || 0,
      line_items: computed.lineItems,
      subtotal: computed.subtotal,
      final_total: computed.finalTotal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal ? t('עריכת הצעת מחיר') : t('הצעת מחיר חדשה')}</DialogTitle>
          <DialogDescription>{t('עריכת פרטי הצעת המחיר')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prop-number">{t('מספר הצעה')}</Label>
            <Input id="prop-number" dir="ltr" value={form.proposal_number || ''} onChange={e => setField('proposal_number', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('סטטוס')}</Label>
            <Select value={form.status} onValueChange={v => setField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent dir={dir}>
                {PROPOSAL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{t(s.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('לקוח')}</Label>
            <Select value={form.client_id || ''} onValueChange={v => setField('client_id', v)}>
              <SelectTrigger><SelectValue placeholder={t('בחר לקוח')} /></SelectTrigger>
              <SelectContent dir={dir}>
                {(clients || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('פרויקט (אופציונלי)')}</Label>
            <Select value={form.project_id || ''} onValueChange={v => setField('project_id', v)}>
              <SelectTrigger><SelectValue placeholder={t('בחר פרויקט')} /></SelectTrigger>
              <SelectContent dir={dir}>
                {(projects || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-issue-date">{t('תאריך הנפקה')}</Label>
            <HebrewDateInput id="prop-issue-date" value={form.issue_date || ''} onChange={v => setField('issue_date', v)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-valid-until">{t('בתוקף עד')}</Label>
            <HebrewDateInput id="prop-valid-until" value={form.valid_until || ''} onChange={v => setField('valid_until', v)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-hourly-rate">{t('מחיר לשעת עבודה (₪)')}</Label>
            <Input id="prop-hourly-rate" dir="ltr" type="number" value={form.base_hourly_rate || ''} onChange={e => setField('base_hourly_rate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('מורכבות פרויקט')}</Label>
            <Select value={form.complexity} onValueChange={v => setField('complexity', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent dir={dir}>
                {PROPOSAL_COMPLEXITIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{t(c.label)} (x{c.multiplier})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between">
            <Label>{t('פירוט עבודה')}</Label>
            <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5 flex-shrink-0" /> {t('שורה')}
            </Button>
          </div>
          <div className="space-y-2">
            {(form.line_items || []).map((item, idx) => (
              /* Wraps on a phone: name on its own line, hours and the two
                 computed figures beneath it, rather than five controls squeezed
                 into 360px. */
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <Input
                  className="flex-1 min-w-[160px]"
                  placeholder={t('שם השלב / מוצר')}
                  aria-label={`${t('שם שלב')} ${idx + 1}`}
                  value={item.name || ''}
                  onChange={e => updateLineItem(idx, 'name', e.target.value)}
                />
                <Input
                  className="w-20"
                  dir="ltr"
                  type="number"
                  placeholder={t('שעות')}
                  aria-label={`${t('שעות שלב')} ${idx + 1}`}
                  value={item.hours || ''}
                  onChange={e => updateLineItem(idx, 'hours', e.target.value)}
                />
                <div className="w-24 text-center text-sm text-muted-foreground">
                  <span dir="ltr">₪{pricing.adjustedRate.toLocaleString()}</span> / {t('שעה')}
                </div>
                <div className="w-24 text-center text-sm font-semibold" dir="ltr">
                  ₪{((Number(item.hours) || 0) * pricing.adjustedRate).toLocaleString()}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeLineItem(idx)} aria-label={`${t('מחיקת שורת פירוט')} ${idx + 1}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing summary */}
        <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('סכום ביניים')}</span>
            <span className="font-semibold" dir="ltr">₪{pricing.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="prop-discount" className="text-muted-foreground">{t('הנחה (%)')}</Label>
            <Input
              id="prop-discount"
              className="w-20 h-8 text-end"
              dir="ltr"
              type="number"
              value={form.discount_percent || 0}
              onChange={e => setField('discount_percent', Number(e.target.value) || 0)}
            />
          </div>
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>{t('הנחה')}</span>
              <span dir="ltr">-₪{pricing.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('מע"מ')} ({form.vat_percent || VAT_RATE}%)</span>
            <span dir="ltr">₪{pricing.vatAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1.5 border-t border-border">
            <span>{t('סה"כ לתשלום')}</span>
            <span className="text-primary" dir="ltr">₪{pricing.finalTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prop-notes">{t('הערות')}</Label>
          <Textarea id="prop-notes" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} rows={2} />
        </div>

        {/* What else in the system touches this customer. Same strip, same
            visibility rules, as every CRM record — a proposal is no longer the
            one form you leave to go find the matching lead by hand. */}
        <RelatedRecords moduleId="proposals" record={proposal} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('ביטול')}</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{t('שמירה')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalDocument({ proposal, client, innerRef }) {
  const pricing = computePricing(proposal);
  return (
    <DocumentSheet innerRef={innerRef}>
      <div>
        <DocumentLetterhead
          title="הצעת מחיר"
          className="mb-8"
          meta={(
            <>
              <p className="text-sm mt-1">{proposal.proposal_number}</p>
              <p className="text-xs text-doc-muted mt-1">תאריך: {proposal.issue_date}</p>
              {proposal.valid_until && <p className="text-xs text-doc-muted">בתוקף עד: {proposal.valid_until}</p>}
            </>
          )}
        />

        {/* Client info */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-doc-muted mb-2">לכבוד:</h3>
          {client && (
            <div className="flex items-center gap-3">
              {client.company_logo_url && (
                <img src={client.company_logo_url} alt={client.company_name} className="w-12 h-12 rounded-lg object-contain border border-doc-rule" />
              )}
              <div>
                <p className="text-lg font-bold">{client.company_name}</p>
                {client.legal_id && <p className="text-sm text-doc-muted">ח.פ: {client.legal_id}</p>}
                {client.primary_contact_name && <p className="text-sm">{client.primary_contact_name}</p>}
                {client.primary_contact_email && <p className="text-sm text-doc-muted">{client.primary_contact_email}</p>}
                {client.primary_contact_phone && <p className="text-sm text-doc-muted">{client.primary_contact_phone}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Pricing details */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-doc-rule">
              <th className="text-right py-2">תיאור</th>
              <th className="text-center py-2 w-24">שעות</th>
              <th className="text-center py-2 w-32">מחיר לשעה</th>
              <th className="text-left py-2 w-32">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {pricing.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-doc-rule">
                <td className="py-2">{item.name || `שלב ${i + 1}`}</td>
                <td className="text-center py-2">{item.hours}</td>
                <td className="text-center py-2" dir="ltr">₪{item.adjusted_rate.toLocaleString()}</td>
                <td className="text-left py-2 font-semibold" dir="ltr">₪{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex flex-col ms-auto w-64 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-doc-muted">סכום ביניים</span><span dir="ltr">₪{pricing.subtotal.toLocaleString()}</span></div>
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-doc-negative"><span>הנחה ({proposal.discount_percent}%)</span><span dir="ltr">-₪{pricing.discountAmount.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between"><span className="text-doc-muted">מע"מ ({proposal.vat_percent || VAT_RATE}%)</span><span dir="ltr">₪{pricing.vatAmount.toLocaleString()}</span></div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-doc-accent"><span>סה"כ לתשלום</span><span className="text-doc-accent" dir="ltr">₪{pricing.finalTotal.toLocaleString()}</span></div>
        </div>

        {proposal.notes && (
          <div className="mt-8 pt-4 border-t border-doc-rule">
            <p className="text-sm text-doc-muted whitespace-pre-wrap">{proposal.notes}</p>
          </div>
        )}

        <DocumentFooter className="text-center" />
      </div>
    </DocumentSheet>
  );
}

function ProposalPrintView({ proposal, client, onClose, onPdf, pdfBusy }) {
  const { t } = useI18n();
  return (
    /* `bg-doc`, not `bg-white`: the sheet behind the document is the document's
       own surface token, and it is the one token deliberately fixed to white. */
    <div className="proposal-print fixed inset-0 z-50 bg-doc overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-8 pt-8">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={onClose}>{t('סגירה')}</Button>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} variant="outline" className="gap-2">
              <Printer className="w-4 h-4 flex-shrink-0" /> {t('הדפסה')}
            </Button>
            <Button onClick={() => onPdf(proposal)} disabled={pdfBusy} className="gap-2">
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 flex-shrink-0" />} {t('ייצוא PDF')}
            </Button>
          </div>
        </div>
      </div>
      <ProposalDocument proposal={proposal} client={client} />
    </div>
  );
}

export default function ProposalsView({ projectId }) {
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();
  const viewer = useRecordViewer();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [printProposal, setPrintProposal] = useState(null);
  const [pdfProposal, setPdfProposal] = useState(null);
  const pdfRef = useRef(null);
  // A related-records link arrives as ?q=<customer>, exactly as it does for
  // every CRM module. Without seeding the box from it, the link landed on the
  // whole list and quietly broke the promise it made.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', projectId],
    queryFn: () => projectId
      ? api.entities.Proposal.filter({ project_id: projectId }, '-created_date')
      : api.entities.Proposal.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list('company_name'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
  });

  const clientMap = React.useMemo(() => {
    const map = {};
    (clients || []).forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  // Rows the viewer may SEE, before anything is filtered or counted.
  //
  // This page used to list every proposal in the system to anyone who could log
  // in — a price, a discount and a margin per row. The rule is declared once in
  // src/lib/crm/visibility.js and is the same one the related-records counts and
  // global search now apply, so a proposal cannot be hidden in one place and
  // countable in another.
  const readable = useMemo(
    () => visibleModuleRecords('proposals', proposals, viewer, CRM_SCHEMAS),
    [proposals, viewer]
  );
  const hiddenCount = proposals.length - readable.length;

  // Client-side safety filter — only show proposals belonging to this project
  const projectProposals = useMemo(() => (projectId
    ? readable.filter(p => p.project_id === projectId)
    : readable
  ).filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!search.trim()) return true;
    // Hebrew is matched the way the rest of the system matches it: final
    // letters folded, niqqud stripped. "בלוסום" typed with a final mem found
    // nothing before.
    const q = normalizeHebrew(search);
    const clientName = p.client_name || clientMap[p.client_id]?.company_name || '';
    return [p.proposal_number, clientName, p.notes]
      .some((value) => normalizeHebrew(value).includes(q));
  }), [readable, projectId, statusFilter, search, clientMap]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const { id, ...payload } = data;
      return id
        ? api.entities.Proposal.update(id, payload)
        : api.entities.Proposal.create(payload);
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setFormOpen(false);
      setEditingProposal(null);
      toast.success(vars?.id ? t('הצעת המחיר עודכנה') : t('הצעת המחיר נוצרה'));
    },
    onError: (e) => toast.error(e?.message || t('שמירת הצעת המחיר נכשלה')),
  });

  // The document is mounted off-screen at full width, captured, then unmounted —
  // so the PDF looks identical to the print view regardless of the viewport.
  useEffect(() => {
    if (!pdfProposal) return;
    let cancelled = false;
    const id = requestAnimationFrame(async () => {
      try {
        await elementToPdf(
          pdfRef.current,
          pdfFileName('הצעת-מחיר', pdfProposal.proposal_number || pdfProposal.id)
        );
        if (!cancelled) toast.success(t('הצעת המחיר יוצאה ל-PDF'));
      } catch (err) {
        if (!cancelled) toast.error(err?.message || t('יצירת ה-PDF נכשלה'));
      } finally {
        if (!cancelled) setPdfProposal(null);
      }
    });
    return () => { cancelled = true; cancelAnimationFrame(id); };
  }, [pdfProposal]);

  const handleEdit = (proposal) => {
    setEditingProposal(proposal);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingProposal(null);
    setFormOpen(true);
  };

  const handleSave = (data) => saveMutation.mutate(data);

  const handlePrint = (proposal) => setPrintProposal(proposal);

  if (isLoading) {
    return (
      <div dir={dir}>
        <PageHeader icon={FileText} title={t('הצעות מחיר')} subtitle={t('טוען...')} />
        <CardSkeleton count={4} />
      </div>
    );
  }

  return (
    <div dir={dir}>
      {!projectId ? (
        <PageHeader
          icon={FileText}
          title={t('הצעות מחיר')}
          subtitle={`${projectProposals.length} ${t('הצעות')}`}
          actions={
            <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 text-sm font-semibold gap-2">
              <Plus className="w-4 h-4 flex-shrink-0" /> {t('הצעת מחיר חדשה')}
            </Button>
          }
        />
      ) : null}

      {/* Search & filter bar — shown on both standalone and project-embedded views */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${projectId ? 'mb-4' : 'mt-4'}`}>
        <div className="relative flex-1 sm:max-w-sm">
          {/* `end-3` and not `right-3`: the input reserves its room with `pe-9`,
              which is the inline END. Pinned to the physical right, the icon sat
              on top of the text in Hebrew. */}
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('חיפוש לפי מספר, לקוח או הערות...')}
            aria-label={t('חיפוש הצעות מחיר')}
            className="h-9 pe-9 rounded-full text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9 rounded-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir={dir}>
            <SelectItem value="all">{t('כל הסטטוסים')}</SelectItem>
            {PROPOSAL_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{t(s.label)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projectProposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={readable.length === 0 ? t('אין הצעות מחיר עדיין') : t('לא נמצאו תוצאות')}
          description={readable.length === 0
            ? t('צור את ההצעה הראשונה כדי להתחיל.')
            : t('נסה לשנות את החיפוש או את הסינון.')}
          action={readable.length === 0 ? (
            <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-9 text-sm font-semibold">{t('צור הצעה')}</Button>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectProposals.map(p => (
            <ProposalCard
              onPdf={setPdfProposal}
              pdfBusy={pdfProposal?.id === p.id}
              key={p.id}
              proposal={p}
              clientName={p.client_name || clientMap[p.client_id]?.company_name}
              onEdit={handleEdit}
              onPrint={handlePrint}
            />
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <p className="text-[11px] text-muted-foreground mt-3">
          {hiddenCount} {t('רשומות מוסתרות לפי הרשאות')}
        </p>
      )}

      {formOpen && (
        <ProposalForm
          open={formOpen}
          onOpenChange={setFormOpen}
          proposal={editingProposal}
          clients={clients}
          projects={projects}
          existingCount={projectProposals.length}
          onSave={handleSave}
          projectId={projectId}
        />
      )}

      {printProposal && (
        <ProposalPrintView
          proposal={printProposal}
          client={clientMap[printProposal.client_id]}
          onClose={() => setPrintProposal(null)}
          onPdf={setPdfProposal}
          pdfBusy={pdfProposal?.id === printProposal.id}
        />
      )}

      {/* Off-screen capture target for PDF export */}
      {pdfProposal && (
        <div aria-hidden className="fixed -left-[10000px] top-0 pointer-events-none">
          <ProposalDocument
            proposal={pdfProposal}
            client={clientMap[pdfProposal.client_id]}
            innerRef={pdfRef}
          />
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
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
  COMPLEXITY_LABELS, STATUS_LABELS, STATUS_COLORS, VAT_RATE,
  computePricing, generateProposalNumber,
} from '@/lib/proposalPricing';
import { useLogo } from '@/lib/LogoContext';

function ProposalCard({ proposal, clientName, onEdit, onPrint, onPdf, pdfBusy }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer" onClick={() => onEdit(proposal)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{proposal.proposal_number || 'ללא מספר'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{clientName || 'לקוח לא מוגדר'}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[proposal.status] || STATUS_COLORS.draft}`}>
          {STATUS_LABELS[proposal.status] || proposal.status}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-right">
          <p className="text-lg font-bold text-primary" dir="ltr">
            {proposal.final_total ? `₪${Number(proposal.final_total).toLocaleString()}` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {proposal.issue_date ? `תאריך: ${proposal.issue_date}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPdf(proposal)}
            disabled={pdfBusy}
            title="ייצוא PDF"
            aria-label="ייצוא PDF"
          >
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrint(proposal)} title="הדפסה" aria-label="הדפסה">
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(proposal)} title="עריכה" aria-label="עריכה">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProposalForm({ open, onOpenChange, proposal, clients, projects, existingCount, onSave, projectId }) {
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
      base_hourly_rate: Number(form.base_hourly_rate) || 0,
      line_items: computed.lineItems,
      subtotal: computed.subtotal,
      final_total: computed.finalTotal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal ? 'עריכת הצעת מחיר' : 'הצעת מחיר חדשה'}</DialogTitle>
          <DialogDescription>עריכת פרטי הצעת המחיר</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prop-number">מספר הצעה</Label>
            <Input id="prop-number" value={form.proposal_number || ''} onChange={e => setField('proposal_number', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>סטטוס</Label>
            <Select value={form.status} onValueChange={v => setField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>לקוח</Label>
            <Select value={form.client_id || ''} onValueChange={v => setField('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>
                {(clients || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>פרויקט (אופציונלי)</Label>
            <Select value={form.project_id || ''} onValueChange={v => setField('project_id', v)}>
              <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
              <SelectContent>
                {(projects || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-issue-date">תאריך הנפקה</Label>
            <HebrewDateInput id="prop-issue-date" value={form.issue_date || ''} onChange={v => setField('issue_date', v)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-valid-until">בתוקף עד</Label>
            <HebrewDateInput id="prop-valid-until" value={form.valid_until || ''} onChange={v => setField('valid_until', v)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-hourly-rate">מחיר לשעת עבודה (₪)</Label>
            <Input id="prop-hourly-rate" type="number" value={form.base_hourly_rate || ''} onChange={e => setField('base_hourly_rate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>מורכבות פרויקט</Label>
            <Select value={form.complexity} onValueChange={v => setField('complexity', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(COMPLEXITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between">
            <Label>פירוט עבודה</Label>
            <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" /> שורה
            </Button>
          </div>
          <div className="space-y-2">
            {(form.line_items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="שם השלב / מוצר"
                  aria-label={`שם שלב ${idx + 1}`}
                  value={item.name || ''}
                  onChange={e => updateLineItem(idx, 'name', e.target.value)}
                />
                <Input
                  className="w-20"
                  type="number"
                  placeholder="שעות"
                  aria-label={`שעות שלב ${idx + 1}`}
                  value={item.hours || ''}
                  onChange={e => updateLineItem(idx, 'hours', e.target.value)}
                />
                <div className="w-24 text-center text-sm text-muted-foreground" dir="ltr">
                  ₪{pricing.adjustedRate.toLocaleString()} לשעה
                </div>
                <div className="w-24 text-center text-sm font-semibold" dir="ltr">
                  ₪{((Number(item.hours) || 0) * pricing.adjustedRate).toLocaleString()}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLineItem(idx)} aria-label={`מחיקת שורת פירוט ${idx + 1}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing summary */}
        <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm" dir="rtl">
          <div className="flex justify-between">
            <span className="text-muted-foreground">סכום ביניים</span>
            <span className="font-semibold" dir="ltr">₪{pricing.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="prop-discount" className="text-muted-foreground">הנחה (%)</Label>
            <Input
              id="prop-discount"
              className="w-20 h-8 text-left"
              type="number"
              value={form.discount_percent || 0}
              onChange={e => setField('discount_percent', Number(e.target.value) || 0)}
            />
          </div>
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>הנחה</span>
              <span dir="ltr">-₪{pricing.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">מע"ד ({form.vat_percent || VAT_RATE}%)</span>
            <span dir="ltr">₪{pricing.vatAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1.5 border-t border-border">
            <span>סה"כ לתשלום</span>
            <span className="text-primary" dir="ltr">₪{pricing.finalTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prop-notes">הערות</Label>
          <Textarea id="prop-notes" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalDocument({ proposal, client, innerRef }) {
  const pricing = computePricing(proposal);
  const { systemName, company } = useLogo();
  const details = [
    company?.legalId && `ח.פ: ${company.legalId}`,
    company?.address,
  ].filter(Boolean).join(' | ');
  const terms = [
    company?.paymentTerms && `תנאי תשלום: ${company.paymentTerms}`,
    company?.bank && `בנק: ${company.bank}`,
  ].filter(Boolean).join(' | ');
  return (
    <div ref={innerRef} className="bg-white text-black w-[800px] max-w-full mx-auto px-8 py-10" dir="rtl">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-primary pb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">{systemName}</h1>
            {company?.tagline && <p className="text-sm text-muted-foreground mt-1">{company.tagline}</p>}
            {details && <p className="text-xs text-muted-foreground mt-2">{details}</p>}
            {terms && <p className="text-xs text-muted-foreground">{terms}</p>}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold">הצעת מחיר</h2>
            <p className="text-sm mt-1">{proposal.proposal_number}</p>
            <p className="text-xs text-muted-foreground mt-1">תאריך: {proposal.issue_date}</p>
            {proposal.valid_until && <p className="text-xs text-muted-foreground">בתוקף עד: {proposal.valid_until}</p>}
          </div>
        </div>

        {/* Client info */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">לכבוד:</h3>
          {client && (
            <div className="flex items-center gap-3">
              {client.company_logo_url && (
                <img src={client.company_logo_url} alt={client.company_name} className="w-12 h-12 rounded-lg object-contain border border-border" />
              )}
              <div>
                <p className="text-lg font-bold">{client.company_name}</p>
                {client.legal_id && <p className="text-sm text-muted-foreground">ח.פ: {client.legal_id}</p>}
                {client.primary_contact_name && <p className="text-sm">{client.primary_contact_name}</p>}
                {client.primary_contact_email && <p className="text-sm text-muted-foreground">{client.primary_contact_email}</p>}
                {client.primary_contact_phone && <p className="text-sm text-muted-foreground">{client.primary_contact_phone}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Pricing details */}
        <table className="w-full mb-6 text-sm" dir="rtl">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-right py-2">תיאור</th>
              <th className="text-center py-2 w-24">שעות</th>
              <th className="text-center py-2 w-32">מחיר לשעה</th>
              <th className="text-left py-2 w-32">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {pricing.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-border">
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
          <div className="flex justify-between"><span className="text-muted-foreground">סכום ביניים</span><span dir="ltr">₪{pricing.subtotal.toLocaleString()}</span></div>
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-red-600"><span>הנחה ({proposal.discount_percent}%)</span><span dir="ltr">-₪{pricing.discountAmount.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">מע"ד ({proposal.vat_percent || VAT_RATE}%)</span><span dir="ltr">₪{pricing.vatAmount.toLocaleString()}</span></div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-primary"><span>סה"כ לתשלום</span><span className="text-primary" dir="ltr">₪{pricing.finalTotal.toLocaleString()}</span></div>
        </div>

        {proposal.notes && (
          <div className="mt-8 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p>
          </div>
        )}

        {systemName && (
          <div className="mt-12 text-center text-xs text-muted-foreground">
            <p>{['תודה שבחרתם ב-' + systemName, company?.tagline].filter(Boolean).join(' | ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalPrintView({ proposal, client, onClose, onPdf, pdfBusy }) {
  return (
    <div className="proposal-print fixed inset-0 z-50 bg-white overflow-y-auto" dir="rtl">
      <div className="max-w-[800px] mx-auto px-8 pt-8">
        <div className="flex justify-between items-center mb-4 print:hidden">
          <Button variant="outline" onClick={onClose}>סגירה</Button>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" /> הדפסה
            </Button>
            <Button onClick={() => onPdf(proposal)} disabled={pdfBusy} className="gap-2">
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} ייצוא PDF
            </Button>
          </div>
        </div>
      </div>
      <ProposalDocument proposal={proposal} client={client} />
    </div>
  );
}

export default function ProposalsView({ projectId }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [printProposal, setPrintProposal] = useState(null);
  const [pdfProposal, setPdfProposal] = useState(null);
  const pdfRef = useRef(null);
  const [search, setSearch] = useState('');
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

  // Client-side safety filter — only show proposals belonging to this project
  const projectProposals = (projectId
    ? proposals.filter(p => p.project_id === projectId)
    : proposals
  ).filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const clientName = clientMap[p.client_id]?.company_name || '';
      return (p.proposal_number || '').toLowerCase().includes(q) ||
             clientName.toLowerCase().includes(q) ||
             (p.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const { id, ...payload } = data;
      return id
        ? api.entities.Proposal.update(id, payload)
        : api.entities.Proposal.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setFormOpen(false);
      setEditingProposal(null);
    },
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
        if (!cancelled) toast.success('הצעת המחיר יוצאה ל-PDF');
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'יצירת ה-PDF נכשלה');
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
      <div dir="rtl" className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <PageHeader icon={FileText} title="הצעות מחיר" subtitle="טוען..." />
        <CardSkeleton count={4} />
      </div>
    );
  }

  return (
    <div dir="rtl" className={projectId ? '' : 'max-w-[1600px] mx-auto px-4 sm:px-6'}>
      {!projectId ? (
        <PageHeader
          icon={FileText}
          title="הצעות מחיר"
          subtitle={`${projectProposals.length} הצעות במערכת`}
          actions={
            <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 text-sm font-semibold gap-2">
              <Plus className="w-4 h-4" /> הצעת מחיר חדשה
            </Button>
          }
        />
      ) : null}

      {/* Search & filter bar — shown on both standalone and project-embedded views */}
      <div className={`flex items-center gap-3 ${projectId ? 'mb-4' : 'mt-4'}`}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי מספר, לקוח או הערות..."
            aria-label="חיפוש הצעות מחיר"
            className="h-9 pe-9 rounded-full text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 rounded-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projectProposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="אין הצעות מחיר עדיין"
          description="צור את ההצעה הראשונה כדי להתחיל."
          action={
            <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-9 text-sm font-semibold">צור הצעה</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectProposals.map(p => (
            <ProposalCard
              onPdf={setPdfProposal}
              pdfBusy={pdfProposal?.id === p.id}
              key={p.id}
              proposal={p}
              clientName={clientMap[p.client_id]?.company_name}
              onEdit={handleEdit}
              onPrint={handlePrint}
            />
          ))}
        </div>
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

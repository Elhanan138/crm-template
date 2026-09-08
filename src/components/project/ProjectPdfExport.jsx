/* hex מכוון — רינדור PDF, ראה DESIGN_SYSTEM §0 */
import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/api/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseISO, isValid } from 'date-fns';
import { formatDate } from '@/lib/formatDate';
import { buildPdfFilename, ALL_SECTION_IDS } from '@/lib/pdfSections';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const fmtDate = (d) => {
  if (!d) return '—';
  const v = typeof d === 'string' ? parseISO(d) : new Date(d);
  return isValid(v) ? formatDate(v, 'full-he') : '—';
};
const money = (n) => (n || n === 0) ? `₪${Number(n).toLocaleString()}` : '—';

const QUOTE_STATUS = { draft: 'טיוטה', sent: 'נשלח', signed: 'חתום', rejected: 'נדחה' };
const TASK_STATUS = { open: 'פתוחה', in_progress: 'בתהליך', done: 'הושלמה' };
const GANTT_STATUS = { not_started: 'לא התחיל', in_progress: 'בתהליך', stuck: 'תקוע', done: 'הושלם' };

const ProjectPdfExport = forwardRef(({ project, meetings = [] }, ref) => {
  const [busy, setBusy] = useState(false);
  const [activeSections, setActiveSections] = useState(null);
  const [reportData, setReportData] = useState(null);
  const reportRef = useRef(null);

  useImperativeHandle(ref, () => ({
    export: async (sections) => {
      setBusy(true);
      try {
        const [quotes, tasks, ganttItems, notes, rates] = await Promise.all([
          api.entities.Quote.filter({ project_id: project.id }),
          api.entities.Task.filter({ project_id: project.id }, 'order'),
          api.entities.GanttItem.filter({ project_id: project.id }, 'order'),
          api.entities.ProjectNote.filter({ project_id: project.id }),
          api.entities.Rate.filter({ project_id: project.id }),
        ]);

        const recentMeetings = [...meetings]
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 10);

        setReportData({
          openQuotes: quotes.filter(q => q.status !== 'signed' && q.status !== 'rejected'),
          tasks,
          ganttItems,
          notes,
          rates,
          recentMeetings,
        });
        setActiveSections(sections);

        await new Promise(r => setTimeout(r, 150));

        const el = reportRef.current;
        if (!el) throw new Error('Report element not found');

        const canvas = await html2canvas(el, { scale: 2, backgroundColor: 'hsl(0, 0%, 100%)', useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        let heightLeft = imgH;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position -= pageH;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }

        const filename = buildPdfFilename(project.client_name || project.name);
        pdf.save(filename);
        toast.success('הדוח יוצא בהצלחה');
      } catch (e) {
        toast.error('יצירת הדוח נכשלה: ' + e.message);
      } finally {
        setBusy(false);
      }
    },
  }));

  const sections = activeSections || ALL_SECTION_IDS;

  const banks = [
    { label: 'שעות הדרכה', total: project.training_hours_purchased },
    { label: 'בנק שעות פיתוח', total: project.dev_hours_purchased, used: project.dev_hours_used },
    { label: 'בנק שעות הסבה', total: project.conversion_hours_purchased, used: project.conversion_hours_used },
  ].filter(b => Number(b.total) > 0);

  return (
    <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '794px' }}>
      <div ref={reportRef} dir="rtl" style={{ width: '794px', padding: '40px', background: 'hsl(0, 0%, 100%)', fontFamily: 'Heebo, sans-serif', color: '#222' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '3px solid hsl(150 88% 28%)', paddingBottom: '16px', marginBottom: '20px' }}>
          {project.image_url && (
            <img src={project.image_url} alt="" crossOrigin="anonymous" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e0e0e0' }} />
          )}
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{project.client_name || project.name}</div>
            <div style={{ fontSize: '13px', color: '#888' }}>דוח פרויקט • {fmtDate(new Date())}</div>
          </div>
        </div>

        {sections.includes('overview') && (
          <Section title="סקירת פרויקט">
            <Grid rows={[
              ['שם הלקוח', project.client_name || '—'],
              ['שם הפרויקט', project.name || '—'],
              ['ערך החוזה', money(project.contract_value)],
              ['מודל תמחור', project.pricing_model === 'hours_bank' ? 'בנק שעות' : project.pricing_model === 'fix_price' ? 'מחיר קבוע' : '—'],
              ['מנהל פרויקט', project.project_manager || '—'],
              ['איש קשר מלווה', project.current_liaison || '—'],
            ]} />
            {banks.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                {banks.map((b, i) => {
                  const total = Number(b.total) || 0;
                  const used = Number(b.used) || 0;
                  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{b.label}</span>
                        <span style={{ color: '#888' }}>{used} / {total} שעות</span>
                      </div>
                      {b.used !== undefined && (
                        <div style={{ height: '8px', background: '#e8e8e8', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#d32f2f' : '#1a7a4c' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {sections.includes('project-life') && (
          <Section title="חיי פרויקט">
            <Grid rows={[
              ['תאריך קיקאוף', fmtDate(project.kickoff_date)],
              ['תאריך פיילוט', fmtDate(project.pilot_date)],
              ['עלייה לאוויר', fmtDate(project.go_live_date)],
              ['תחילת רישוי', fmtDate(project.licensing_start_date)],
              ['הקפאה עד', fmtDate(project.frozen_until)],
              ['כולל הקמה', project.has_setup ? 'כן' : 'לא'],
              ['פרטי הקמה', project.setup_details || '—'],
            ]} />
          </Section>
        )}

        {sections.includes('tasks') && (
          <Section title={`משימות (${reportData?.tasks?.length || 0})`}>
            {!reportData?.tasks?.length ? <Empty /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#f5f5f5' }}><Th>כותרת</Th><Th>אחראי</Th><Th>סטטוס</Th><Th>יעד</Th></tr></thead>
                <tbody>
                  {reportData.tasks.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                      <Td>{t.title}</Td><Td>{t.assigned_to || '—'}</Td>
                      <Td>{TASK_STATUS[t.status] || t.status}</Td><Td>{fmtDate(t.due_date)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {sections.includes('gantt') && (
          <Section title={`גאנט (${reportData?.ganttItems?.length || 0})`}>
            {!reportData?.ganttItems?.length ? <Empty /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#f5f5f5' }}><Th>שם</Th><Th>התחלה</Th><Th>סיום</Th><Th>סטטוס</Th></tr></thead>
                <tbody>
                  {reportData.ganttItems.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid #eee' }}>
                      <Td>{g.name}</Td><Td>{fmtDate(g.start_date)}</Td>
                      <Td>{fmtDate(g.end_date)}</Td><Td>{GANTT_STATUS[g.status] || g.status}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {sections.includes('meetings') && (
          <Section title="פגישות והדרכות">
            {!reportData?.recentMeetings?.length ? <Empty /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#f5f5f5' }}><Th>נושא</Th><Th>תאריך</Th><Th>שעות</Th></tr></thead>
                <tbody>
                  {reportData.recentMeetings.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                      <Td>{m.title}</Td><Td>{fmtDate(m.date)}</Td><Td>{m.effective_hours || m.duration_hours || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {sections.includes('quotes') && (
          <Section title="הצעות מחיר פתוחות">
            {!reportData?.openQuotes?.length ? <Empty /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#f5f5f5' }}><Th>כותרת</Th><Th>סכום</Th><Th>סטטוס</Th><Th>מעקב</Th></tr></thead>
                <tbody>
                  {reportData.openQuotes.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #eee' }}>
                      <Td>{q.title}</Td><Td>{money(q.amount)}</Td>
                      <Td>{QUOTE_STATUS[q.status] || q.status}</Td><Td>{fmtDate(q.follow_up_date)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {sections.includes('rates') && (
          <Section title={`תעריפים (${reportData?.rates?.length || 0})`}>
            {!reportData?.rates?.length ? <Empty /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#f5f5f5' }}><Th>תיאור</Th><Th>סכום</Th></tr></thead>
                <tbody>
                  {reportData.rates.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                      <Td>{r.name || r.description || r.title || '—'}</Td><Td>{money(r.amount || r.rate)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {sections.includes('notes') && (
          <Section title={`הערות (${reportData?.notes?.length || 0})`}>
            {!reportData?.notes?.length ? <Empty /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reportData.notes.map(n => (
                  <div key={n.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '6px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{n.title}{n.deadline ? ` • יעד: ${fmtDate(n.deadline)}` : ''}</div>
                    <div style={{ color: '#555' }}>{n.content || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
      {busy && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px' }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1a7a4c' }} />
          מייצא דוח...
        </div>
      )}
    </div>
  );
});

ProjectPdfExport.displayName = 'ProjectPdfExport';
export default ProjectPdfExport;

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '22px' }}>
    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a7a4c', marginBottom: '10px' }}>{title}</div>
    {children}
  </div>
);
const Grid = ({ rows }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
    {rows.map(([k, v], i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #f0f0f0', paddingBottom: '4px' }}>
        <span style={{ color: '#888' }}>{k}</span>
        <span style={{ fontWeight: 600 }}>{v}</span>
      </div>
    ))}
  </div>
);
const Th = ({ children }) => <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>{children}</th>;
const Td = ({ children }) => <td style={{ textAlign: 'right', padding: '6px 8px' }}>{children}</td>;
const Empty = () => <div style={{ fontSize: '12px', color: '#999' }}>אין נתונים</div>;
/* hex מכוון — רינדור PDF, ראה DESIGN_SYSTEM §0 */
import React from 'react';
import { formatDate } from '@/lib/formatDate';

function renderAnswer(field, value) {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'checkbox') return value ? '✓' : '—';
  if (field.type === 'checklist' && Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

/**
 * Offscreen printable layout of a completed FormSubmission, rasterized by
 * html2canvas into a Hebrew/RTL-safe PDF. Renders each field with its answer.
 * Uses hardcoded colors — html2canvas cannot resolve CSS variables in inline styles.
 */
const FormSubmissionPdf = React.forwardRef(function FormSubmissionPdf({ submission }, ref) {
  const fields = submission?.fields_snapshot || [];
  const answers = submission?.answers || {};

  return (
    <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '794px' }}>
      <div ref={ref} dir="rtl" style={{
        width: '794px',
        padding: '40px',
        background: '#ffffff',
        fontFamily: 'Heebo, sans-serif',
        color: '#1a2332',
      }}>
        <div style={{ borderBottom: '3px solid #16803c', paddingBottom: '14px', marginBottom: '22px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1a2332' }}>{submission?.template_title || 'טופס'}</div>
          <div style={{ fontSize: '13px', color: '#6b7484', marginTop: '6px' }}>
            {submission?.submitted_by_name ? `מולא ע"י ${submission.submitted_by_name}` : ''}
            {submission?.created_date ? `${submission?.submitted_by_name ? ' · ' : ''}${formatDate(submission.created_date, 'datetime')}` : ''}
          </div>
        </div>

        {fields.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#6b7484' }}>אין שדות בטופס.</div>
        ) : (
          fields.map((f, i) => (
            <div key={f.id || i} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#1a2332' }}>
                {i + 1}. {f.label || 'שדה ללא שם'}{f.required ? ' *' : ''}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#1a2332',
                padding: '8px 12px',
                background: '#f5f6f8',
                borderRadius: '6px',
                minHeight: '34px',
                whiteSpace: 'pre-wrap',
                border: '1px solid #dfe3e9',
              }}>
                {renderAnswer(f, answers[f.id])}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default FormSubmissionPdf;
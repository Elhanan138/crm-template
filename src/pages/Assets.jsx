import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import CrmModulePage from '@/components/crm/CrmModulePage';
import DocumentLetterhead, { DocumentFooter, DocumentSheet } from '@/components/shared/DocumentLetterhead';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { formatValue } from '@/lib/crm/useCrmRecords';
import { elementToPdf, pdfFileName } from '@/lib/htmlToPdf';
import { useI18n } from '@/lib/i18n';

const schema = CRM_SCHEMAS.assets;
const fieldOf = (key) => schema.fields.find((f) => f.key === key);
const show = (key, record) => formatValue(fieldOf(key), record?.[key]);

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * The equipment hand-over form: what was handed over, to whom, in what state,
 * and two signatures. Handing over a laptop used to leave no paper at all —
 * and "I never received a charger" is a conversation this form ends.
 *
 * The document itself is Hebrew and right-to-left whatever the interface is
 * set to, like every document this system prints (see DocumentSheet).
 */
function HandoverDocument({ asset, innerRef }) {
  const rows = [
    ['שם הנכס', asset.name],
    ['קטגוריה', show('category', asset)],
    ['מספר סידורי', asset.serial_number],
    ['מיקום', asset.location],
    ['אחריות עד', show('warranty_until', asset)],
  ].filter(([, value]) => value && value !== '—');

  return (
    <DocumentSheet innerRef={innerRef}>
      <DocumentLetterhead
        title="טופס מסירת ציוד"
        className="mb-8"
        meta={<p className="text-xs text-doc-muted mt-1">תאריך: {today()}</p>}
      />

      <p className="text-sm mb-6">
        הריני מאשר/ת כי קיבלתי את הציוד המפורט להלן במצב תקין, ואחזיר אותו בסיום השימוש או לפי דרישה.
      </p>

      <table className="w-full text-sm mb-8">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-doc-rule">
              <td className="py-2 w-40 text-doc-muted">{label}</td>
              <td className="py-2 font-semibold">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-10 mt-16 text-sm">
        <div>
          <p className="font-semibold mb-1">המקבל/ת</p>
          <p className="text-doc-muted mb-10">{asset.assigned_to || ''}</p>
          <div className="border-t border-doc-foreground pt-1 text-xs text-doc-muted">חתימה ותאריך</div>
        </div>
        <div>
          <p className="font-semibold mb-1">המוסר/ת</p>
          <p className="text-doc-muted mb-10">&nbsp;</p>
          <div className="border-t border-doc-foreground pt-1 text-xs text-doc-muted">חתימה ותאריך</div>
        </div>
      </div>

      <DocumentFooter className="text-center" />
    </DocumentSheet>
  );
}

function HandoverView({ asset, onClose }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const exportPdf = async () => {
    setBusy(true);
    try {
      await elementToPdf(ref.current, pdfFileName('מסירת-ציוד', asset.serial_number || asset.name || asset.id));
      toast.success(t('הטופס יוצא ל-PDF'));
    } catch (e) {
      toast.error(e?.message || t('יצירת ה-PDF נכשלה'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-doc overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-8 pt-8">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={onClose}>{t('סגירה')}</Button>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} variant="outline" className="gap-2">
              <Printer className="w-4 h-4 flex-shrink-0" /> {t('הדפסה')}
            </Button>
            <Button onClick={exportPdf} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 flex-shrink-0" />} {t('ייצוא PDF')}
            </Button>
          </div>
        </div>
      </div>
      <HandoverDocument asset={asset} innerRef={ref} />
    </div>
  );
}

export default function Assets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const handoverId = searchParams.get('handover');

  const { data: assets = [] } = useQuery({
    queryKey: ['crm', 'Asset'],
    queryFn: () => api.entities.Asset.list(),
    enabled: !!handoverId,
  });
  const asset = handoverId ? assets.find((a) => a.id === handoverId) : null;

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('handover');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <CrmModulePage schema={schema} moduleId="assets" />
      {asset && <HandoverView asset={asset} onClose={close} />}
    </>
  );
}

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Download, Loader2, AlertTriangle, Upload, RotateCcw, Github, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLogo } from '@/lib/LogoContext';
import { MODULES } from '@/lib/modules';
import { OPTIONAL_FEATURES } from '../../../tools/export-core.js';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';

const SETTINGS_SECTIONS = [
  { id: 'users', label: 'משתמשים והרשאות' },
  { id: 'capabilities', label: 'יכולות המערכת' },
  { id: 'system-features', label: 'תכונות מערכת' },
  { id: 'custom-fields', label: 'שדות מותאמים' },
  { id: 'integrations', label: 'אינטגרציות' },
  { id: 'supabase', label: 'חיבור Supabase' },
  { id: 'project-tabs', label: 'תתי-עמודים בפרויקטים' },
  { id: 'popups', label: 'פופאפים והכרזות' },
  { id: 'notifications', label: 'מרכז התראות' },
  { id: 'branding', label: 'מיתוג ולוגו' },
];

export default function ExportDialog({ open, onOpenChange }) {
  // Only modules actually present in this bundle can be exported.
  const [selected, setSelected] = useState(() => new Set(ACTIVE_MODULE_IDS));
  const [sections, setSections] = useState(() => new Set(SETTINGS_SECTIONS.map((s) => s.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [devTools, setDevTools] = useState(true);
  const [features, setFeatures] = useState(() => new Set(Object.keys(OPTIONAL_FEATURES)));
  const [blankTemplate, setBlankTemplate] = useState(false);

  // Branding step — the bundle ships already branded for this client.
  const current = useLogo();
  const [brand, setBrand] = useState(() => ({
    name: current.systemName || '',
    subtitle: current.systemSubtitle || '',
    logo: current.logoUrl || '',
    company: { ...current.company },
  }));
  const logoInputRef = useRef(null);

  // GitHub publishing. The token is held in component state only — a personal
  // access token in localStorage is a credential every future XSS can read.
  const [gh, setGh] = useState({ repo: '', branch: 'main', token: '' });
  const [publishing, setPublishing] = useState(null);
  const [published, setPublished] = useState(null);

  const setBrandField = (key, value) => setBrand((b) => ({ ...b, [key]: value }));
  const setCompanyField = (key, value) =>
    setBrand((b) => ({ ...b, company: { ...b.company, [key]: value } }));

  const pickLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('יש לבחור קובץ תמונה');
    if (file.size > 512 * 1024) return setError('הלוגו לייצוא מוגבל ל-512KB — הוא מוטמע בחבילה');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'));
      reader.readAsDataURL(file);
    });
    setBrandField('logo', dataUrl);
    setError(null);
  };

  const toggle = (setter) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const exportOptions = () => ({
    modules: [...selected],
    settingsSections: [...sections],
    features: [...features],
    blankTemplate,
    identity: blankTemplate ? undefined : brand,
    devTools,
  });

  const publish = async () => {
    setError(null);
    setPublished(null);
    setPublishing('מתחיל');
    try {
      const { publishBundleToGitHub } = await import('@/lib/browserExport');
      const result = await publishBundleToGitHub({
        options: exportOptions(),
        repo: gh.repo,
        branch: gh.branch || 'main',
        token: gh.token,
        onProgress: setPublishing,
      });
      setPublished(result);
      setGh((g) => ({ ...g, token: '' }));
    } catch (e) {
      setError(e?.message || 'הדחיפה נכשלה');
    } finally {
      setPublishing(null);
    }
  };

  const download = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // Lazily pull in the embedded source payload, then build the archive
      // entirely in the browser — works on a deployed static site.
      const { buildZipInBrowser, downloadBlob } = await import('@/lib/browserExport');
      const { blob, meta } = await buildZipInBrowser(exportOptions());
      downloadBlob(blob);
      setResult({ ...meta, size: blob.size });
    } catch (e) {
      // The planner refuses to emit a ZIP that would not build. Show why.
      setError(e?.message || 'הייצוא נכשל');
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-2 py-1 cursor-pointer text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ייצוא לפריסה (Vercel / Netlify)</DialogTitle>
          <DialogDescription>
            בחר את המודולים שייכללו. החבילה נבנית כאן בדפדפן ומאומתת לפני ההורדה — אם היא לא הייתה נבנית, היא לא תרד.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">מודולים</p>
            {ACTIVE_MODULE_IDS.map((id) => (
              <Row
                key={id}
                checked={selected.has(id)}
                onChange={() => toggle(setSelected)(id)}
                label={MODULES[id].label || id}
              />
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">מקטעי הגדרות</p>
            {SETTINGS_SECTIONS.map((s) => (
              <Row
                key={s.id}
                checked={sections.has(s.id)}
                onChange={() => toggle(setSections)(s.id)}
                label={s.label}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">מיתוג החבילה</p>
          {blankTemplate ? (
            <p className="text-[11px] text-muted-foreground">
              תבנית ריקה נבחרה — החבילה תצא ללא שם, ללא לוגו וללא פרטי חברה.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-12 h-12 flex-shrink-0 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors"
                  aria-label="בחר לוגו"
                >
                  {brand.logo
                    ? <img src={brand.logo} alt="" className="w-full h-full object-contain p-1" />
                    : <Upload className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                  <Input value={brand.name} onChange={(e) => setBrandField('name', e.target.value)} placeholder="שם הלקוח" className="h-8 rounded-lg text-xs" />
                  <Input value={brand.subtitle} onChange={(e) => setBrandField('subtitle', e.target.value)} placeholder="כותרת משנה" className="h-8 rounded-lg text-xs" />
                </div>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                  onClick={() => setBrandField('logo', '')} disabled={!brand.logo} aria-label="נקה לוגו"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={brand.company.tagline || ''} onChange={(e) => setCompanyField('tagline', e.target.value)} placeholder="תת-כותרת מסמכים" className="h-8 rounded-lg text-xs" />
                <Input value={brand.company.legalId || ''} onChange={(e) => setCompanyField('legalId', e.target.value)} placeholder="ח.פ / ע.מ" dir="ltr" className="h-8 rounded-lg text-xs" />
                <Input value={brand.company.address || ''} onChange={(e) => setCompanyField('address', e.target.value)} placeholder="כתובת" className="h-8 rounded-lg text-xs col-span-2" />
                <Input value={brand.company.paymentTerms || ''} onChange={(e) => setCompanyField('paymentTerms', e.target.value)} placeholder="תנאי תשלום" className="h-8 rounded-lg text-xs" />
                <Input value={brand.company.bank || ''} onChange={(e) => setCompanyField('bank', e.target.value)} placeholder="פרטי בנק" dir="ltr" className="h-8 rounded-lg text-xs" />
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} />
            </>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">תכונות</p>
          {Object.entries(OPTIONAL_FEATURES).map(([id, f]) => (
            <Row
              key={id}
              checked={features.has(id)}
              onChange={() => toggle(setFeatures)(id)}
              label={f.label}
            />
          ))}
          <Row
            checked={devTools}
            onChange={() => setDevTools((v) => !v)}
            label="כלי פיתוח — בדיקות וכפתור הייצוא, כדי שגם מהחבילה הזו אפשר יהיה לייצא"
          />
          <Row
            checked={blankTemplate}
            onChange={() => setBlankTemplate((v) => !v)}
            label="תבנית ריקה — בלי לוגו, בלי שם מוצר ובלי פרטי חברה"
          />
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">דחיפה ל-GitHub</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={gh.repo} dir="ltr" placeholder="owner/repo" className="h-8 rounded-lg text-xs col-span-2"
              onChange={(e) => setGh({ ...gh, repo: e.target.value })}
            />
            <Input
              value={gh.branch} dir="ltr" placeholder="main" className="h-8 rounded-lg text-xs"
              onChange={(e) => setGh({ ...gh, branch: e.target.value })}
            />
            <Input
              type="password" value={gh.token} dir="ltr" autoComplete="off"
              placeholder="Personal access token (scope: repo)"
              className="h-8 rounded-lg text-xs col-span-2"
              onChange={(e) => setGh({ ...gh, token: e.target.value })}
            />
            <Button
              onClick={publish} variant="outline" size="sm" className="h-8 text-xs gap-1.5"
              disabled={!!publishing || !gh.repo || !gh.token}
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
              דחיפה
            </Button>
          </div>
          {publishing && <p className="text-[11px] text-muted-foreground">{publishing}…</p>}
          <p className="text-[11px] text-muted-foreground">
            הטוקן אינו נשמר בשום מקום — הוא נמחק ברגע שהדחיפה מסתיימת.
          </p>
        </div>

        {published && (
          <div className="text-xs bg-success/10 text-success rounded-md p-3 space-y-0.5">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {published.files} קבצים נדחפו לענף {published.branch}
            </p>
            <p dir="ltr" className="font-mono text-[10px]">git clone {published.cloneUrl}</p>
          </div>
        )}

        {result && (
          <div className="text-xs bg-success/10 text-success rounded-md p-3 space-y-0.5">
            <p className="font-semibold">החבילה ירדה · {(result.size / 1024).toFixed(0)} KB</p>
            <p>{result.files} קבצים · {result.modules.length} מודולים · {result.droppedDependencies.length} חבילות הושמטו</p>
            {result.blankTemplate && <p>תבנית ריקה — ללא מיתוג</p>}
          </div>
        )}

        {error && (
          <div className="flex gap-2 items-start text-xs bg-destructive/10 text-destructive rounded-md p-3 whitespace-pre-wrap">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button onClick={download} disabled={busy || selected.size === 0} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            הורד ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useRef, useState, useEffect } from 'react';
import { useLogo, isHex, contrastRatio, bestForeground } from '@/lib/LogoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Upload, Loader2, Palette, Check, Type, RotateCcw, Link2,
  Download, FileUp, AlertTriangle, Squircle,
} from 'lucide-react';
import { toast } from 'sonner';
import BrandMark from '@/components/shared/BrandMark';

const PRESETS = [
  { name: 'ברירת מחדל', colors: ['#2d3436', '#0984e3', '#00b894'] },
  { name: 'אוקיינוס', colors: ['#0369a1', '#0891b2', '#14b8a6'] },
  { name: 'שקיעה', colors: ['#c2410c', '#db2777', '#f59e0b'] },
  { name: 'יער', colors: ['#166534', '#4d7c0f', '#0f766e'] },
  { name: 'סגול עמוק', colors: ['#6d28d9', '#7c3aed', '#a21caf'] },
  { name: 'גרפיט', colors: ['#1f2937', '#374151', '#4b5563'] },
];

function extractColors(dataUrl, maxColors = 6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = 64;
      const h = Math.max(1, Math.round((img.height / img.width) * w)) || w;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const colorMap = {};
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 128) continue;
        const r = Math.round(pixels[i] / 32) * 32;
        const g = Math.round(pixels[i + 1] / 32) * 32;
        const b = Math.round(pixels[i + 2] / 32) * 32;
        if (r > 240 && g > 240 && b > 240) continue;
        if (r < 16 && g < 16 && b < 16) continue;
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }
      resolve(
        Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, maxColors)
          .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
          })
      );
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}

const Field = ({ label, value, onChange, onCommit, placeholder, dir = 'rtl', className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[11px] text-muted-foreground">{label}</label>
    <Input
      value={value}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      placeholder={placeholder}
      className="h-8 rounded-lg text-xs"
    />
  </div>
);

const Section = ({ icon: Icon, title, hint, children, className = '' }) => (
  <section className={`bg-card rounded-xl border border-border shadow-sm p-4 space-y-3 ${className}`}>
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold leading-tight">{title}</h3>
        {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

function ContrastBadge({ color }) {
  if (!isHex(color)) return null;
  const fg = bestForeground(color);
  const ratio = contrastRatio(color, fg);
  const pass = ratio >= 4.5;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
        pass ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      }`}
      title="יחס ניגודיות מול צבע הטקסט שייבחר אוטומטית"
    >
      {pass ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      ניגודיות {ratio.toFixed(1)}:1 {pass ? '· תקין' : '· נמוך'}
    </span>
  );
}

export default function BrandingPanel() {
  const {
    logoUrl, setLogo, resetLogo, isCustom,
    systemName, setSystemName,
    systemSubtitle, setSystemSubtitle,
    brandColor, setBrandColor,
    radius, setRadius,
    palette, setPalette,
    company, setCompany,
    exportBranding, importBranding, resetBranding,
    defaults,
  } = useLogo();

  const fileRef = useRef(null);
  const importRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [nameInput, setNameInput] = useState(systemName);
  const [subtitleInput, setSubtitleInput] = useState(systemSubtitle);
  const [hexInput, setHexInput] = useState(brandColor || '');
  const [logoUrlInput, setLogoUrlInput] = useState('');

  useEffect(() => { setNameInput(systemName); }, [systemName]);
  useEffect(() => { setSubtitleInput(systemSubtitle); }, [systemSubtitle]);
  useEffect(() => { setHexInput(brandColor || ''); }, [brandColor]);

  const ingestFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('יש לבחור קובץ תמונה');
    if (file.size > 2 * 1024 * 1024) return toast.error('גודל הקובץ חייב להיות עד 2MB');
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
        reader.readAsDataURL(file);
      });
      setLogo(dataUrl);
      const colors = await extractColors(dataUrl);
      setPalette(colors);
      if (colors.length) {
        setBrandColor(colors[0]);
        toast.success('הלוגו עודכן וצבעי המותג הוחלו');
      } else {
        toast.success('הלוגו עודכן');
      }
    } catch (err) {
      toast.error(err?.message || 'שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const applyLogoUrl = async () => {
    const url = logoUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
      return toast.error('כתובת חייבת להתחיל ב-https:// או ב-/');
    }
    setLogo(url);
    setLogoUrlInput('');
    const colors = await extractColors(url);
    if (colors.length) setPalette(colors);
    toast.success('הלוגו עודכן מכתובת');
  };

  const applyHex = () => {
    const value = hexInput.trim().startsWith('#') ? hexInput.trim() : `#${hexInput.trim()}`;
    if (!isHex(value)) return toast.error('קוד צבע לא תקין — נדרש פורמט #rrggbb');
    setBrandColor(value);
    toast.success('צבע המותג הוחל');
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBranding(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `branding-${systemName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('קובץ המיתוג יוצא');
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      importBranding(JSON.parse(await file.text()));
      toast.success('המיתוג יובא והוחל');
    } catch (err) {
      toast.error(err?.message || 'קובץ המיתוג לא תקין');
    }
  };

  const doReset = () => {
    resetBranding();
    toast.success('המיתוג אופס לברירת המחדל');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight">מיתוג</h2>
          <p className="text-[11px] text-muted-foreground">משפיע על סרגל הצד, כותרת הדפדפן, האייקון והמסמכים.</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Button onClick={doExport} variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> ייצוא
          </Button>
          <Button onClick={() => importRef.current?.click()} variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <FileUp className="w-3.5 h-3.5" /> ייבוא
          </Button>
          <Button onClick={doReset} variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive">
            <RotateCcw className="w-3.5 h-3.5" /> איפוס
          </Button>
        </div>
      </div>

      {/* Two columns on desktop — the whole panel fits without scrolling. */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">

      {/* ── Logo ─────────────────────────────────────────────────── */}
      <Section icon={Upload} title="לוגו" hint="גרירה, בחירה מהמחשב או כתובת. PNG מרובע עד 2MB.">
        <div className="flex items-start gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); ingestFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${
              dragging ? 'border-primary bg-accent' : 'border-border bg-muted/30 hover:border-primary/40'
            }`}
          >
            {uploading
              ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              : <img src={logoUrl} alt="לוגו" className="w-full h-full object-contain p-2" />}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex gap-1.5">
              <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm" className="h-8 gap-1.5 text-xs flex-1">
                <Upload className="w-3.5 h-3.5" /> העלאה
              </Button>
              <Button onClick={resetLogo} disabled={!isCustom} variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> נקה
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Input
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyLogoUrl()}
                placeholder="https://…/logo.png"
                dir="ltr"
                className="h-8 rounded-lg text-xs flex-1 min-w-0"
              />
              <Button onClick={applyLogoUrl} variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="החל כתובת">
                <Link2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex items-end gap-2.5 text-[10px] text-muted-foreground">
              {[16, 32, 48].map((px) => (
                <div key={px} className="flex flex-col items-center gap-0.5">
                  <BrandMark size={px} className="rounded" />
                  <span>{px}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Identity ─────────────────────────────────────────────── */}
      <Section icon={Type} title="זהות ופרטי חברה" hint="שם וכותרת מופיעים בסרגל הצד ובלשונית; פרטי החברה מופיעים בהצעות מחיר.">
        <div className="grid grid-cols-2 gap-2">
          <Field label="שם המערכת" value={nameInput} onChange={setNameInput} onCommit={() => setSystemName(nameInput)} placeholder={defaults.systemName} />
          <Field label="כותרת משנה" value={subtitleInput} onChange={setSubtitleInput} onCommit={() => setSystemSubtitle(subtitleInput)} placeholder={defaults.systemSubtitle} />
          <Field label="תת-כותרת מסמכים" value={company.tagline || ''} onChange={(v) => setCompany({ tagline: v })} placeholder="לדוגמה: AI Solutions" />
          <Field label="ח.פ / ע.מ" value={company.legalId || ''} onChange={(v) => setCompany({ legalId: v })} dir="ltr" />
          <Field label="כתובת" value={company.address || ''} onChange={(v) => setCompany({ address: v })} className="col-span-2" />
          <Field label="תנאי תשלום" value={company.paymentTerms || ''} onChange={(v) => setCompany({ paymentTerms: v })} placeholder="שוטף + 30" />
          <Field label="פרטי בנק" value={company.bank || ''} onChange={(v) => setCompany({ bank: v })} dir="ltr" />
        </div>
      </Section>

      {/* ── Colour ───────────────────────────────────────────────── */}
      <Section icon={Palette} title="צבע מותג" hint="מוחל מיידית. צבע הטקסט נבחר אוטומטית לפי ניגודיות.">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            value={brandColor || '#2d3436'}
            onChange={(e) => setBrandColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0"
            title="בחר צבע"
          />
          <Input
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyHex()}
            placeholder="#2d3436"
            dir="ltr"
            className="h-9 w-32 rounded-lg font-mono text-xs"
          />
          <Button onClick={applyHex} variant="outline" size="sm">החל</Button>
          <Button onClick={() => setBrandColor(null)} variant="ghost" size="sm" className="gap-1.5" disabled={!brandColor}>
            <RotateCcw className="w-3.5 h-3.5" /> נקה
          </Button>
          <ContrastBadge color={brandColor} />
        </div>

        {palette.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">חולצו מהלוגו — לחץ להחלה</p>
            <div className="flex flex-wrap gap-2">
              {palette.map((color) => (
                <button
                  key={color}
                  onClick={() => setBrandColor(color)}
                  title={color}
                  className={`w-10 h-10 rounded-lg border-2 shadow-sm transition-transform hover:scale-110 ${
                    brandColor === color ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {brandColor === color && <Check className="w-4 h-4 mx-auto text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">ערכות מוכנות</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => { setPalette(preset.colors); setBrandColor(preset.colors[0]); toast.success(`ערכת "${preset.name}" הוחלה`); }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 transition-colors"
              >
                <span className="flex -space-x-1">
                  {preset.colors.map((c) => (
                    <span key={c} className="w-3.5 h-3.5 rounded-full border border-background" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="text-xs">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Radius + live preview ────────────────────────────────── */}
      <Section icon={Squircle} title="עיגול פינות ותצוגה מקדימה" hint="משפיע על כפתורים, כרטיסים ושדות בכל המערכת.">
        <div className="flex items-center gap-3">
          <Slider value={[radius]} min={0} max={1.5} step={0.05} onValueChange={([v]) => setRadius(v)} className="flex-1" />
          <span className="text-[11px] font-mono text-muted-foreground w-12 text-left">{radius.toFixed(2)}</span>
          <Button onClick={() => setRadius(defaults.radius)} variant="ghost" size="icon" className="h-7 w-7" aria-label="איפוס עיגול">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="rounded-[var(--radius)] border border-border p-3 bg-muted/30 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} className="rounded-[calc(var(--radius)/1.5)]" />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{systemName || 'שם המערכת'}</p>
              {systemSubtitle && <p className="text-[11px] text-muted-foreground truncate">{systemSubtitle}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-8 text-xs">פעולה ראשית</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs">משנית</Button>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-primary text-primary-foreground">תגית</span>
            <Input placeholder="שדה" className="h-8 text-xs flex-1 min-w-[80px]" />
          </div>
        </div>
      </Section>

      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { ingestFile(e.target.files?.[0]); e.target.value = ''; }} className="hidden" />
      <input ref={importRef} type="file" accept="application/json" onChange={doImport} className="hidden" />
    </div>
  );
}

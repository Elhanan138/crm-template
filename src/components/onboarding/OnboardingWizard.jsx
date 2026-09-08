import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2, Boxes, Users, Sparkles, Check, ChevronLeft, ChevronRight, Loader2, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { useLogo, isHex } from '@/lib/LogoContext';
import { useI18n } from '@/lib/i18n';
import { SETTINGS_KEY } from '@/lib/capabilities';
import { PACKAGES, capabilityValuesFor, modulesOf, coverageOf } from '@/lib/onboardingPackages';
import { BRAND_PRESETS } from '@/lib/brandPresets';
import { MODULES } from '@/lib/modules';
import { useSeedMockData } from '@/hooks/useMockFixtures';

// ─────────────────────────────────────────────────────────────────────────────
// OPENING WIZARD
//
// A new deployment used to land on an empty template with twenty-five menu
// items and nothing in any of them. Four questions turn that into a system
// somebody can use: who you are, what you do, who is with you, and whether to
// start from an example.
//
// It writes through the mechanisms that already exist — branding through
// LogoContext, the module selection through the ordinary capability
// switchboard, demo data through the mock-fixture panel's own hook. Nothing
// here is a second way to do any of it, which is why skipping the wizard
// cannot leave the system in a state the settings screens cannot reach.
// ─────────────────────────────────────────────────────────────────────────────

export const ONBOARDING_KEY = 'onboarding_completed';

const STEPS = [
  { id: 'brand', label: 'מי אתם', icon: Building2 },
  { id: 'package', label: 'מה אתם עושים', icon: Boxes },
  { id: 'team', label: 'מי אתכם', icon: Users },
  { id: 'demo', label: 'נתוני דוגמה', icon: Sparkles },
];

const Field = ({ label, children, hint }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium">{label}</label>
    {children}
    {hint && <p className="text-caption">{hint}</p>}
  </div>
);

export default function OnboardingWizard({ onDone }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { setSystemName, setSystemSubtitle, setBrandColor, setLogo, logoUrl, isCustom } = useLogo();
  const seedMock = useSeedMockData();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [preset, setPreset] = useState(null);
  const [packageId, setPackageId] = useState('deliver');
  const [invites, setInvites] = useState(['', '', '']);
  const [wantDemo, setWantDemo] = useState(true);
  const [uploading, setUploading] = useState(false);

  const chosen = PACKAGES.find((p) => p.id === packageId);

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setLogo(file_url);
    } catch (e) {
      toast.error(e?.message || t('העלאת הלוגו נכשלה'));
    } finally {
      setUploading(false);
    }
  };

  const finish = useMutation({
    mutationFn: async () => {
      // 1 — branding, through the same context the branding panel writes to.
      if (name.trim()) setSystemName(name.trim());
      if (subtitle.trim()) setSystemSubtitle(subtitle.trim());
      if (preset && isHex(preset.primary)) setBrandColor(preset.primary);

      // 2 — the package, expressed as ordinary capability switches.
      const values = capabilityValuesFor(chosen);
      for (const [key, level] of Object.entries(values)) {
        await api.functions.invoke('globalTabVisibility', {
          action: 'set', settingKey: SETTINGS_KEY, tabId: key, enabled: level,
        });
      }

      // 3 — invitations. Optional, and a bad address must not sink the wizard.
      const emails = invites.map((e) => e.trim()).filter(Boolean);
      let invited = 0;
      for (const email of emails) {
        try {
          await api.entities.TeamMember.create({ email, name: email.split('@')[0], is_admin: false });
          invited += 1;
        } catch { /* reported in the summary, never fatal */ }
      }

      // 4 — demo data, only for the modules the package kept open.
      let seeded = 0;
      if (wantDemo) {
        try {
          const res = await seedMock.mutateAsync(modulesOf(chosen));
          seeded = res?.created || 0;
        } catch { /* the wizard still finishes; the summary says what happened */ }
      }

      await api.auth.updateMe({ [ONBOARDING_KEY]: new Date().toISOString() });
      return { invited, requested: emails.length, seeded, wantedDemo: wantDemo };
    },
    onSuccess: ({ invited, requested, seeded, wantedDemo }) => {
      queryClient.invalidateQueries();
      if (requested && invited < requested) {
        toast.warning(`${t('הוזמנו')} ${invited}/${requested}`);
      } else if (wantedDemo && seeded === 0) {
        toast.warning(t('המערכת מוכנה, אך לא נוצרו נתוני דוגמה'));
      } else {
        toast.success(wantedDemo ? `${t('המערכת מוכנה')} — ${seeded} ${t('רשומות דוגמה')}` : t('המערכת מוכנה'));
      }
      onDone?.();
    },
    onError: (e) => toast.error(e?.message || t('סיום ההגדרה נכשל')),
  });

  const skip = useMutation({
    mutationFn: () => api.auth.updateMe({ [ONBOARDING_KEY]: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries(); onDone?.(); },
    onError: (e) => toast.error(e?.message || t('הדילוג נכשל')),
  });

  const busy = finish.isPending || skip.isPending;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-6">
          {/* Progress — four dots, not a percentage nobody can act on */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                aria-current={i === step ? 'step' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-8 bg-primary' : i < step ? 'w-4 bg-primary/40' : 'w-4 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Entrance only, per DESIGN_SYSTEM §10 — and an exit animation with
              AnimatePresence mode="wait" wedges the wizard if someone clicks
              through faster than the transition runs. */}
          <motion.div
            key={STEPS[step].id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-5"
          >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                  {React.createElement(STEPS[step].icon, { className: 'w-5 h-5' })}
                </div>
                <div className="min-w-0">
                  <h1 className="text-section-title">{t(STEPS[step].label)}</h1>
                  <p className="text-caption">{t(`שלב ${step + 1} מתוך ${STEPS.length}`)}</p>
                </div>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <Field label={t('שם החברה')}>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('לדוגמה: אקמה')} className="h-10 rounded-lg" />
                  </Field>
                  <Field label={t('כותרת משנה')} hint={t('שורה אחת שמופיעה מתחת לשם')}>
                    <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-10 rounded-lg" />
                  </Field>
                  <Field label={t('לוגו')}>
                    <div className="flex items-center gap-3">
                      {isCustom && logoUrl && (
                        <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain border border-border" />
                      )}
                      <label className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 h-9 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer transition-colors">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {t('העלאת לוגו')}
                        <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploading} />
                      </label>
                    </div>
                  </Field>
                  <Field label={t('ערכת צבעים')}>
                    <div className="grid grid-cols-3 gap-2">
                      {BRAND_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPreset(p)}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                            preset?.id === p.id ? 'border-primary/40 bg-accent font-semibold' : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: p.primary }} />
                          <span className="truncate">{t(p.label)}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2">
                  {PACKAGES.map((p) => {
                    const active = p.id === packageId;
                    const { have, wanted } = coverageOf(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPackageId(p.id)}
                        className={`w-full text-start rounded-lg border px-3.5 py-3 transition-colors ${
                          active ? 'border-primary/40 bg-accent' : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{t(p.label)}</span>
                          {active && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                        </div>
                        <p className="text-caption">{t(p.description)}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {modulesOf(p).filter((id) => MODULES[id]?.label).map((id) => t(MODULES[id].label)).join(' · ')}
                          {have < wanted && ` — ${t('חלק מהמודולים אינם בבנייה הזו')}`}
                        </p>
                      </button>
                    );
                  })}
                  <p className="text-caption pt-1">{t('אפשר לשנות בכל רגע בהגדרות → יכולות המערכת.')}</p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-caption">{t('אפשר לדלג ולהזמין מאוחר יותר.')}</p>
                  {invites.map((value, i) => (
                    <Input
                      key={i}
                      type="email"
                      dir="ltr"
                      value={value}
                      onChange={(e) => setInvites(invites.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder="name@company.com"
                      className="h-10 rounded-lg"
                    />
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm">{t('להתחיל עם נתוני דוגמה?')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setWantDemo(value)}
                        className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                          wantDemo === value ? 'border-primary/40 bg-accent font-semibold' : 'border-border hover:border-primary/30'
                        }`}
                      >
                        {value ? t('כן, עם דוגמה') : t('לא, מערכת ריקה')}
                      </button>
                    ))}
                  </div>
                  {wantDemo && (
                    <p className="text-caption">
                      {t('הנתונים מסומנים כדוגמה ואפשר לנקות אותם בלחיצה מהגדרות → אדמין.')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => skip.mutate()}
                  disabled={busy}
                  className="text-muted-foreground gap-1.5"
                >
                  <X className="w-4 h-4" /> {t('דילוג')}
                </Button>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy} className="rounded-full gap-1.5">
                      <ChevronRight className="w-4 h-4" /> {t('הקודם')}
                    </Button>
                  )}
                  <Button
                    onClick={() => (isLast ? finish.mutate() : setStep(step + 1))}
                    disabled={busy}
                    className="rounded-full gap-1.5 px-5"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isLast ? <Check className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {isLast ? t('סיום') : t('הבא')}
                  </Button>
                </div>
              </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

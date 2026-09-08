import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Database, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Copy, PlugZap, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { supabaseSchemaSql, SUPABASE_SETTING_KEY, validateSupabaseConfig } from '@/lib/supabase';

const CONTROL = 'h-9 rounded-lg border-border bg-background text-sm';

const EMPTY = {
  url: '', anon_key: '', schema: 'public', enabled: false, table_prefix: '',
};

function Card({ icon: Icon, title, hint, children, action }) {
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight">{title}</h3>
            {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function SupabasePanel() {
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['supabase-config'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: SUPABASE_SETTING_KEY }),
  });

  const saved = { ...EMPTY, ...(res?.data?.value || {}) };
  const [form, setForm] = useState(null);
  const config = form ?? saved;
  const set = (patch) => setForm({ ...config, ...patch });

  const saveMutation = useMutation({
    mutationFn: async (value) => {
      // Stored field by field, so the settings store keeps its merge semantics.
      for (const [key, val] of Object.entries(value)) {
        await api.functions.invoke('globalTabVisibility', {
          action: 'set', settingKey: SUPABASE_SETTING_KEY, tabId: key, enabled: val,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-config'] });
      setForm(null);
      toast.success('הגדרות Supabase נשמרו');
    },
    onError: (e) => toast.error(e?.message || 'השמירה נכשלה'),
  });

  const save = () => {
    const error = validateSupabaseConfig(config);
    if (error) return toast.error(error);
    saveMutation.mutate(config);
  };

  const testConnection = async () => {
    const error = validateSupabaseConfig(config);
    if (error) { setResult({ ok: false, message: error }); return; }
    setTesting(true);
    setResult(null);
    try {
      // A plain REST probe — no SDK needed to know whether the project answers.
      const response = await fetch(`${config.url.replace(/\/$/, '')}/rest/v1/`, {
        headers: { apikey: config.anon_key, Authorization: `Bearer ${config.anon_key}` },
      });
      setResult(
        response.ok
          ? { ok: true, message: `החיבור תקין (HTTP ${response.status})` }
          : { ok: false, message: `הפרויקט השיב ${response.status} — בדוק את הכתובת ואת המפתח` }
      );
    } catch (e) {
      setResult({ ok: false, message: `לא ניתן להגיע לכתובת: ${e?.message || 'שגיאת רשת'}` });
    } finally {
      setTesting(false);
    }
  };

  const sql = supabaseSchemaSql(config.table_prefix);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      toast.success('ה-SQL הועתק');
    } catch {
      toast.error('ההעתקה נכשלה — סמן והעתק ידנית');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card
        icon={Database}
        title="חיבור ל-Supabase"
        hint="הגדרת הפרויקט, בדיקת חיבור והפקת סכימה — הכל מתוך המערכת."
        action={
          <Button onClick={save} disabled={saveMutation.isPending} size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0">
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            שמירה
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Project URL</Label>
            <Input
              value={config.url} dir="ltr" placeholder="https://xxxx.supabase.co"
              onChange={(e) => set({ url: e.target.value })} className={CONTROL}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Anon / public key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'} value={config.anon_key} dir="ltr"
                placeholder="eyJhbGciOi..." autoComplete="off"
                onChange={(e) => set({ anon_key: e.target.value })} className={`${CONTROL} pl-9`}
              />
              <button
                type="button" onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'הסתר מפתח' : 'הצג מפתח'}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              רק המפתח הציבורי. אין להזין כאן <span dir="ltr">service_role</span> — הוא חושף את כל הנתונים.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schema</Label>
            <Input value={config.schema} dir="ltr" onChange={(e) => set({ schema: e.target.value })} className={CONTROL} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">קידומת טבלאות</Label>
            <Input
              value={config.table_prefix} dir="ltr" placeholder="oss_"
              onChange={(e) => set({ table_prefix: e.target.value })} className={CONTROL}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={testConnection} disabled={testing} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
            בדיקת חיבור
          </Button>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={!!config.enabled} onCheckedChange={(v) => set({ enabled: v === true })} />
            הפעל את Supabase כשכבת הנתונים
          </label>
        </div>

        {result && (
          <div className={`flex items-start gap-2 text-xs rounded-md p-3 ${
            result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{result.message}</span>
          </div>
        )}

        {config.enabled && (
          <div className="flex items-start gap-2 text-xs rounded-md p-3 bg-warning-muted text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              ההגדרות נשמרות, אך שכבת הנתונים הפעילה היא עדיין <span dir="ltr">localStorage</span>.
              המעבר בפועל מחייב להחליף את <span dir="ltr">src/api/client.js</span> —
              ראה <span dir="ltr">docs/SUPABASE.md</span>.
            </span>
          </div>
        )}
      </Card>

      <Card
        icon={Database}
        title="סכימת בסיס הנתונים"
        hint={`${Object.keys(CRM_SCHEMAS).length} טבלאות נגזרות מהמודולים שבבנייה הזו`}
        action={
          <Button onClick={copySql} variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0">
            <Copy className="w-3.5 h-3.5" /> העתק SQL
          </Button>
        }
      >
        <p className="text-[11px] text-muted-foreground">
          הרץ ב-<span dir="ltr">SQL Editor</span> של הפרויקט. כולל <span dir="ltr">RLS</span> מופעל
          וכן מדיניות בסיסית לפי <span dir="ltr">owner_email</span>.
        </p>
        <pre
          dir="ltr"
          className="text-[10px] leading-relaxed bg-muted/50 rounded-lg p-3 overflow-auto max-h-72 font-mono"
        >
          {sql}
        </pre>
      </Card>
    </div>
  );
}

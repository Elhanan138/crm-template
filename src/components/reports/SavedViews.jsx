import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useI18n } from '@/lib/i18n';
import { useAccessControl } from '@/hooks/useAccessControl';
import { cleanEmail } from '@/lib/permissions';
import { SAVED_REPORT_ENTITY } from '@/lib/reports/savedViews';

/**
 * Pick, save and remove named views of one report source.
 *
 * Saved views are shared — a report is something a team reads together — but
 * only their author or an admin can remove one.
 */
export default function SavedViews({ sourceId, currentState, onApply }) {
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();
  const { effectiveUser, isRealAdmin } = useAccessControl();
  const me = cleanEmail(effectiveUser?.email);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');

  const { data: all = [] } = useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => api.entities[SAVED_REPORT_ENTITY].list('name'),
  });
  const views = all.filter((v) => v.source_id === sourceId);
  const current = views.find((v) => v.id === selected);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['saved-reports'] });

  const save = useMutation({
    mutationFn: () => api.entities[SAVED_REPORT_ENTITY].create({
      name: name.trim(), source_id: sourceId, state: currentState, owner_email: me,
    }),
    onSuccess: (row) => { refresh(); setSelected(row?.id || ''); setNaming(false); setName(''); toast.success(t('הדוח נשמר')); },
    onError: (e) => toast.error(e?.message || t('שמירת הדוח נכשלה')),
  });

  const remove = useMutation({
    mutationFn: (id) => api.entities[SAVED_REPORT_ENTITY].delete(id),
    onSuccess: () => { refresh(); setSelected(''); toast.success(t('הדוח נמחק')); },
  });

  const canRemove = current && (isRealAdmin || cleanEmail(current.owner_email) === me);

  if (naming) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate(); }}
      >
        <input
          autoFocus
          dir={dir}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('שם הדוח')}
          aria-label={t('שם הדוח')}
          className="h-8 w-40 rounded-md border border-input bg-transparent px-2 text-sm"
        />
        <button type="submit" disabled={!name.trim() || save.isPending} aria-label={t('שמירה')}
          className="w-8 h-8 rounded-md flex items-center justify-center text-primary hover:bg-muted disabled:opacity-40">
          <Check className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => { setNaming(false); setName(''); }} aria-label={t('ביטול')}
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {views.length > 0 && (
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            const view = views.find((v) => v.id === e.target.value);
            if (view) onApply(view.state || {});
          }}
          aria-label={t('דוחות שמורים')}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm max-w-[160px]"
        >
          <option value="">{t('דוחות שמורים')} ({views.length})</option>
          {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      {canRemove && (
        <button onClick={() => remove.mutate(current.id)} aria-label={t('מחיקת הדוח השמור')} title={t('מחיקת הדוח השמור')}
          className="w-8 h-8 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => setNaming(true)}
        className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <Bookmark className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('שמור תצוגה')}</span>
      </button>
    </div>
  );
}

import React, { useState } from 'react';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  History, MessageSquarePlus, Paperclip, Loader2, Trash2, Download, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import { formatDate } from '@/lib/formatDate';
import { useI18n } from '@/lib/i18n';
import {
  HISTORY_ENTITY, ACTIVITY_ENTITY, FILE_ENTITY,
  ACTIVITY_TYPES, activityMeta, describeValue,
} from '@/lib/crm/recordTrail';
import { TONE_CLASS } from '@/lib/crm/schemas';

// ─────────────────────────────────────────────────────────────────────────────
// The story of one record: what changed, what people did, what is attached.
//
// All three read from the same (entity, record_id) address, so this component
// works for any module without the module declaring anything.
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'history', label: 'היסטוריה', icon: History },
  { id: 'activity', label: 'פעילות', icon: MessageSquarePlus },
  { id: 'files', label: 'קבצים', icon: Paperclip },
];

const byNewest = (a, b) => String(b.created_date || '').localeCompare(String(a.created_date || ''));

const Empty = ({ children }) => (
  <p className="text-xs text-muted-foreground text-center py-6">{children}</p>
);

export default function RecordTrail({ schema, entity, record }) {
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('history');
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [uploading, setUploading] = useState(false);

  const recordId = record?.id;

  const [history, activity, files] = useQueries({
    queries: [HISTORY_ENTITY, ACTIVITY_ENTITY, FILE_ENTITY].map((collection) => ({
      queryKey: ['record-trail', collection, entity, recordId],
      queryFn: async () => {
        const rows = await api.entities[collection].list();
        return rows.filter((r) => r.entity === entity && r.record_id === recordId).sort(byNewest);
      },
      enabled: !!recordId,
      staleTime: 15000,
    })),
  });

  const refresh = (collection) =>
    queryClient.invalidateQueries({ queryKey: ['record-trail', collection, entity, recordId] });

  const addActivity = useMutation({
    mutationFn: (payload) => api.entities[ACTIVITY_ENTITY].create(payload),
    onSuccess: () => { refresh(ACTIVITY_ENTITY); setNote(''); toast.success(t('הפעילות נרשמה')); },
    onError: (e) => toast.error(e?.message || t('רישום הפעילות נכשל')),
  });

  const removeActivity = useMutation({
    mutationFn: (id) => api.entities[ACTIVITY_ENTITY].delete(id),
    onSuccess: () => { refresh(ACTIVITY_ENTITY); toast.success(t('הפעילות נמחקה')); },
    onError: (e) => toast.error(e?.message || t('מחיקת הפעילות נכשלה')),
  });

  const addFile = useMutation({
    mutationFn: (payload) => api.entities[FILE_ENTITY].create(payload),
    onSuccess: () => { refresh(FILE_ENTITY); toast.success(t('הקובץ צורף')); },
    onError: (e) => toast.error(e?.message || t('צירוף הקובץ נכשל')),
  });

  const removeFile = useMutation({
    mutationFn: (id) => api.entities[FILE_ENTITY].delete(id),
    onSuccess: () => { refresh(FILE_ENTITY); toast.success(t('הקובץ הוסר')); },
    onError: (e) => toast.error(e?.message || t('הסרת הקובץ נכשלה')),
  });

  if (!recordId) return null;

  const submitNote = () => {
    const text = note.trim();
    if (!text) { toast.error(t('אין מה לרשום')); return; }
    addActivity.mutate({
      entity, record_id: recordId, type: noteType, body: text,
      created_date: new Date().toISOString(),
    });
  };

  const onPickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { file_url, file_name, file_size, mime_type } = await api.integrations.Core.UploadFile({ file });
      addFile.mutate({
        entity, record_id: recordId, file_url, file_name, file_size, mime_type,
        created_date: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(e?.message || t('העלאת הקובץ נכשלה'));
    } finally {
      setUploading(false);
    }
  };

  const counts = {
    history: history.data?.length || 0,
    activity: activity.data?.length || 0,
    files: files.data?.length || 0,
  };

  return (
    <div className="pt-3 mt-3 border-t border-border">
      <div className="flex items-center gap-1 mb-3">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs border transition-colors ${
                active
                  ? 'bg-accent text-accent-foreground border-primary/30 font-semibold'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {t(item.label)}
              {counts[item.id] > 0 && (
                <span className="text-[10px] tabular-nums opacity-70">{counts[item.id]}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'history' && (
        history.isPending ? <Empty>{t('טוען...')}</Empty>
          : counts.history === 0 ? <Empty>{t('אין עדיין היסטוריה לרשומה הזו')}</Empty>
            : (
              <ol className="space-y-2.5">
                {history.data.map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {entry.action === 'create' ? t('הרשומה נוצרה') : t('הרשומה עודכנה')}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0" dir="ltr">
                        {formatDate(entry.created_date, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    {entry.actor && (
                      <p className="text-[10px] text-muted-foreground" dir="ltr">{entry.actor}</p>
                    )}
                    {(entry.changes || []).length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {entry.changes.map((change) => (
                          <li key={change.key} className="text-[11px] text-muted-foreground">
                            <span className="text-foreground">{t(change.label)}</span>:{' '}
                            <span className="line-through opacity-70">{t(describeValue(schema, change.key, change.from))}</span>
                            {' → '}
                            <span className="text-foreground">{t(describeValue(schema, change.key, change.to))}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )
      )}

      {tab === 'activity' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="h-8 rounded-lg text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent dir={dir}>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{t(type.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm" className="h-8 rounded-full px-4 text-xs"
                onClick={submitNote} disabled={addActivity.isPending}
              >
                {addActivity.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('רישום')}
              </Button>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              dir={dir}
              placeholder={t('מה קרה? שיחה, פגישה, החלטה...')}
              className="rounded-lg border-border bg-background text-sm"
            />
          </div>

          {counts.activity === 0 ? <Empty>{t('עדיין לא נרשמה פעילות')}</Empty> : (
            <ol className="space-y-2.5">
              {activity.data.map((entry) => {
                const meta = activityMeta(entry.type);
                return (
                  <li key={entry.id} className="group text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${TONE_CLASS[meta.tone] || TONE_CLASS.muted}`}>
                        {t(meta.label)}
                      </span>
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground" dir="ltr">
                          {formatDate(entry.created_date, 'dd/MM/yyyy HH:mm')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeActivity.mutate(entry.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          aria-label={t('מחיקה')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap">{entry.body}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-3">
          <label className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 h-8 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer transition-colors">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {t('צירוף קובץ')}
            <input type="file" className="hidden" onChange={onPickFile} disabled={uploading} />
          </label>

          {counts.files === 0 ? <Empty>{t('אין קבצים מצורפים')}</Empty> : (
            <ul className="space-y-1.5">
              {files.data.map((file) => (
                <li key={file.id} className="group flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-xs">{file.file_name}</span>
                  <a
                    href={file.file_url}
                    download={file.file_name}
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    aria-label={t('הורדה')}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeFile.mutate(file.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
                    aria-label={t('מחיקה')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

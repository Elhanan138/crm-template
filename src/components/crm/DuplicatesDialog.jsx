import React, { useMemo, useState } from 'react';
import { CopyCheck, Merge, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { findDuplicates, mergeRecords } from '@/lib/crm/duplicates';
import { readField } from '@/lib/crm/derived';
import { formatValue } from '@/lib/crm/useCrmRecords';

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATES
//
// Detection proposes; a person decides. Nothing merges on its own, and a merge
// only ever ADDS to the record it keeps — a field the survivor already filled
// is never overwritten by a copy, so a merge can be reviewed but never silently
// loses a value someone typed.
// ─────────────────────────────────────────────────────────────────────────────

export default function DuplicatesDialog({ open, onOpenChange, schema, records, lookups, onMerge, merging }) {
  const { t, dir } = useI18n();
  const [survivors, setSurvivors] = useState({});

  const groups = useMemo(
    () => (open ? findDuplicates(schema, records) : []),
    [open, schema, records]
  );

  const preview = (record) => {
    const fields = (schema.fields || []).filter((f) => f.list).slice(0, 3);
    return fields
      .map((f) => formatValue(f, readField(f, record), lookups))
      .filter((v) => v && v !== '—')
      .join(' · ');
  };

  const survivorOf = (group) => survivors[group[0].id] || group[0].id;

  const mergeGroup = (group) => {
    const keepId = survivorOf(group);
    const keep = group.find((r) => r.id === keepId);
    const others = group.filter((r) => r.id !== keepId);
    onMerge({ merged: mergeRecords(schema, keep, others), removeIds: others.map((r) => r.id) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CopyCheck className="w-5 h-5 flex-shrink-0" />
            {t('כפילויות')}
          </DialogTitle>
          <DialogDescription>
            {t('רשומות שנראות כמו אותו דבר — לפי שם מנורמל, אימייל או טלפון. המיזוג שומר את הרשומה שנבחרה ומשלים אליה רק שדות ריקים.')}
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('לא נמצאו כפילויות')}
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const keepId = survivorOf(group);
              return (
                <div key={group[0].id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold">
                      {group.length} {t('רשומות תואמות')}
                    </p>
                    <Button
                      size="sm" variant="outline"
                      className="h-7 rounded-full text-xs gap-1 bg-card"
                      onClick={() => mergeGroup(group)}
                      disabled={merging}
                    >
                      {merging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
                      {t('מיזוג')}
                    </Button>
                  </div>
                  <ul>
                    {group.map((record) => (
                      <li key={record.id} className="border-b border-border last:border-0">
                        <label className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                          <input
                            type="radio"
                            name={`survivor-${group[0].id}`}
                            checked={record.id === keepId}
                            onChange={() => setSurvivors((prev) => ({ ...prev, [group[0].id]: record.id }))}
                            className="mt-1 flex-shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium truncate">
                              {readField({ key: schema.titleField }, record) || '—'}
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate">{preview(record)}</span>
                          </span>
                          {record.id === keepId && (
                            <span className="ms-auto text-[10px] font-semibold text-primary flex-shrink-0">
                              {t('נשמרת')}
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('סגירה')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

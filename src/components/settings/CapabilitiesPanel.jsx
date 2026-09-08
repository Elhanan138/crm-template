import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Loader2, ToggleLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { buildCapabilityCatalogue, ACCESS_LEVELS, SETTINGS_KEY, accessOf } from '@/lib/capabilities';

const CATALOGUE = buildCapabilityCatalogue();

function Segmented({ value, onChange, disabled }) {
  return (
    <div className="flex bg-muted/50 rounded-lg p-0.5 flex-shrink-0">
      {ACCESS_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level.value)}
          className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
            value === level.value
              ? level.value === 'closed'
                ? 'bg-destructive text-destructive-foreground font-semibold'
                : 'bg-card shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

function Row({ item, value, onChange, disabled, muted }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${muted ? 'opacity-50' : ''} hover:bg-muted/30`}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{item.label}</p>
        {item.hint && <p className="text-[11px] text-muted-foreground truncate" dir="auto">{item.hint}</p>}
      </div>
      <Segmented value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function CapabilitiesPanel() {
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: SETTINGS_KEY }),
    staleTime: 30000,
  });

  const values = res?.data?.value || {};

  const invalidate = () => {
    // Navigation, the top bar and the settings tabs all read this key.
    for (const key of ['global-system-features', 'global-tab-visibility']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const setMutation = useMutation({
    mutationFn: ({ key, level }) =>
      api.functions.invoke('globalTabVisibility', {
        action: 'set', settingKey: SETTINGS_KEY, tabId: key, enabled: level,
      }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e?.message || 'העדכון נכשל'),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.functions.invoke('globalTabVisibility', { action: 'reset', settingKey: SETTINGS_KEY }),
    onSuccess: () => { invalidate(); toast.success('הכל הוחזר לפתוח'); },
    onError: (e) => toast.error(e?.message || 'האיפוס נכשל'),
  });

  const closedCount = Object.values(values).filter((v) => v === 'closed').length;

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <ToggleLeft className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold">יכולות המערכת</h3>
              <p className="text-[11px] text-muted-foreground">
                כיבוי מסתיר את היכולת לגמרי — מהתפריט, מהמסלול ומכל מקום שהיא מופיעה בו.
              </p>
            </div>
          </div>
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-shrink-0"
            onClick={() => resetMutation.mutate()} disabled={closedCount === 0 && Object.keys(values).length === 0}
          >
            <RotateCcw className="w-3.5 h-3.5" /> אפס הכל
          </Button>
        </div>
        {closedCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
            {closedCount} יכולות סגורות כרגע.
          </p>
        )}
      </div>

      {CATALOGUE.map((group) => {
        const parentLevel = group.parent ? accessOf(values, group.parent.key) : 'all';
        const parentClosed = parentLevel === 'closed';
        return (
          <section key={group.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="text-xs font-bold text-muted-foreground">{group.label}</h4>
              {group.parent && (
                <Segmented
                  value={parentLevel}
                  onChange={(level) => setMutation.mutate({ key: group.parent.key, level })}
                />
              )}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Row
                  key={item.key}
                  item={item}
                  muted={parentClosed}
                  disabled={parentClosed}
                  value={accessOf(values, item.key)}
                  onChange={(level) => setMutation.mutate({ key: item.key, level })}
                />
              ))}
            </div>
            {parentClosed && (
              <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
                המרחב כולו סגור, ולכן הפריטים שבו מוסתרים בכל מקרה.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

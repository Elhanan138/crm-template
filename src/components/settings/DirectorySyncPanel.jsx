import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, RefreshCw, Loader2, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SectionCard from '@/components/shared/SectionCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { formatDate } from '@/lib/formatDate';

/**
 * Entra ID directory sync panel.
 * Preview shows a diff (matched/new/orphaned/disabled).
 * Apply updates only selected members. New members are created one-by-one.
 */
export default function DirectorySyncPanel() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(null);

  const { data: lastSync } = useQuery({
    queryKey: ['team-members-last-sync'],
    queryFn: async () => {
      const members = await api.entities.TeamMember.list('name');
      const synced = members.filter((m) => m.entra_synced_at);
      if (synced.length === 0) return null;
      return synced.sort((a, b) =>
        new Date(b.entra_synced_at).getTime() - new Date(a.entra_synced_at).getTime()
      )[0]?.entra_synced_at;
    },
  });

  const handlePreview = async () => {
    setLoading(true);
    setSheetOpen(true);
    try {
      const res = await api.functions.invoke('syncDirectory', { action: 'preview' });
      setDiff(res.data);
      setSelected(new Set());
    } catch (e) {
      toast.error('שגיאה בסנכרון דירקטורי');
      setSheetOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInGroup = (items, key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((item) => next.has(item[key]));
      if (allSelected) {
        items.forEach((item) => next.delete(item[key]));
      } else {
        items.forEach((item) => next.add(item[key]));
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (selected.size === 0) return;
    setApplying(true);
    try {
      const res = await api.functions.invoke('syncDirectory', {
        action: 'apply',
        ids: Array.from(selected),
      });
      toast.success(`${res.data?.updated ?? 0} רשומות עודכנו`);
      // Refresh preview
      const preview = await api.functions.invoke('syncDirectory', { action: 'preview' });
      setDiff(preview.data);
      setSelected(new Set());
    } catch (e) {
      toast.error('שגיאה בעדכון רשומות');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateMember = async (entraObjectId) => {
    setCreating(entraObjectId);
    try {
      const res = await api.functions.invoke('syncDirectory', {
        action: 'create',
        entra_object_id: entraObjectId,
      });
      toast.success('איש צוות נוצר');
      // Refresh preview
      const preview = await api.functions.invoke('syncDirectory', { action: 'preview' });
      setDiff(preview.data);
    } catch (e) {
      toast.error('שגיאה ביצירת איש צוות');
    } finally {
      setCreating(null);
    }
  };

  const matched = diff?.matched || [];
  const newUsers = diff?.new || [];
  const orphaned = diff?.orphaned || [];
  const disabled = diff?.disabled || [];

  return (
    <SectionCard
      title="דירקטורי ארגוני"
      icon={Users}
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={handlePreview}
          disabled={loading}
          className="rounded-full h-8 px-3 text-xs gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          סנכרן דירקטורי
        </Button>
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          סנכרון מ-Entra ID (Azure AD) לזיהוי משתתפים לפי מייל וכינויים.
          {lastSync && (
            <span className="block mt-1">
              סנכרון אחרון: {formatDate(lastSync, 'short-padded')}
            </span>
          )}
        </p>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-xl p-0 overflow-hidden flex flex-col">
          <SheetHeader className="px-5 sm:px-6 py-4 border-b border-border text-right shrink-0">
            <SheetTitle className="text-base font-bold">סנכרון דירקטורי</SheetTitle>
            {lastSync && (
              <p className="text-xs text-muted-foreground">
                סנכרון אחרון: {formatDate(lastSync, 'short-padded')}
              </p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : diff ? (
              <Accordion type="multiple" defaultValue={['matched', 'new', 'orphaned', 'disabled']} className="space-y-3">
                {/* Matched */}
                <AccordionItem value="matched" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    <div className="flex items-center gap-2 flex-1">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      זוהו ({matched.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-2">
                    {matched.length > 0 && (
                      <button
                        onClick={() => selectAllInGroup(matched.filter((m) => m.has_updates), 'member_id')}
                        className="text-xs text-primary hover:underline mb-2"
                      >
                        בחר הכל לעדכון
                      </button>
                    )}
                    {matched.filter((m) => m.has_updates).map((m) => (
                      <div key={m.member_id} className="flex items-center gap-2 py-1.5">
                        <Checkbox
                          checked={selected.has(m.member_id)}
                          onCheckedChange={() => toggleSelect(m.member_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground">{m.name}</span>
                          {m.new_aliases?.length > 0 && (
                            <span className="text-xs text-muted-foreground block">
                              כינויים חדשים: {m.new_aliases.join(', ')}
                            </span>
                          )}
                        </div>
                        <StatusBadge label={m.is_admin ? 'אדמין' : 'רגיל'} tone={m.is_admin ? 'accent' : 'neutral'} className="text-[10px]" />
                      </div>
                    ))}
                    {matched.filter((m) => !m.has_updates).length > 0 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        {matched.filter((m) => !m.has_updates).length} ללא שינויים
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* New */}
                <AccordionItem value="new" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    <div className="flex items-center gap-2 flex-1">
                      <UserPlus className="w-4 h-4 text-info flex-shrink-0" />
                      חדשים בדירקטורי ({newUsers.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-2">
                    {newUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">אין משתמשים חדשים</p>
                    ) : (
                      newUsers.map((u) => (
                        <div key={u.entra_object_id} className="flex items-center gap-2 py-1.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-foreground">{u.name}</span>
                            <span className="text-xs text-muted-foreground block" dir="ltr">{u.email}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateMember(u.entra_object_id)}
                            disabled={creating === u.entra_object_id}
                            className="h-7 px-3 text-xs rounded-full gap-1"
                          >
                            {creating === u.entra_object_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserPlus className="w-3 h-3" />
                            )}
                            צור כ-TeamMember
                          </Button>
                        </div>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Orphaned */}
                <AccordionItem value="orphaned" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    <div className="flex items-center gap-2 flex-1">
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      ללא מקבילה בדירקטורי ({orphaned.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-2">
                    {orphaned.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">אין רשומות יתומות</p>
                    ) : (
                      orphaned.map((o) => (
                        <div key={o.member_id} className="flex items-center gap-2 py-1.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-foreground">{o.name}</span>
                            <span className="text-xs text-muted-foreground block" dir="ltr">{o.email}</span>
                          </div>
                          <StatusBadge label="ללא מקבילה" tone="warning" className="text-[10px]" />
                        </div>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Disabled */}
                <AccordionItem value="disabled" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    <div className="flex items-center gap-2 flex-1">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      מנוטרלים ({disabled.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-2">
                    {disabled.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">אין משתמשים מנוטרלים</p>
                    ) : (
                      <>
                        <button
                          onClick={() => selectAllInGroup(disabled, 'member_id')}
                          className="text-xs text-primary hover:underline mb-2"
                        >
                          בחר הכל להשבתה
                        </button>
                        {disabled.map((d) => (
                          <div key={d.member_id} className="flex items-center gap-2 py-1.5">
                            <Checkbox
                              checked={selected.has(d.member_id)}
                              onCheckedChange={() => toggleSelect(d.member_id)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-foreground">{d.name}</span>
                              <span className="text-xs text-muted-foreground block" dir="ltr">{d.email}</span>
                            </div>
                            <StatusBadge label={d.is_admin ? 'אדמין' : 'רגיל'} tone={d.is_admin ? 'accent' : 'neutral'} className="text-[10px]" />
                          </div>
                        ))}
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">לא נטענו נתונים</p>
            )}
          </div>

          {/* Apply bar */}
          {diff && selected.size > 0 && (
            <div className="border-t border-border px-5 sm:px-6 py-3 flex items-center gap-3 shrink-0">
              <span className="text-xs font-medium text-foreground">{selected.size} נבחרו</span>
              <Button
                onClick={handleApply}
                disabled={applying}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 px-5 text-sm font-semibold gap-2 ms-auto"
              >
                {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                עדכן נבחרים
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SectionCard>
  );
}
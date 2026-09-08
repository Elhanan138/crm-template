import React, { useState } from 'react';
import SectionCard from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, FlaskConical, Trash2, Plus, Pencil, Database } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMockFixtures,
  useMockCounts,
  useSeedMockData,
  usePurgeMockData,
  useToggleFixture,
  useUpdateFixture,
  useCreateFixture,
  useDeleteFixture,
} from '@/hooks/useMockFixtures';
import MockFixtureEditSheet from './MockFixtureEditSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_LABELS = {
  calendar_event: 'אירוע יומן',
  attendance: 'נוכחות',
  transcript: 'תמלול',
  directory_user: 'דירקטורי',
};

export default function MockDataPanel({ isAdmin, isLive }) {
  const { data: fixtures = [], isLoading } = useMockFixtures(isAdmin);
  const { data: counts = {} } = useMockCounts(isAdmin);
  const seedMut = useSeedMockData();
  const purgeMut = usePurgeMockData();
  const toggleMut = useToggleFixture();
  const updateMut = useUpdateFixture();
  const createMut = useCreateFixture();
  const deleteMut = useDeleteFixture();
  const [editTarget, setEditTarget] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  const handleSeed = () => {
    seedMut.mutate(undefined, {
      onSuccess: (data) => toast.success(`נוצרו ${data.created} תרחישים${data.skipped ? `, ${data.skipped} כבר קיימים` : ''}`),
      onError: (e) => toast.error(e.message || 'שגיאה ביצירת נתונים'),
    });
  };

  const handlePurge = () => {
    setPurgeOpen(false);
    purgeMut.mutate(undefined, {
      onSuccess: (data) => toast.success(`נמחקו ${data.deleted_events} אירועים, ${data.deleted_logs} תיעודים${data.project_deleted ? ', פרויקט הדגמה נמחק' : ''}`),
      onError: () => toast.error('שגיאה במחיקת נתונים'),
    });
  };

  const handleToggle = (id) => {
    toggleMut.mutate(id, {
      onError: () => toast.error('שגיאה בהחלפת מצב'),
    });
  };

  const handleEditSave = (payload) => {
    const isCreate = !payload.id;
    const mut = isCreate ? createMut : updateMut;
    mut.mutate(payload, {
      onSuccess: () => {
        toast.success(isCreate ? 'תרחיש נוצר' : 'תרחיש עודכן');
        setEditOpen(false);
      },
      onError: () => toast.error('שגיאה בשמירה'),
    });
  };

  const handleDelete = (id) => {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('תרחיש נמחק'),
      onError: () => toast.error('שגיאה במחיקה'),
    });
  };

  if (!isAdmin) return null;

  return (
    <>
      <SectionCard
        title="סביבת בדיקה — נתונים מדומים"
        icon={FlaskConical}
        className="bg-warning-muted border-warning/20"
        actions={
          <div className="flex items-center gap-2 text-caption">
            <Database className="w-3.5 h-3.5" />
            <span>{counts.fixtures ?? 0} תרחישים</span>
            <span>·</span>
            <span>{counts.calendar_events ?? 0} אירועים</span>
          </div>
        }
      >
        <div className="space-y-3">
          {isLive && (
            <p className="text-xs text-warning bg-warning-muted/50 rounded-md px-3 py-2">
              יצירת נתוני בדיקה חסומה במצב Live. עברו למצב Mock כדי להשתמש בתרחישים המדומים.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSeed}
              disabled={isLive || seedMut.isPending}
              size="sm"
              className="rounded-full h-8"
            >
              {seedMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              צור נתוני בדיקה
            </Button>
            <Button
              onClick={() => setPurgeOpen(true)}
              disabled={purgeMut.isPending}
              variant="outline"
              size="sm"
              className="rounded-full h-8 hover:text-destructive"
            >
              {purgeMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              מחק נתוני בדיקה
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-caption">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> טוען תרחישים…
            </div>
          ) : fixtures.length === 0 ? (
            <p className="text-caption py-2">אין תרחישים מוגדרים. לחץ "צור נתוני בדיקה" להתחלה.</p>
          ) : (
            <div className="space-y-1">
              {fixtures.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate" dir="ltr">{f.scenario_key}</span>
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[f.fixture_type] || f.fixture_type}</span>
                      {f.sequence > 0 && (
                        <span className="text-xs text-muted-foreground">seq {f.sequence}</span>
                      )}
                    </div>
                    {f.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{f.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={f.is_active !== false}
                      onCheckedChange={() => handleToggle(f.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      aria-label="עריכה"
                      onClick={() => { setEditTarget(f); setEditOpen(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => { setEditTarget(null); setEditOpen(true); }}
            disabled={isLive}
          >
            <Plus className="w-3.5 h-3.5" /> הוסף תרחיש מותאם
          </Button>
        </div>
      </SectionCard>

      <MockFixtureEditSheet
        fixture={editTarget}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEditSave}
        isSaving={updateMut.isPending || createMut.isPending}
      />

      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת נתוני בדיקה</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את כל האירועים המדומים (is_mock: true), את כל תיעודי הפגישות מפרויקט ההדגמה, ואת פרויקט ההדגמה עצמו. לא ניתן לשחזר.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handlePurge}
            >
              מחק הכל
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
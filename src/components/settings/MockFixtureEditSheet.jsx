import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const FIXTURE_TYPES = [
  { value: 'calendar_event', label: 'אירוע יומן' },
  { value: 'attendance', label: 'נוכחות' },
  { value: 'transcript', label: 'תמלול' },
  { value: 'directory_user', label: 'משתמש דירקטורי' },
];

export default function MockFixtureEditSheet({ fixture, open, onOpenChange, onSave, isSaving }) {
  const { t } = useI18n();
  const isCreate = !fixture?.id;
  const [scenarioKey, setScenarioKey] = useState(fixture?.scenario_key || '');
  const [fixtureType, setFixtureType] = useState(fixture?.fixture_type || 'calendar_event');
  const [sequence, setSequence] = useState(fixture?.sequence ?? 0);
  const [isActive, setIsActive] = useState(fixture?.is_active !== false);
  const [notes, setNotes] = useState(fixture?.notes || '');
  const [payloadText, setPayloadText] = useState(
    fixture?.payload ? JSON.stringify(fixture.payload, null, 2) : '{}'
  );
  const [jsonError, setJsonError] = useState('');

  React.useEffect(() => {
    if (open) {
      setScenarioKey(fixture?.scenario_key || '');
      setFixtureType(fixture?.fixture_type || 'calendar_event');
      setSequence(fixture?.sequence ?? 0);
      setIsActive(fixture?.is_active !== false);
      setNotes(fixture?.notes || '');
      setPayloadText(fixture?.payload ? JSON.stringify(fixture.payload, null, 2) : '{}');
      setJsonError('');
    }
  }, [open, fixture]);

  const handlePayloadChange = (val) => {
    setPayloadText(val);
    try {
      JSON.parse(val);
      setJsonError('');
    } catch (e) {
      setJsonError('JSON לא תקין: ' + e.message);
    }
  };

  const handleSave = () => {
    if (!scenarioKey.trim()) return;
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      setJsonError('JSON לא תקין — לא ניתן לשמור');
      return;
    }
    onSave({
      id: fixture?.id,
      scenario_key: scenarioKey.trim(),
      fixture_type: fixtureType,
      sequence: Number(sequence),
      is_active: isActive,
      notes,
      payload: parsedPayload,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isCreate ? 'תרחיש חדש' : `עריכת: ${fixture?.scenario_key}`}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("מזהה תרחיש")}</Label>
            <Input
              value={scenarioKey}
              onChange={(e) => setScenarioKey(e.target.value)}
              placeholder={t("מזהה באנגלית, במקפים")}
              disabled={!isCreate}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("סוג")}</Label>
            <Select value={fixtureType} onValueChange={setFixtureType} disabled={!isCreate}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIXTURE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            <Label>{t("פעיל")}</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-1.5">
            <Label>Sequence</Label>
            <Input
              type="number"
              min={0}
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("הערות")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payload (JSON)</Label>
            <Textarea
              value={payloadText}
              onChange={(e) => handlePayloadChange(e.target.value)}
              rows={14}
              className="font-mono text-xs resize-y"
              dir="ltr"
            />
            {jsonError && (
              <p className="text-xs text-destructive">{jsonError}</p>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row-reverse gap-2">
          <Button onClick={handleSave} disabled={isSaving || !!jsonError || !scenarioKey.trim()}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            שמור
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, GanttChart } from 'lucide-react';
import TaskChecklist from '@/components/tasks/TaskChecklist';
import DateField from '@/components/ui/date-field';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import Field from '@/components/shared/Field';
import SegmentedField from '@/components/shared/SegmentedField';

// DESIGN_SYSTEM §7: h-10 in a full form.
const CONTROL = 'h-10 rounded-lg border-border bg-background text-sm';

// ─────────────────────────────────────────────────────────────────────────────
// The fields of the task form.
//
// Extracted so that the task sheet and the layout preview render THE SAME code.
// A preview drawn separately drifts from the form the day either one changes,
// and then it is answering the wrong question.
//
// `wrap` is how the preview gets its grip and its drop targets: it receives each
// item and the node for it, and returns whatever it wants around it. The sheet
// passes nothing and gets the plain fields.
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITIES = [
 { id: 'low',   label: 'נמוכה',  dot: 'bg-muted-foreground/40', active: 'bg-muted text-foreground' },
 { id: 'medium',  label: 'בינונית', dot: 'bg-info',          active: 'bg-info-muted text-info' },
 { id: 'high',   label: 'גבוהה',  dot: 'bg-warning',        active: 'bg-warning-muted text-warning' },
 { id: 'urgent',  label: 'דחופה',  dot: 'bg-destructive',      active: 'bg-destructive/10 text-destructive' },
];

const STATUSES = [
 { id: 'not_started', label: 'טרם התחיל', dot: 'bg-muted-foreground' },
 { id: 'in_progress', label: 'בטיפול', dot: 'bg-info' },
 { id: 'stuck',    label: 'תקוע', dot: 'bg-destructive' },
 { id: 'done',    label: 'הושלמה', dot: 'bg-success' },
];

export { PRIORITIES, STATUSES };

// Blocks that need the full width: a title, a checklist, and the segmented
// controls, which cannot fit four options into half a row.
const WIDE = new Set(['title', 'checklist', 'priority', 'status']);

export default function TaskFormFields({
 form, set, layout, customFields = [], isEditing, projectId, allProjects = [], teamMembers = [], wrap,
}) {
 // One entry per block the form can render. Declaring them this way is what
 // lets the stored order rearrange the form without any of them knowing.
 const custom = (field) => (
  <CustomFieldsRenderer
   fields={[field]}
   values={form.custom_fields || {}}
   onChange={v => set('custom_fields', { ...(form.custom_fields || {}), ...v })}
   columns={1}
  />
 );

 const blocks = {
  title: (
   <Field label="כותרת המשימה" required>
    <Input
     value={form.title || ''}
     onChange={e => set('title', e.target.value)}
     className={CONTROL}
    />
   </Field>
  ),
  checklist: isEditing ? (
   <Field label="צ׳קליסט">
    <TaskChecklist items={form.checklist || []} onChange={items => set('checklist', items)} />
   </Field>
  ) : null,
  project_id: (!isEditing && !projectId) ? (
   <Field label="פרויקט">
    <Select value={form.project_id || '__none__'} onValueChange={v => set('project_id', v === '__none__' ? '' : v)}>
     <SelectTrigger className={CONTROL}><SelectValue placeholder="שוטף (ללא פרויקט)"/></SelectTrigger>
     <SelectContent>
      <SelectItem value="__none__">שוטף (ללא פרויקט)</SelectItem>
      {allProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
     </SelectContent>
    </Select>
   </Field>
  ) : null,
  priority: (
   <Field label="עדיפות">
    <SegmentedField
     value={form.priority}
     onChange={v => set('priority', v)}
     options={PRIORITIES}
     ariaLabel="עדיפות"
    />
   </Field>
  ),
  status: (
   <Field label="סטטוס">
    <SegmentedField
     value={form.status}
     onChange={v => set('status', v)}
     options={STATUSES}
     ariaLabel="סטטוס"
    />
   </Field>
  ),
  assigned_to: (
   <Field label="אחראי">
    <Select value={form.assigned_to || '__none__'} onValueChange={v => set('assigned_to', v === '__none__' ? '' : v)}>
     <SelectTrigger className={CONTROL}>
      <User className="w-3.5 h-3.5 flex-shrink-0"/>
      <SelectValue placeholder="ללא אחראי"/>
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="__none__">— ללא אחראי —</SelectItem>
      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
     </SelectContent>
    </Select>
   </Field>
  ),
  due_date: (
   <Field label="תאריך יעד">
    <DateField
     value={form.due_date || ''}
     onChange={v => set('due_date', v)}
     placeholder="ללא תאריך"
     clearable
     className={CONTROL}
    />
   </Field>
  ),
  show_in_gantt: (
   <Field label="גאנט" help="הצגת המשימה בגאנט הפרויקט">
    <button
     type="button"
     onClick={() => set('show_in_gantt', !form.show_in_gantt)}
     aria-pressed={!!form.show_in_gantt}
     className={`flex items-center gap-2 rounded-lg border px-3 h-10 w-full text-sm transition-colors ${form.show_in_gantt ? 'border-primary/40 bg-accent text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
    >
     <GanttChart className="w-3.5 h-3.5 flex-shrink-0"/>
     {form.show_in_gantt ? 'מוצגת בגאנט' : 'לא מוצגת בגאנט'}
    </button>
   </Field>
  ),
  ...Object.fromEntries(customFields.map(field => [field.key, custom(field)])),
 };

 return layout.map((item, index) => {
  const node = blocks[item.key];
  if (!node) return null;
  if (wrap) return wrap({ item, index, wide: WIDE.has(item.key), node });
  return <div key={item.key} className={WIDE.has(item.key) ? 'sm:col-span-2' : ''}>{node}</div>;
 });
}

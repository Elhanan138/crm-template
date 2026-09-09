import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, GanttChart } from 'lucide-react';
import TaskChecklist from '@/components/tasks/TaskChecklist';
import DateField from '@/components/ui/date-field';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';

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
   <Input
    value={form.title || ''}
    onChange={e => set('title', e.target.value)}
    placeholder="כותרת המשימה"
    className="h-11 rounded-xl text-right font-medium"
   />
  ),
  checklist: isEditing ? (
   <TaskChecklist items={form.checklist || []} onChange={items => set('checklist', items)} />
  ) : null,
  project_id: (!isEditing && !projectId) ? (
   <Select value={form.project_id || '__none__'} onValueChange={v => set('project_id', v === '__none__' ? '' : v)}>
    <SelectTrigger className="h-9 rounded-xl text-sm text-right"><SelectValue placeholder="פרויקט"/></SelectTrigger>
    <SelectContent>
     <SelectItem value="__none__">שוטף (ללא פרויקט)</SelectItem>
     {allProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
    </SelectContent>
   </Select>
  ) : null,
  priority: (
   <div className="space-y-1.5">
    <span className="text-[11px] font-medium text-muted-foreground">עדיפות</span>
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
     {PRIORITIES.map(p => {
      const isActive = form.priority === p.id;
      return (
       <button
        key={p.id}
        type="button"
        onClick={() => set('priority', p.id)}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${isActive ? p.active + ' shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/60'}`}
       >
        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
        {p.label}
       </button>
      );
     })}
    </div>
   </div>
  ),
  status: (
   <div className="space-y-1.5">
    <span className="text-[11px] font-medium text-muted-foreground">סטטוס</span>
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
     {STATUSES.map(st => {
      const isActive = form.status === st.id;
      return (
       <button
        key={st.id}
        type="button"
        onClick={() => set('status', st.id)}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/60'}`}
       >
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        {st.label}
       </button>
      );
     })}
    </div>
   </div>
  ),
  details: (
   <div className="flex items-center gap-2 flex-wrap">
    <button
     type="button"
     onClick={() => set('show_in_gantt', !form.show_in_gantt)}
     className={`flex items-center gap-1 rounded-full border h-8 px-2.5 text-xs transition-colors ${form.show_in_gantt ? 'border-primary/40 bg-accent text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}
     title="הצג בגאנט הפרויקט"
    >
     <GanttChart className="w-3.5 h-3.5"/>
     גאנט
    </button>
    <Select value={form.assigned_to || '__none__'} onValueChange={v => set('assigned_to', v === '__none__' ? '' : v)}>
     <SelectTrigger className="h-8 rounded-full text-xs w-fit gap-1.5 px-3">
      <User className="w-3.5 h-3.5"/>
      <SelectValue placeholder="אחראי"/>
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="__none__">— ללא אחראי —</SelectItem>
      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
     </SelectContent>
    </Select>
    <DateField
     value={form.due_date || ''}
     onChange={v => set('due_date', v)}
     placeholder="ללא תאריך"
     clearable
     className="h-8 px-2.5 text-xs w-[150px]"
    />
   </div>
  ),
  ...Object.fromEntries(customFields.map(field => [field.key, custom(field)])),
 };

 return layout.map((item, index) => {
  const node = blocks[item.key];
  if (!node) return null;
  if (wrap) return wrap({ item, index, wide: true, node });
  return <React.Fragment key={item.key}>{node}</React.Fragment>;
 });
}

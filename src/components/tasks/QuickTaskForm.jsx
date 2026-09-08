import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User } from 'lucide-react';
import DateField from '@/components/ui/date-field';
import { toast } from 'sonner';
import { useProjectPeople } from '@/hooks/useProjectPeople';

const PRIORITIES = [
  { id: 'low', label: 'נמוכה', active: 'bg-muted text-foreground border-foreground/30' },
  { id: 'medium', label: 'בינונית', active: 'bg-info-muted text-info border-info/40' },
  { id: 'high', label: 'גבוהה', active: 'bg-warning-muted text-warning border-warning/40' },
  { id: 'urgent', label: 'דחופה', active: 'bg-destructive/10 text-destructive border-destructive/40' },
];

const EMPTY = { title: '', project_id: '', priority: 'medium', due_date: '', assigned_to: '' };

export default function QuickTaskForm({ projects, defaultProjectId, onOpenFullForm }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY, project_id: defaultProjectId || '' });
  const [focused, setFocused] = useState(false);

  const teamMembers = useProjectPeople(form.project_id || defaultProjectId, { includeClient: true });
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });

  const myName = teamMembers.find(m => (m.email || '').toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim())?.name || '';

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const createMutation = useMutation({
    mutationFn: (data) => {
      const project = projects.find(p => p.id === data.project_id);
      return api.entities.Task.create({
        ...data,
        member_emails: project?.member_emails || (currentUser?.email ? [currentUser.email] : []),
        editor_emails: project?.editor_emails || [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasksGlobal'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('משימה נוצרה', { duration: 2000 });
      setForm({ ...EMPTY, project_id: form.project_id });
    },
    // Without this the form silently keeps what you typed and looks like it
    // simply ignored you.
    onError: (e) => toast.error(e?.message || 'יצירת המשימה נכשלה'),
  });

  const submit = () => {
    if (!form.title.trim()) { toast.error('כותרת חובה'); return; }
    const data = { ...form, title: form.title.trim() };
    if (!data.due_date) delete data.due_date;
    if (!data.assigned_to && myName) data.assigned_to = myName;
    if (!data.assigned_to) delete data.assigned_to;
    createMutation.mutate(data);
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-3.5 space-y-3 transition-all">
      {/* Layer 1 — quick create (secondary shortcut) + full-form button (primary) */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[180px]">
          <Input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="הוסף משימה מהירה…"
            className="h-10 rounded-xl text-right border-input bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {focused && (
            <p className="absolute -bottom-4 right-1 text-[10px] text-muted-foreground">Enter ליצירה מהירה</p>
          )}
        </div>
        {!defaultProjectId && (
          <Select value={form.project_id || '__none__'} onValueChange={v => set('project_id', v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-10 rounded-xl text-sm w-full sm:w-48 text-right [&>span]:text-right"><SelectValue placeholder="פרויקט" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">שוטף (ללא פרויקט)</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {onOpenFullForm && (
          <Button onClick={() => form.title.trim() ? submit() : onOpenFullForm?.()} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 px-5 text-sm font-semibold shadow-sm gap-1.5 flex-shrink-0">
            <Plus className="w-4 h-4" />
            משימה חדשה
          </Button>
        )}
      </div>

      {/* Layer 2 — default chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRIORITIES.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => set('priority', p.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${form.priority === p.id ? p.active : 'bg-card text-muted-foreground border-border hover:border-primary/30'}`}
          >
            {p.label}
          </button>
        ))}
        <DateField
          value={form.due_date}
          onChange={v => set('due_date', v)}
          placeholder="ללא תאריך"
          clearable
          className="h-7 px-2 text-xs w-[130px]"
        />
        <Select value={form.assigned_to || '__me__'} onValueChange={v => set('assigned_to', v === '__me__' ? '' : v)}>
          <SelectTrigger className="h-7 rounded-full text-xs w-fit gap-1 px-2.5">
            <User className="w-3 h-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__me__">{myName ? `אני (${myName})` : 'אני'}</SelectItem>
            {teamMembers.filter(m => m.name !== myName).map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Tag, FlaskConical, Key, UserCog, UserCheck, Wrench, Rocket, Flag, Snowflake, BellRing, Eye, EyeOff } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { findMemberByName } from '@/lib/teamLookup';
import { pickFieldIcon } from '@/lib/customFieldIcon';
import { formatDate } from '@/lib/formatDate';

const CHIP = "inline-flex items-center gap-1.5 text-xs font-bold text-foreground leading-none whitespace-nowrap";

const fmtDate = (d) => d ? formatDate(d, 'short-padded') : null;

export default function ProjectInfoCards({ project, teamMembers = [] }) {
 const { data: customFields = [] } = useQuery({
  queryKey: ['customFields', project.id],
  queryFn: () => api.entities.CustomField.filter({ project_id: project.id }),
  enabled: !!project.id,
 });
 const STORAGE_KEY = `projectInfoHidden_${project.id}`;
 const [hidden, setHidden] = useState(() => {
  try {
   const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
   return Array.isArray(saved) ? saved : [];
  } catch { return []; }
 });
 const toggle = (key) => {
  const next = hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key];
  setHidden(next);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
 };

 const durationLabel = project.licensing_duration && project.licensing_duration_unit ?
  `${project.licensing_duration} ${project.licensing_duration_unit === 'years' ? 'שנים' : 'חודשים'}` : null;
 const licStart = fmtDate(project.licensing_start_date);
 const licensingText = licStart ? `${licStart}${durationLabel ? ` (${durationLabel})` : ''}` : durationLabel;

 const renderPersonName = (name, member) => {
  if (!member) return name;
  return (
   <Link
    to={`/profile?memberId=${member.id}`}
    title={`צפה בפרופיל של ${name}`}
    className="hover:text-primary hover:underline transition-colors"
    onClick={(e) => e.stopPropagation()}
   >
    {name}
   </Link>
  );
 };

 // Each item: { key, label, node } — the eye popover toggles them individually
 const items = [];
 if (project.tags?.length > 0) items.push({
  key: 'tags', label: 'תגיות',
  node: project.tags.map(tag => (
   <span key={`tag-${tag}`} className={CHIP}><Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>{tag}</span>
  )),
 });

 if (project.project_manager) {
  const pmMember = findMemberByName(teamMembers, project.project_manager);
  items.push({
   key: 'pm', label: 'מנהל הפרויקט',
   node: <span className={CHIP}><UserCog className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>מנהל הפרויקט: {renderPersonName(project.project_manager, pmMember)}</span>,
  });
 }
 if (project.current_liaison) {
  const liaisonMember = findMemberByName(teamMembers, project.current_liaison);
  items.push({
   key: 'liaison', label: 'מלווה',
   node: <span className={CHIP}><UserCheck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>מלווה: {renderPersonName(project.current_liaison, liaisonMember)}</span>,
  });
 }
 if (project.external_consultants) items.push({
  key: 'consultants', label: 'יועצים חיצוניים',
  node: <span className={CHIP}><CubeIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>יועצים חיצוניים: {project.external_consultants}</span>,
 });
 if (project.has_setup) items.push({
  key: 'setup', label: 'כולל הקמה',
  node: <span className={CHIP}><Wrench className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>כולל הקמה</span>,
 });
 if (project.kickoff_date) items.push({
  key: 'kickoff', label: 'קיקאוף',
  node: <span className={CHIP}><Flag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>קיקאוף: {fmtDate(project.kickoff_date)}</span>,
 });
 if (project.pilot_date) items.push({
  key: 'pilot', label: 'פיילוט',
  node: <span className={CHIP}><FlaskConical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>פיילוט: {project.pilot_date}</span>,
 });
 if (project.go_live_date) items.push({
  key: 'golive', label: 'עלייה לאוויר',
  node: <span className={CHIP}><Rocket className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>עלייה לאוויר: {fmtDate(project.go_live_date)}</span>,
 });
 if (licensingText) items.push({
  key: 'licensing', label: 'רישוי',
  node: <span className={CHIP}><Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>רישוי: {licensingText}</span>,
 });
 if (project.licensing_reminder_date) items.push({
  key: 'reminder', label: 'תזכורת חיוב',
  node: <span className={CHIP}><BellRing className="w-3.5 h-3.5 text-warning flex-shrink-0"/>תזכורת חיוב: {fmtDate(project.licensing_reminder_date)}</span>,
 });
 if (project.frozen_until) items.push({
  key: 'frozen', label: 'הקפאה',
  node: <span className={CHIP}><Snowflake className="w-3.5 h-3.5 text-info flex-shrink-0"/>הקפאה עד: {fmtDate(project.frozen_until)}</span>,
 });

 // Custom fields — merged into the same chip row
 customFields.forEach(field => {
  const Icon = pickFieldIcon(field.label);
  let value = null;
  if (field.value !== undefined && field.value !== null && field.value !== '') {
   if (field.field_type === 'date') {
    const d = new Date(field.value);
    value = isNaN(d) ? field.value : fmtDate(field.value);
   } else if (field.field_type === 'number') {
    const n = Number(field.value);
    value = isNaN(n) ? field.value : n.toLocaleString();
   } else {
    value = field.value;
   }
  }
  items.push({
   key: `cf-${field.id}`,
   label: field.label,
   node: <span className={CHIP}><Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>{value !== null ? `${field.label}: ${value}` : field.label}</span>,
  });
 });

 if (items.length === 0) return null;

 const visible = items.filter(i => !hidden.includes(i.key));

 return (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 justify-start">
   {visible.map(i => <React.Fragment key={i.key}>{i.node}</React.Fragment>)}

   <Popover>
    <PopoverTrigger asChild>
     <button
      title="בחר אילו נתונים יוצגו"
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
     >
      <Eye className="w-3.5 h-3.5"/>
     </button>
    </PopoverTrigger>
    <PopoverContent align="start"className="w-56 p-2 rounded-lg">
     <p className="text-xs font-bold text-foreground px-1.5 pb-1.5 border-b border-border mb-1">נתונים מוצגים</p>
     <div className="max-h-64 overflow-y-auto space-y-0.5">
      {items.map(i => {
       const isHidden = hidden.includes(i.key);
       return (
        <button
         key={i.key}
         onClick={() => toggle(i.key)}
         className="w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded-md hover:bg-muted transition-colors text-right"
        >
         <span className={`text-xs font-medium ${isHidden ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{i.label}</span>
         {isHidden
          ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground"/>
          : <Eye className="w-3.5 h-3.5 text-primary"/>}
        </button>
       );
      })}
     </div>
    </PopoverContent>
   </Popover>
  </div>
 );
}
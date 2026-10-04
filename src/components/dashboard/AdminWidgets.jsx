import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ChevronLeft } from 'lucide-react';
import { NAV_ICONS } from '@/lib/navIcons';
import SupportTypePie from '@/components/support/SupportTypePie';
import { initialsOf, resolveSubmitterName } from '@/lib/userDisplay';

// Kept for the SupportPriority widget (intentionally left in its original design).
const WidgetCard = ({ title, icon: Icon, to, children }) => (
 <div className="bg-card rounded-lg border border-border p-5 shadow-sm h-full flex flex-col">
  <div className="flex items-center justify-between mb-4">
   <div className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
     <Icon className="w-4 h-4 text-primary"/>
    </div>
    <h3 className="text-sm font-bold text-foreground">{title}</h3>
   </div>
   {to && (
    <Link to={to} className="text-xs text-primary hover:underline flex items-center gap-0.5">
     הכל <ChevronLeft className="w-3.5 h-3.5"/>
    </Link>
   )}
  </div>
  <div className="flex-1">{children}</div>
 </div>
);

const Empty = ({ text }) => <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;

/* ---------- Support tickets management with pie chart ---------- */
export function SupportPriority({ tickets }) {
 const { data: teamMembers = [] } = useQuery({
  queryKey: ['allTeamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
 });

 const { data: users = [] } = useQuery({
  queryKey: ['allUsers'],
  queryFn: () => api.entities.User.list(),
 });

 const userImageByEmail = {};
 users.forEach(u => {
  const email = (u.email || '').toLowerCase().trim();
  if (email && u.profile_image_url) userImageByEmail[email] = u.profile_image_url;
 });

 const openTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'on_hold');
 const highPriority = openTickets
  .filter(t => t.priority === 'high' || t.type === 'bug')
  .sort((a, b) => (a.type === 'bug' ? -1 : 1))
  .slice(0, 5);
 const total = openTickets.length;

 return (
  <WidgetCard title="ניהול פניות תמיכה — תעדוף גבוה"icon={NAV_ICONS.support} to="/support">
   {total === 0 ? <Empty text="אין פניות תמיכה פתוחות ✓"/> : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     {/* Pie */}
     <SupportTypePie tickets={tickets} />
     {/* High priority list */}
     <div>
      <p className="text-[11px] font-semibold text-muted-foreground mb-2">דורשות טיפול מיידי</p>
      {highPriority.length === 0 ? (
       <p className="text-xs text-muted-foreground py-4 text-center">אין פניות בתעדוף גבוה</p>
      ) : (
       <div className="space-y-2">
        {highPriority.map(t => {
         const submitterName = resolveSubmitterName(t, teamMembers);
         const initials = initialsOf(submitterName);
         const avatarUrl = userImageByEmail[(t.submitted_by_email || '').toLowerCase().trim()];
         return (
          <Link key={t.id} to={`/support?ticket=${t.id}`} className="block rounded-lg border border-border px-2.5 py-2 hover:border-primary/30 hover:bg-muted/30 transition-all">
           <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.type === 'bug' ? 'bg-destructive/10 text-destructive' : 'bg-warning-muted text-warning'}`}>
             {t.type === 'bug' ? 'תקלה' : 'דחוף'}
            </span>
            <span className="text-xs font-medium text-foreground truncate flex-1">{t.title}</span>
           </div>
           <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
             {avatarUrl ? (
              <img src={avatarUrl} alt={submitterName} className="w-full h-full object-cover"/>
             ) : (
              <span>{initials}</span>
             )}
            </div>
            <span className="text-xs text-muted-foreground truncate">{submitterName || '—'}</span>
           </div>
          </Link>
         );
        })}
       </div>
      )}
     </div>
    </div>
   )}
  </WidgetCard>
 );
}
import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, MessageSquarePlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ADMIN_VIEWS = [
  { key: 'manage', label: 'ניהול', icon: LayoutGrid },
  { key: 'submit', label: 'פנייה', icon: MessageSquarePlus },
];
import { useAccessControl } from '@/hooks/useAccessControl';
import PageHeader from '@/components/shared/PageHeader';
import { NAV_ICONS } from '@/lib/navIcons';
import SupportForm from '@/components/support/SupportForm';
import UserTicketList from '@/components/support/UserTicketList';
import AdminWorkspace from '@/components/support/AdminWorkspace';
import RecentErrors from '@/components/support/RecentErrors';

export default function Support() {
  // 'manage' = ticket workspace · 'sprints' = sprint planning · 'submit' = submission form
  const [adminView, setAdminView] = useState('manage');
  const [searchParams] = useSearchParams();
  const initialTicketId = searchParams.get('ticket');

  const { currentUser: user, isRealAdmin } = useAccessControl();

  // Deep-linking from a ticket notification should land an admin in the management
  // workspace (where the ticket drawer lives), not the submission form.
  useEffect(() => {
    if (initialTicketId && isRealAdmin) setAdminView('manage');
  }, [initialTicketId, isRealAdmin]);

  const myEmail = user?.email || '';

  // Admins load all tickets for the workspace; regular users load only their own.
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['supportTickets'],
    queryFn: () => api.entities.SupportTicket.list('-created_date'),
    enabled: isRealAdmin,
  });

  const { data: myTicketsRaw = [], isLoading: myTicketsLoading } = useQuery({
    queryKey: ['myTickets', myEmail],
    queryFn: () => myEmail ? api.entities.SupportTicket.filter({ submitted_by_email: myEmail }, '-created_date') : [],
    enabled: !!myEmail,
  });

  // Own tickets for the "submit" view — admins see theirs too, not just the workspace
  const myTickets = myTicketsRaw;

  // Admin in workspace mode sees the full Mission Control
  const showWorkspace = isRealAdmin && adminView === 'manage';

  const subtitle = !isRealAdmin
    ? 'הצע שיפורים, דווח על תקלות, עזור לנו להשתפר'
    : adminView === 'submit' ? 'הצע שיפורים, דווח על תקלות, עזור לנו להשתפר'
    : 'מרכז ניהול פניות, תקלות ושיפורים';

  return (
     <div>
       {/* Header */}
       <PageHeader
         icon={NAV_ICONS.support}
         title="תמיכה וייעול"
        subtitle={subtitle}
        actions={isRealAdmin && (
          <>
            {/* Mobile: compact dropdown, consistent with the rest of the app */}
            <div className="sm:hidden w-full">
              <Select value={adminView} onValueChange={setAdminView}>
                <SelectTrigger className="h-10 w-full" aria-label="בחירת תצוגה">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_VIEWS.map(t => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.key} value={t.key}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {t.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {/* Desktop: segmented pills */}
            <div className="hidden sm:flex items-center gap-1 bg-muted/60 rounded-full p-1">
              {ADMIN_VIEWS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setAdminView(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${adminView === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      />

      {showWorkspace ? (
        <AdminWorkspace tickets={tickets} isLoading={isLoading} initialTicketId={initialTicketId} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <SupportForm user={user} />
            </div>
            <div className="lg:col-span-3">
              <UserTicketList tickets={myTickets} isLoading={myTicketsLoading} initialTicketId={initialTicketId} />
            </div>
          </div>
          <RecentErrors />
        </div>
      )}
    </div>
  );
}
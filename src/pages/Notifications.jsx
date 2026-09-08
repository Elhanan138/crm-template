import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import ListSkeleton from '@/components/shared/ListSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/formatDate';
import { useAccessControl } from '@/hooks/useAccessControl';

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { effectiveUser } = useAccessControl();
  const userEmail = effectiveUser?.email;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => api.entities.Notification.filter({ recipient_email: userEmail }, '-created_date'),
    enabled: !!userEmail,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      for (const n of notifications.filter(n => !n.is_read)) {
        await api.entities.Notification.update(n.id, { is_read: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
  });

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read)
    : filter === 'read' ? notifications.filter(n => n.is_read)
    : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4">
      <PageHeader
        icon={Bell}
        title="היסטוריית התראות"
        back
        subtitle={`${notifications.length} התראות סה"כ · ${unreadCount} לא נקראו`}
        actions={
          unreadCount > 0 && (
            <Button onClick={() => markAllReadMutation.mutate()} variant="outline" size="sm" className="rounded-full gap-1.5">
              <Check className="w-3.5 h-3.5" /> סמן הכל כנקרא
            </Button>
          )
        }
      />

      <div className="flex items-center gap-2 mb-4">
        {[
          { k: 'all', label: 'הכל', count: notifications.length },
          { k: 'unread', label: 'לא נקראו', count: unreadCount },
          { k: 'read', label: 'נקראו', count: notifications.length - unreadCount },
        ].map(f => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${filter === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {f.label}
            <span className={`text-[10px] px-1.5 rounded-full ${filter === f.k ? 'bg-card/20' : 'bg-background/60'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="אין התראות"
          description={filter === 'unread' ? "אין התראות שלא נקראו." : filter === 'read' ? "אין התראות שנקראו." : "התראות על אזכורים, תגובות ושינויי סטטוס יופיעו כאן."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${!n.is_read ? 'bg-accent' : 'bg-card border-border'}`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">{n.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{formatDate(n.created_date, 'full-he-time')}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button onClick={() => markReadMutation.mutate(n.id)} className="w-7 h-7 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors" title="סמן כנקרא">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
                <button onClick={() => deleteMutation.mutate(n.id)} className="w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors" title="מחק">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
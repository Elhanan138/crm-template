import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccessControl } from '@/hooks/useAccessControl';
import { User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import ProfilePermissions from '@/components/profile/ProfilePermissions';
import UserReports from '@/components/profile/UserReports';
import { PROFILE_SECTIONS } from '@/components/profile/profileSections';
import ProjectTabNav from '@/components/project/ProjectTabNav';
import IntegrationsTab from '@/components/profile/IntegrationsTab';
import { Suspense } from 'react';
import { optionalComponent } from '@/lib/optionalComponent';
import { useSystemFeature } from '@/hooks/useSystemFeature';

// Compiled out when the email-tracking feature is not part of the build.
const OutboxTab = optionalComponent('email-tracking', 'src/components/profile/OutboxTab.jsx');
import { useOutlookCalendarConfig } from '@/hooks/useOutlookCalendar';

import ViewOnlyProfile from '@/components/profile/ViewOnlyProfile';

import EmptyState from '@/components/shared/EmptyState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import { cleanEmail } from '@/lib/permissions';

export default function Profile() {
  const emailTrackingEnabled = useSystemFeature('email_tracking', 'email-tracking');
  const { effectiveUser, teamMember, isRealAdmin, updateUser } = useAccessControl();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('memberId');

  const { data: outlookConfig = {} } = useOutlookCalendarConfig();
  const outlookEnabled = outlookConfig.enabled === true;
  const visibleSections = PROFILE_SECTIONS.filter(s => {
    if (s.adminOnly && !isRealAdmin) return false;
    if (s.id === 'integrations' && !outlookEnabled) return false;
    return true;
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  // Determine if viewing another member's profile
  const ownMemberId = teamMember?.id;
  const isViewingOther = !!memberId && !!ownMemberId && memberId !== ownMemberId;

  const { data: otherMember, isLoading: loadingOther } = useQuery({
    queryKey: ['teamMember', memberId],
    queryFn: () => api.entities.TeamMember.get(memberId),
    enabled: isViewingOther,
  });

  const name = teamMember?.name || user?.name || user?.full_name || 'משתמש';
  const email = effectiveUser?.email || user?.email || '';
  const roleTitle = teamMember?.role || (isRealAdmin ? 'מנהל מערכת' : 'משתמש');
  const avatarUrl = user?.profile_image_url;

  const handleNameSave = async (newName) => {
    try {
      await api.auth.updateMe({ full_name: newName, name: newName });
      if (teamMember?.id) {
        try {
          await api.entities.TeamMember.update(teamMember.id, { name: newName });
        } catch { /* non-critical */ }
      }
      updateUser({ full_name: newName, name: newName });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('השם עודכן');
    } catch {
      toast.error('שמירת השם נכשלה');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      await api.auth.updateMe({ profile_image_url: file_url });
      // Also sync to TeamMember so it appears in chat avatars, mention pickers, etc.
      if (teamMember?.id) {
        try {
          await api.entities.TeamMember.update(teamMember.id, { photo_url: file_url });
        } catch { /* non-critical */ }
      }
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('תמונת הפרופיל עודכנה');
    } catch {
      toast.error('שגיאה בהעלאת תמונה');
    } finally {
      setUploading(false);
    }
  };

  // ── View another member's profile (admin-only via RLS on TeamMember.get) ──
  if (isViewingOther) {
    if (loadingOther) {
      return (
        <div dir="rtl" className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <PageHeader icon={UserIcon} title="פרופיל עובד" back />
          <div className="mt-4">
            <ListSkeleton count={3} />
          </div>
        </div>
      );
    }

    if (!otherMember) {
      return (
        <div dir="rtl" className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <PageHeader icon={UserIcon} title="פרופיל עובד" back />
          <div className="mt-4">
            <EmptyState icon={UserIcon} title="המשתמש לא נמצא" />
          </div>
        </div>
      );
    }

    const otherName = otherMember.name || 'משתמש';
    const otherEmail = cleanEmail(otherMember.email);

    return (
      <div dir="rtl" className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <PageHeader icon={UserIcon} title={`הפרופיל של ${otherName}`} back />

        <div className="mt-4">
          <ViewOnlyProfile member={otherMember} />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-[1600px] mx-auto px-4 sm:px-6">
      <PageHeader icon={UserIcon} title="הפרופיל שלי" subtitle="פרטי החשבון, ההרשאות והדוחות האישיים שלך" back />

      <div className="mt-4">
        {/* Tab navigation — same pattern as project detail */}
        <ProjectTabNav tabs={visibleSections} activeId={activeSection} onChange={setActiveSection} />

        {/* Content */}
        <main className="min-w-0">
          {activeSection === 'profile' && (
            <ProfileDetails
              name={name}
              email={email}
              roleTitle={roleTitle}
              isRealAdmin={isRealAdmin}
              avatarUrl={avatarUrl}
              uploading={uploading}
              onUploadClick={() => fileInputRef.current?.click()}
              fileInputRef={fileInputRef}
              onImageUpload={handleImageUpload}
              onNameSave={handleNameSave}
            />
          )}
          {activeSection === 'reports' && <UserReports />}
          {activeSection === 'permissions' && <ProfilePermissions />}
          {activeSection === 'integrations' && <IntegrationsTab />}
          {activeSection === 'outbox' && OutboxTab && emailTrackingEnabled && (
            <Suspense fallback={null}><OutboxTab /></Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import PopupContent from '@/components/shared/PopupContent';
import { useAccessControl } from '@/hooks/useAccessControl';

export default function AnnouncementPopupModal() {
  const { currentUser, updateUser } = useAccessControl();
  const [activePopup, setActivePopup] = useState(null);
  const [dismissChecked, setDismissChecked] = useState(false);

  // dismissed_popups is stored on the user entity (synced to backend)
  const dismissedPopups = Array.isArray(currentUser?.dismissed_popups) ? currentUser.dismissed_popups : [];

  const persistDismissal = async (popupId) => {
    if (dismissedPopups.includes(popupId)) return;
    const next = [...dismissedPopups, popupId];
    updateUser({ dismissed_popups: next });
    try {
      await api.auth.updateMe({ dismissed_popups: next });
    } catch (e) { /* silent — state already updated locally */ }
  };

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setDismissChecked(false);
    (async () => {
      try {
        const popups = await api.entities.AnnouncementPopup.list('-created_date', 50);
        const now = new Date();
        const matching = popups.filter(p => {
          if (p.status !== 'active' && !(p.status === 'scheduled' && p.startsAt && new Date(p.startsAt) <= now)) return false;
          if (p.endsAt && new Date(p.endsAt) < now) return false;
          if (p.targetRole === 'admin' && currentUser.role !== 'admin') return false;
          if (p.targetRole === 'user' && currentUser.role === 'admin') return false;
          // Backend-persisted dismissal — reliable across devices/sessions
          if (dismissedPopups.includes(p.id)) return false;
          if (p.frequency === 'once_ever' && localStorage.getItem(`popup_${p.id}_dismissed`)) return false;
          if (p.frequency === 'once_per_session' && sessionStorage.getItem(`popup_${p.id}_seen`)) return false;
          return true;
        });
        if (!cancelled && matching.length > 0) {
          const popup = matching[0];
          setActivePopup(popup);
        }
      } catch (e) { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  const handleClose = () => {
    if (!activePopup) return;
    const { frequency, id, showDismissCheckbox } = activePopup;

    // If checkbox was checked OR frequency is once_ever, persist to backend
    if (showDismissCheckbox && dismissChecked) {
      persistDismissal(id);
    } else if (frequency === 'once_ever') {
      localStorage.setItem(`popup_${id}_dismissed`, Date.now().toString());
      persistDismissal(id);
    } else if (frequency === 'once_per_session') {
      sessionStorage.setItem(`popup_${id}_seen`, Date.now().toString());
    }

    setActivePopup(null);
    setDismissChecked(false);
  };

  const handleCTA = (popup) => {
    if (popup.ctaUrl) window.open(popup.ctaUrl, '_blank');
    handleClose();
  };

  if (!activePopup) return null;

  return (
    <Dialog open={!!activePopup} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogTitle className="sr-only">{activePopup.title}</DialogTitle>
        <PopupContent
          popup={activePopup}
          onCTAClick={handleCTA}
          onDismissChange={setDismissChecked}
        />
      </DialogContent>
    </Dialog>
  );
}
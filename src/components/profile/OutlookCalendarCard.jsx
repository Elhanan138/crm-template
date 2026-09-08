import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOutlookCalendarConfig } from '@/hooks/useOutlookCalendar';
import { OUTLOOK_CONNECTOR_ID } from '@/lib/outlookConnector';

export default function OutlookCalendarCard() {
 const queryClient = useQueryClient();
 const { data: config = {} } = useOutlookCalendarConfig();
 const [connecting, setConnecting] = useState(false);
 const [disconnecting, setDisconnecting] = useState(false);
 const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

 const connected = config.connected;
 const userVisible = config.userVisible !== false;

 const handleConnect = async () => {
  if (OUTLOOK_CONNECTOR_ID === 'REPLACE_WITH_YOUR_OUTLOOK_CONNECTOR_ID') {
   toast.error('Connector ID לא הוגדר. פנה למנהל המערכת.');
   return;
  }
  setConnecting(true);
  try {
   const url = await api.connectors.connectAppUser(OUTLOOK_CONNECTOR_ID);
   const popup = window.open(url, '_blank');
   const timer = setInterval(async () => {
    if (!popup || popup.closed) {
     clearInterval(timer);
     try {
      await api.functions.invoke('fetchOutlookCalendar', {});
      queryClient.invalidateQueries({ queryKey: ['outlook-calendar-config'] });
      queryClient.invalidateQueries({ queryKey: ['outlook-calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['outlook-connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['user-connections-status'] });
      toast.success('החיבור ל-Outlook הושלם בהצלחה');
     } catch {
      queryClient.invalidateQueries({ queryKey: ['outlook-calendar-config'] });
     }
     setConnecting(false);
    }
   }, 500);
  } catch (e) {
   const errMsg = e?.response?.data?.error || e?.message || 'שגיאה בהתחברות ל-Outlook';
   toast.error(errMsg);
   setConnecting(false);
  }
 };

 const handleDisconnect = async () => {
  setDisconnecting(true);
  setShowDisconnectDialog(false);
  try {
   await api.connectors.disconnectAppUser(OUTLOOK_CONNECTOR_ID);
   await api.auth.updateMe({ outlook_connected: false, outlook_connected_at: null });
   queryClient.invalidateQueries({ queryKey: ['outlook-calendar-config'] });
   queryClient.invalidateQueries({ queryKey: ['outlook-calendar-events'] });
   queryClient.invalidateQueries({ queryKey: ['outlook-connection-status'] });
   queryClient.invalidateQueries({ queryKey: ['user-connections-status'] });
   queryClient.invalidateQueries({ queryKey: ['currentUser'] });
   toast.success('החיבור ל-Outlook נותק. היומן שלך לא יוצג יותר במערכת.');
  } catch {
   toast.error('שגיאה בניתוק');
  }
  setDisconnecting(false);
 };

 const handleToggleVisible = async (checked) => {
  try {
   await api.auth.updateMe({ outlook_calendar_visible: checked });
   queryClient.invalidateQueries({ queryKey: ['outlook-calendar-config'] });
   queryClient.invalidateQueries({ queryKey: ['currentUser'] });
   toast.success(checked ? 'אירועי Outlook יוצגו ביומן' : 'אירועי Outlook הוסתרו מהיומן');
  } catch {
   toast.error('שגיאה בעדכון ההגדרה');
  }
 };

 return (
  <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
   <div className="flex items-start gap-4">
    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-info-muted">
     <Calendar className="w-6 h-6 text-info"/>
    </div>
    <div className="flex-1 min-w-0">
     <h3 className="text-base font-bold text-foreground">יומן Outlook</h3>
     <p className="text-sm text-muted-foreground mt-1">
      חבר את יומן Outlook האישי שלך כדי לראות את האירועים שלך לצד אירועי המערכת. קריאה בלבד — {SYSTEM_LABEL} לא משנה או מוחק אירועים ב-Outlook.
     </p>
    </div>
   </div>

   <div className="mt-4 pt-4 border-t border-border">
    {!connected ? (
     <div className="flex flex-col items-center text-center py-4 gap-3">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
       <Mail className="w-5 h-5 text-muted-foreground"/>
      </div>
      <div>
       <p className="text-sm font-semibold text-foreground">לא מחובר</p>
       <p className="text-xs text-muted-foreground mt-0.5">התחבר כדי להציג את אירועי היומן שלך</p>
      </div>
      <Button onClick={handleConnect} disabled={connecting} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm gap-2">
       {connecting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4"/>}
       {connecting ? 'מתחבר...' : 'התחבר ל-Outlook שלי'}
      </Button>
     </div>
    ) : (
     <div className="space-y-4">
      <div className="flex items-center gap-2">
       <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-success-muted text-success border border-success">
        <CheckCircle2 className="w-3 h-3"/> מחובר
       </span>
       <span className="text-caption">היומן שלך מוצג במערכת</span>
      </div>

      <div className="flex items-center justify-between gap-3 py-2">
       <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">הצג את היומן שלי במערכת</p>
        <p className="text-caption">כשכבוי — האירועים מוסתרים מהיומן, אך החיבור נשמר</p>
       </div>
       <Switch checked={userVisible} onCheckedChange={handleToggleVisible} />
      </div>

      <Button variant="outline"onClick={() => setShowDisconnectDialog(true)} disabled={disconnecting} className="rounded-full h-9 px-5 text-sm text-destructive hover:text-destructive hover:bg-destructive/5 gap-2">
       {disconnecting && <Loader2 className="w-4 h-4 animate-spin"/>}
       התנתק
      </Button>
     </div>
    )}
   </div>

   <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
    <AlertDialogContent dir="rtl">
     <AlertDialogHeader>
      <AlertDialogTitle>ניתוק יומן Outlook</AlertDialogTitle>
      <AlertDialogDescription>
       היומן שלך לא יוצג יותר במערכת. אפשר להתחבר מחדש בכל עת.
      </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel className="rounded-full">ביטול</AlertDialogCancel>
      <AlertDialogAction onClick={handleDisconnect} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
       התנתק
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 );
}
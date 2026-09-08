import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { TEAMS_CONNECTOR_ID } from '@/lib/teamsConnector';

export default function TeamsConnectionCard() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [connected, setConnected] = useState(false);

  const isPlaceholder = TEAMS_CONNECTOR_ID === 'REPLACE_WITH_YOUR_TEAMS_CONNECTOR_ID';

  const handleConnect = async () => {
    if (TEAMS_CONNECTOR_ID === 'REPLACE_WITH_YOUR_TEAMS_CONNECTOR_ID') {
      toast.error('Connector ID לא הוגדר. פנה למנהל המערכת.');
      return;
    }
    setConnecting(true);
    try {
      const url = await api.connectors.connectAppUser(TEAMS_CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          try {
            await api.auth.updateMe({ teams_connected: true, teams_connected_at: new Date().toISOString() });
          } catch { /* non-critical */ }
          setConnected(true);
          queryClient.invalidateQueries({ queryKey: ['teams-connection'] });
          queryClient.invalidateQueries({ queryKey: ['user-connections-status'] });
          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          toast.success('החיבור ל-Teams הושלם בהצלחה');
          setConnecting(false);
        }
      }, 500);
    } catch (e) {
      const errMsg = e?.response?.data?.error || e?.message || 'שגיאה בהתחברות ל-Teams';
      toast.error(errMsg);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setShowDisconnectDialog(false);
    try {
      await api.connectors.disconnectAppUser(TEAMS_CONNECTOR_ID);
      await api.auth.updateMe({ teams_connected: false, teams_connected_at: null });
      setConnected(false);
      queryClient.invalidateQueries({ queryKey: ['teams-connection'] });
      queryClient.invalidateQueries({ queryKey: ['user-connections-status'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('החיבור ל-Teams נותק.');
    } catch {
      toast.error('שגיאה בניתוק');
    }
    setDisconnecting(false);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-info-muted">
          <Users className="w-6 h-6 text-info"/>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground">Microsoft Teams</h3>
          <p className="text-sm text-muted-foreground mt-1">
            חבר את חשבון ה-Teams האישי שלך כדי לאפשר תיעוד פגישות, הודעות ושיחות ערוצים ישירות מהמערכת.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        {!connected ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground"/>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">לא מחובר</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPlaceholder ? 'חיבור Teams יהיה זמין לאחר הגדרת הקונקטור על ידי מנהל המערכת' : 'התחבר כדי לאפשר תיעוד פגישות Teams'}
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting || isPlaceholder}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm gap-2"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Users className="w-4 h-4"/>}
              {connecting ? 'מתחבר...' : 'התחבר ל-Teams'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-success-muted text-success border border-success">
                <CheckCircle2 className="w-3 h-3"/> מחובר
              </span>
              <span className="text-caption">חשבון ה-Teams שלך מחובר למערכת</span>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={disconnecting}
              className="rounded-full h-9 px-5 text-sm text-destructive hover:text-destructive hover:bg-destructive/5 gap-2"
            >
              {disconnecting && <Loader2 className="w-4 h-4 animate-spin"/>}
              התנתק
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>ניתוק חיבור Teams</AlertDialogTitle>
            <AlertDialogDescription>
              חשבון ה-Teams שלך ינותק מהמערכת. אפשר להתחבר מחדש בכל עת.
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
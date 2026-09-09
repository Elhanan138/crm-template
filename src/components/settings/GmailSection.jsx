import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, XCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function GmailSection({ status }) {
  const { t } = useI18n();
 const queryClient = useQueryClient();
 const [sending, setSending] = useState(false);
 const connected = status?.connected;

 const sendTestEmail = async () => {
  setSending(true);
  try {
   const user = await api.auth.me();
   await api.functions.invoke('sendGmail', {
    to: user.email,
    subject: `בדיקת חיבור Gmail${APP_IDENTITY.name ? ` — ${APP_IDENTITY.name}` : ''}`,
    body: `זוהי הודעת בדיקה מ${SYSTEM_LABEL}.\n\nאם קיבלת הודעה זו, חיבור ה-Gmail פעיל ותקין.\nכל התראות המערכת יישלחו מכתובת זו מעתה.`,
   });
   toast.success(t("הודעת בדיקה נשלחה לכתובת האימייל שלך"));
  } catch (e) {
   toast.error(t("שליחת אימייל נכשלה. ודא שהחיבור ל-Gmail פעיל."));
  }
  setSending(false);
 };

 return (
  <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
   <div className="flex items-start gap-4">
    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-destructive/10">
     <Mail className="w-6 h-6 text-destructive"/>
    </div>
    <div className="flex-1 min-w-0">
     <div className="flex items-center gap-2 flex-wrap">
      <h3 className="text-base font-bold text-foreground">Gmail</h3>
      {connected ? (
       <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-success-muted text-success border border-success">
        <CheckCircle2 className="w-3 h-3"/> {t("מחובר")}
       </span>
      ) : (
       <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-foreground border border-border">
        <XCircle className="w-3 h-3"/> {t("לא מחובר")}
       </span>
      )}
     </div>
     <p className="text-sm text-muted-foreground mt-1">
      שליחת כל התראות המערכת למשתמשים דרך חשבון Gmail מרכזי
     </p>
    </div>
   </div>

   {connected && (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
     <Button
      size="sm"
      variant="outline"
      onClick={sendTestEmail}
      disabled={sending}
      className="rounded-full h-9 px-4 text-xs gap-1.5"
     >
      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
      שלח אימייל בדיקה
     </Button>
    </div>
   )}


  </div>
 );
}
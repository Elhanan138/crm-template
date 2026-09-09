import React from 'react';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';

export default function UserNotRegisteredError() {
 return (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
   <div className="max-w-sm w-full mx-4 p-8 bg-card rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
     <ShieldX className="w-7 h-7 text-destructive"/>
    </div>
    <h1 className="text-xl font-bold text-foreground mb-3">
     אין לך גישה למערכת
    </h1>
    <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
     לקבלת גישה פנה למנהל המערכת
    </p>
    <Button variant="outline"onClick={() => api.auth.logout()} className="w-full">
     התנתק
    </Button>
   </div>
  </div>
 );
}
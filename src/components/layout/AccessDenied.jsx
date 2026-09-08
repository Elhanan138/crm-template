import React from 'react';
import { ShieldOff } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
 return (
  <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
   <div className="text-center max-w-sm px-6">
    <div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-5">
     <ShieldOff className="w-8 h-8 text-destructive"/>
    </div>
    <h1 className="text-2xl font-bold text-foreground mb-2">אין גישה</h1>
    <p className="text-sm text-muted-foreground mb-6">
     אין לך גישה למערכת. לקבלת גישה פנה למנהל המערכת.
    </p>
    <Button
     onClick={() => api.auth.logout()}
     variant="outline"
     className="rounded-full px-6"
    >
     התנתק
    </Button>
   </div>
  </div>
 );
}
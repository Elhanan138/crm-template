import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProjectDocuments from './ProjectDocuments';

function countDocuments(project) {
 if (!project.document_url) return 0;
 try {
  const parsed = JSON.parse(project.document_url);
  return Array.isArray(parsed) ? parsed.length : 1;
 } catch {
  return 1;
 }
}

export default function DocumentsButton({ project }) {
 const [open, setOpen] = useState(false);
 const count = countDocuments(project);

 return (
  <>
   <Button
    type="button"
    variant="outline"
    size="icon"
    onClick={() => setOpen(true)}
    className="rounded-lg h-9 w-9 relative flex-shrink-0"
     title="מסמכים"
     aria-label="מסמכים"
   >
    <FolderOpen className="w-4 h-4"/>
    {count > 0 && (
     <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold leading-none">
      {count}
     </span>
    )}
   </Button>

   <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="sm:max-w-lg rounded-lg p-0 overflow-hidden">
     <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
      <DialogTitle className="text-base font-bold text-right flex items-center gap-2">
       <FolderOpen className="w-4 h-4 text-primary"/>
       מסמכים
      </DialogTitle>
     </DialogHeader>
     <div className="px-5 pb-5 pt-3">
      <ProjectDocuments project={project} bare />
     </div>
    </DialogContent>
   </Dialog>
  </>
 );
}
import React, { useState, useRef } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, Loader2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import MentionInput from '@/components/project/MentionInput';
import CommentItem from '@/components/tasks/CommentItem';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useProjectPeople } from '@/hooks/useProjectPeople';
import { parseMentions, diffMentions } from '@/lib/mentions';
import { validateImageFiles, extractImagesFromClipboard } from '@/lib/imageAttach';

export default function TaskComments({ task }) {
 const queryClient = useQueryClient();
 const [text, setText] = useState('');
 const [pendingImages, setPendingImages] = useState([]);
 const [uploading, setUploading] = useState(false);
 const [isDragging, setIsDragging] = useState(false);
 const fileInputRef = useRef(null);

 const { data: comments = [] } = useQuery({
  queryKey: ['taskComments', task.id],
  queryFn: () => api.entities.TaskComment.filter({ task_id: task.id, entity_type: 'task' }, 'created_date'),
  enabled: !!task?.id,
 });
 const { data: teamMembers = [] } = useQuery({
  queryKey: ['teamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
 });
 // Project-scoped people — the only source of truth for who can be @-mentioned
 const projectPeople = useProjectPeople(task.project_id);
 const { effectiveUser, isRealAdmin } = useAccessControl();
 const { data: appUsers = [] } = useQuery({
  queryKey: ['appUsers'],
  queryFn: () => api.entities.User.list().catch(() => []),
 });

 const emailToName = Object.fromEntries(
  teamMembers.filter(m => m.email).map(m => [m.email.toLowerCase(), m.name])
 );
 const emailToAvatar = Object.fromEntries(
  appUsers.filter(u => u.email && u.profile_image_url).map(u => [u.email.toLowerCase(), u.profile_image_url])
 );
 const displayName = (c) =>
  emailToName[(c.author_email || '').toLowerCase()] || c.author_name || c.author_email || '';

 const isAdmin = isRealAdmin;
 const effectiveEmail = effectiveUser?.email || '';
 const canManage = (c) => isAdmin || (c.author_email || '').toLowerCase() === effectiveEmail.toLowerCase();

 const invalidate = () => queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });

 const addMutation = useMutation({
  mutationFn: async () => {
   const content = text.trim();
   const myName = emailToName[effectiveEmail.toLowerCase()] || effectiveUser?.full_name || '';
   const mentioned = projectPeople.filter(m => m.email && m.name && content.includes(`@${m.name}`));
   // Enforcement: only allow mentioned_emails that are in the task's member_emails
   const memberEmailSet = new Set((task.member_emails || []).map(e => e.toLowerCase()));
   const safeMentioned = mentioned.filter(m => memberEmailSet.has(m.email.toLowerCase()));
   const comment = await api.entities.TaskComment.create({
    task_id: task.id,
    project_id: task.project_id,
    author_email: effectiveEmail,
    author_name: myName,
    content,
    image_urls: pendingImages,
    mentioned_emails: safeMentioned.map(m => m.email),
    member_emails: task.member_emails || [],
    editor_emails: task.editor_emails || [],
   });
   await Promise.all(
    safeMentioned
     .filter(m => m.email.toLowerCase() !== effectiveEmail.toLowerCase())
     .map(m =>
      api.entities.Notification.create({
       recipient_email: m.email,
       type: 'mention',
       message: `${myName} תייג/ה אותך בתגובה על "${task.title}": ${content}`,
       task_id: task.id,
       project_id: task.project_id,
      }).catch(() => {})
     )
   );
   return comment;
  },
  onMutate: async () => {
   await queryClient.cancelQueries({ queryKey: ['taskComments', task.id] });
   const previous = queryClient.getQueryData(['taskComments', task.id]);
   const tempComment = {
    id: `temp-${Date.now()}`,
    task_id: task.id,
    project_id: task.project_id,
    author_email: effectiveEmail,
    author_name: emailToName[effectiveEmail.toLowerCase()] || effectiveUser?.full_name || '',
    content: text.trim(),
    image_urls: pendingImages,
    mentioned_emails: [],
    created_date: new Date().toISOString(),
   };
   queryClient.setQueryData(['taskComments', task.id], old => [...(old || []), tempComment]);
   return { previous };
  },
  onError: (err, vars, context) => {
   if (context?.previous) queryClient.setQueryData(['taskComments', task.id], context.previous);
   toast.error('שליחת התגובה נכשלה');
  },
  onSuccess: (realComment) => {
   queryClient.setQueryData(['taskComments', task.id], old => {
    const filtered = (old || []).filter(c => !c.id?.startsWith('temp-'));
    return [...filtered, realComment];
   });
   setText('');
   setPendingImages([]);
  },
  onSettled: () => invalidate(),
 });

 const updateMutation = useMutation({
  mutationFn: async ({ id, content, prevMentionedEmails }) => {
   const newMentionNames = parseMentions(content, projectPeople.map(m => m.name).filter(Boolean));
   const memberEmailSet = new Set((task.member_emails || []).map(e => e.toLowerCase()));
   const newMentionedEmails = projectPeople
    .filter(m => m.email && m.name && newMentionNames.includes(m.name))
    .map(m => m.email)
    .filter(e => memberEmailSet.has(e.toLowerCase()));
   const { added } = diffMentions(prevMentionedEmails || [], newMentionedEmails);
   const myName = emailToName[effectiveEmail.toLowerCase()] || effectiveUser?.full_name || '';
   await api.entities.TaskComment.update(id, {
    content,
    edited_at: new Date().toISOString(),
    mentioned_emails: newMentionedEmails,
   });
   await Promise.all(
    added
     .filter(email => email.toLowerCase() !== effectiveEmail.toLowerCase())
     .map(email =>
      api.entities.Notification.create({
       recipient_email: email,
       type: 'mention',
       message: `${myName} תייג/ה אותך בתגובה על "${task.title}": ${content}`,
       task_id: task.id,
       project_id: task.project_id,
      }).catch(() => {})
     )
   );
  },
  onMutate: async ({ id, content }) => {
   await queryClient.cancelQueries({ queryKey: ['taskComments', task.id] });
   const previous = queryClient.getQueryData(['taskComments', task.id]);
   queryClient.setQueryData(['taskComments', task.id], old =>
    (old || []).map(c =>
     c.id === id ? { ...c, content, edited_at: new Date().toISOString() } : c
    )
   );
   return { previous };
  },
  onError: (err, vars, context) => {
   if (context?.previous) queryClient.setQueryData(['taskComments', task.id], context.previous);
   toast.error('עדכון התגובה נכשל');
  },
  onSettled: () => invalidate(),
 });

 const deleteWithUndo = (comment) => {
  const previous = queryClient.getQueryData(['taskComments', task.id]);
  queryClient.setQueryData(['taskComments', task.id], old => (old || []).filter(c => c.id !== comment.id));

  let undone = false;
  toast('תגובה נמחקה', {
   duration: 5000,
   action: {
    label: 'בטל',
    onClick: () => {
     undone = true;
     queryClient.setQueryData(['taskComments', task.id], previous);
     toast.success('המחיקה בוטלה');
    },
   },
  });

  setTimeout(() => {
   if (undone) return;
   api.entities.TaskComment.delete(comment.id)
    .then(() => invalidate())
    .catch(() => {
     queryClient.setQueryData(['taskComments', task.id], previous);
     toast.error('המחיקה נכשלה');
    });
  }, 5000);
 };

 const uploadImages = async (files) => {
  const { valid, errors } = validateImageFiles(files, pendingImages.length);
  errors.forEach(e => toast.error(e));
  if (valid.length === 0) return;
  setUploading(true);
  try {
   const results = await Promise.all(
    valid.map(f => api.integrations.Core.UploadFile({ file: f }))
   );
   setPendingImages(prev => [...prev, ...results.map(r => r.file_url)]);
  } catch {
   toast.error('העלאת התמונה נכשלה');
  } finally {
   setUploading(false);
  }
 };

 const handleImageSelect = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  uploadImages([file]);
 };

 const handlePaste = (e) => {
  const images = extractImagesFromClipboard(e.clipboardData);
  if (images.length > 0) {
   e.preventDefault();
   uploadImages(images);
  }
 };

 const handleDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);
  if (e.dataTransfer.files?.length > 0) {
   uploadImages(Array.from(e.dataTransfer.files));
  }
 };

 const handleDragOver = (e) => {
  e.preventDefault();
  setIsDragging(true);
 };

 const handleDragLeave = (e) => {
  e.preventDefault();
  setIsDragging(false);
 };

 return (
  <div className="space-y-3"dir="rtl">
   <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
    <MessageCircle className="w-4 h-4 text-muted-foreground"/>
    תגובות <span className="text-muted-foreground font-normal">({comments.length})</span>
   </h4>

   {comments.length > 0 && (
    <div className="space-y-2">
     {comments.map(c => (
      <CommentItem
       key={c.id}
       comment={c}
       name={displayName(c)}
       avatarUrl={emailToAvatar[(c.author_email || '').toLowerCase()]}
       canManage={canManage(c)}
       onUpdate={(content) => updateMutation.mutate({ id: c.id, content, prevMentionedEmails: c.mentioned_emails })}
       onDelete={() => deleteWithUndo(c)}
       isSaving={updateMutation.isPending}
       mentionNames={projectPeople.map(m => m.name).filter(Boolean)}
       projectId={task.project_id}
      />
     ))}
    </div>
   )}

   <div
    onPaste={handlePaste}
    onDrop={handleDrop}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    className={`rounded-lg border ${isDragging ? 'border-primary border-2' : 'border-input'} bg-transparent transition-colors`}
   >
    <MentionInput
     value={text}
     onChange={setText}
     placeholder="כתוב תגובה... השתמש ב-@ לתיוג איש צוות"
     className="flex w-full rounded-lg bg-transparent px-3 py-2 text-base md:text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none text-right"
     projectId={task.project_id}
    />
   </div>

   {pendingImages.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
     {pendingImages.map((url, i) => (
      <div key={i} className="relative">
       <img src={url} alt=""className="h-14 w-14 object-cover rounded-lg border border-border"/>
       <button
        type="button"
        onClick={() => setPendingImages(prev => prev.filter((_, x) => x !== i))}
        className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm"
       >
        <X className="w-2.5 h-2.5"/>
       </button>
      </div>
     ))}
    </div>
   )}

   <div className="flex items-center gap-1.5">
    <Button
     size="sm"
     disabled={!text.trim() || addMutation.isPending}
     onClick={() => addMutation.mutate()}
     className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 px-4 text-xs gap-1.5 shadow-none"
    >
     {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
     שלח
    </Button>
    <Button
     size="sm"
     variant="outline"
     disabled={uploading}
     onClick={() => fileInputRef.current?.click()}
     title="צרף תמונה"
     className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-primary"
    >
     {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ImagePlus className="w-3.5 h-3.5"/>}
    </Button>
    <input ref={fileInputRef} type="file"accept="image/*"className="hidden"onChange={handleImageSelect} />
   </div>
  </div>
 );
}
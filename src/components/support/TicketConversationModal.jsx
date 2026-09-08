import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ImagePlus, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TYPE_CONFIG } from './supportConfig';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatDate';
import { toast } from 'sonner';

/**
 * TicketConversationModal — full conversation in a proper modal.
 * Supports image paste (Ctrl+V) and file upload.
 * Uses the replyToTicket backend function so notifications are
 * created with service role (no permission errors for regular users).
 */
export default function TicketConversationModal({ ticket, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['ticket-messages', ticket?.id],
    queryFn: () => api.entities.TicketMessage.filter({ ticket_id: ticket.id }),
    enabled: !!ticket?.id && open,
  });

  useEffect(() => {
    if (!ticket?.id || !open) return;
    const unsubscribe = api.entities.TicketMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
    });
    return unsubscribe;
  }, [ticket?.id, open, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setContent('');
      setImages([]);
    }
  }, [open]);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.functions.invoke('replyToTicket', data);
      return res.data;
    },
    onSuccess: () => {
      setContent('');
      setImages([]);
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
    },
    onError: () => toast.error('שליחת ההודעה נכשלה'),
  });

  const handleSend = () => {
    if (!content.trim() && images.length === 0) return;
    sendMutation.mutate({
      ticket_id: ticket.id,
      content: content.trim(),
      image_urls: images,
    });
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    setUploading(true);
    try {
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        setImages(prev => [...prev, file_url]);
      }
      toast.success('צילום מסך הודבק', { duration: 2000 });
    } catch {
      toast.error('העלאת צילום המסך נכשלה');
    }
    setUploading(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        setImages(prev => [...prev, file_url]);
      }
    } catch {
      toast.error('העלאת התמונה נכשלה');
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  if (!ticket) return null;

  const tc = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
  const Icon = tc.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border text-start flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
              <Icon className={`w-4 h-4 ${tc.color}`} />
            </div>
            <div className="min-w-0 flex-1 pe-6">
              <DialogTitle className="text-card-title truncate text-start">{ticket.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <StatusBadge status={ticket.status} />
                <span className="text-caption">{tc.label}</span>
                {ticket.created_date && (
                  <span className="text-caption">{formatDate(ticket.created_date, 'medium')}</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3 min-h-[250px] max-h-[50vh]">
          {/* Original ticket description as first message */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-lg px-4 py-3 bg-card border border-border">
              <p className="text-[11px] font-semibold mb-1 text-muted-foreground">{ticket.submitted_by || 'משתמש'}</p>
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground [overflow-wrap:anywhere]">{ticket.description}</p>
              {ticket.image_urls?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ticket.image_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-md overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {messages.map((msg) => {
            const isMine = msg.author_email === ticket.submitted_by_email;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2.5 ${isMine ? 'bg-card border border-border' : 'bg-primary text-primary-foreground'}`}>
                  {!isMine && (
                    <p className="text-[11px] font-semibold mb-0.5 opacity-70">{msg.author_name || 'תמיכה'}</p>
                  )}
                  {msg.content && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">{msg.content}</p>}
                  {msg.image_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {msg.image_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-md overflow-hidden border border-border/50">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply form */}
        <div className="border-t border-border p-4 space-y-2 flex-shrink-0">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {images.map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-md overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 end-0.5 w-4 h-4 rounded-full bg-foreground/60 text-background flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="כתוב הודעה... (ניתן להדביק צילומי מסך ישירות)"
              rows={2}
              className="resize-none text-sm min-h-[40px] flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <label className="flex-shrink-0 cursor-pointer">
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
              <span className="w-9 h-9 rounded-lg border border-input flex items-center justify-center hover:bg-muted/30 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
              </span>
            </label>
            <Button
              onClick={handleSend}
              disabled={(!content.trim() && images.length === 0) || sendMutation.isPending || uploading}
              size="icon"
              aria-label="שלח הודעה"
              className="h-9 w-9 rounded-lg flex-shrink-0"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
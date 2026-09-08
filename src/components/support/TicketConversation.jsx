import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ImagePlus, X, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

/**
 * TicketConversation — inline chat between admin and ticket submitter.
 * Uses the replyToTicket backend function so notifications are created
 * with service role (no permission errors for regular users).
 * Supports image paste and file upload.
 */
export default function TicketConversation({ ticket, isAdmin, userEmail, userDisplayName }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['ticket-messages', ticket.id],
    queryFn: () => api.entities.TicketMessage.filter({ ticket_id: ticket.id }),
  });

  useEffect(() => {
    const unsubscribe = api.entities.TicketMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
    });
    return unsubscribe;
  }, [ticket.id, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

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

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">התכתבות</span>
      </div>

      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          {messages.map((msg) => {
            const isMine = msg.author_email === userEmail;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                  {!isMine && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.author_name || 'משתמש'}</p>
                  )}
                  {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                  {msg.image_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {msg.image_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 rounded-md overflow-hidden border border-border/50">
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
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((url, i) => (
            <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden border border-border">
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
          placeholder="כתוב הודעה... (ניתן להדביק צילומי מסך)"
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
  );
}
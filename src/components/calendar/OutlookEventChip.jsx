import React from 'react';
import { Link } from 'react-router-dom';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Mail, Clock, Users, MapPin, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatDate } from '@/lib/formatDate';
import { eventTone, TONE_CHIP_CLASSES, TONE_BADGE_CLASSES } from '@/lib/calendarEventTypes';

const fmtTime = (iso) => {
  if (!iso) return '';
  try { return format(parseISO(iso), 'HH:mm'); } catch { return ''; }
};

function EventDetails({ data, title }) {
  const rawAttendees = data.attendees || [];
  const attendeeNames = rawAttendees.map((a) =>
    typeof a === 'string' ? a : (a.name || a.email)
  ).filter(Boolean);
  return (
    <div className="space-y-2 min-w-[220px]">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Mail className="w-3.5 h-3.5" />
        <span>אירוע Outlook</span>
      </div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <div className="flex items-center gap-1.5 text-caption">
        <Clock className="w-3.5 h-3.5" />
        <span dir="ltr">{fmtTime(data.start)} — {fmtTime(data.end)}</span>
      </div>
      {data.location && (
        <div className="flex items-center gap-1.5 text-caption">
          <MapPin className="w-3.5 h-3.5" />
          <span>{data.location}</span>
        </div>
      )}
      {attendeeNames.length > 0 && (
        <div className="flex items-start gap-1.5 text-caption">
          <Users className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{attendeeNames.join(', ')}</span>
        </div>
      )}
      {data.project_id && (
        <Link
          to={`/projects/${data.project_id}`}
          className="flex items-center gap-1 text-xs text-primary hover:underline pt-1.5 border-t border-border font-semibold"
        >
          <span>פתח פרויקט</span>
          <ArrowLeft className="w-3 h-3" />
        </Link>
      )}
      {!data.project_id && (
        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">אירוע ללא פרויקט משויך</p>
      )}
    </div>
  );
}

export default function OutlookEventChip({ e, showDate = false, variant = 'chip' }) {
  const data = e.outlookData || {};
  const tone = eventTone('outlook');
  const chipClasses = TONE_CHIP_CLASSES[tone];
  const badgeClasses = TONE_BADGE_CLASSES[tone];

  if (variant === 'agenda') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors w-full text-right">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${chipClasses}`}>
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{e.title}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{formatDate(e.date, 'day-full')}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeClasses}`}>Outlook</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-4">
          <EventDetails data={data} title={e.title} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-start gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${chipClasses} hover:opacity-80 transition-opacity w-full h-full text-right`}>
          <Mail className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-tight flex-1">{e.title}</span>
          {showDate && <span className="text-[10px] opacity-70 flex-shrink-0 mt-0.5 font-semibold">{formatDate(e.date, 'day-month-padded')}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-4">
        <EventDetails data={data} title={e.title} />
      </PopoverContent>
    </Popover>
  );
}
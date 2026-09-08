import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDate } from '@/lib/formatDate';
import {
  HOUR_START, HOUR_END, ROW_HEIGHT,
  TimeAxisColumn, HourGridLines, CurrentTimeLine, eventHourDecimal,
  eventEndHourDecimal,
} from '@/components/calendar/TimeAxisGrid';

/**
 * Bottom sheet showing all events for a given day in an Outlook-style hour grid.
 * Timed events are positioned by start hour; date-only events shown at bottom.
 */
export default function DaySheet({ open, onOpenChange, date, events, renderEvent }) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [events]);

  const timedEvents = sortedEvents.filter((e) => eventHourDecimal(e) !== null);
  const allDayEvents = sortedEvents.filter((e) => eventHourDecimal(e) === null);
  const gridHeight = (HOUR_END - HOUR_START + 1) * ROW_HEIGHT;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] flex flex-col p-0">
        <SheetHeader className="px-5 py-3.5 border-b border-border text-right">
          <SheetTitle className="text-card-title text-right">
            {date ? formatDate(date, 'day-full') : ''}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין אירועים ביום זה</p>
          ) : (
            <div className="flex gap-1 px-3 py-3">
              <TimeAxisColumn />
              <div className="flex-1 relative" style={{ height: gridHeight }}>
                <HourGridLines />
                <CurrentTimeLine />
                {timedEvents.map((e, i) => {
                  const hourDec = eventHourDecimal(e);
                  const endDec = eventEndHourDecimal(e);
                  const top = Math.max(0, (hourDec - HOUR_START) * ROW_HEIGHT);
                  const height = Math.max(ROW_HEIGHT * 0.5, (endDec - hourDec) * ROW_HEIGHT);
                  return (
                    <div key={i} className="absolute left-1 right-1 z-10 overflow-hidden" style={{ top, height }}>
                      {renderEvent(e, i)}
                    </div>
                  );
                })}
                {allDayEvents.length > 0 && (
                  <div className="absolute left-1 right-1 bottom-0 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">כל היום</p>
                    {allDayEvents.map((e, i) => (
                      <div key={i}>{renderEvent(e, i)}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
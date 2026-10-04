import React, { useState, useEffect } from 'react';

export const HOUR_START = 8;
export const HOUR_END = 17;
export const ROW_HEIGHT = 56; // px per hour

/**
 * Parse an event's time string (e.g. "09:30") or outlookData datetime
 * into a decimal hour (e.g. 9.5).
 */
export function eventHourDecimal(e) {
  let timeStr = e.time;
  if (!timeStr && e.outlookData?.start) {
    const d = new Date(e.outlookData.start);
    if (!isNaN(d.getTime())) {
      return d.getHours() + d.getMinutes() / 60;
    }
  }
  if (!timeStr) return null;
  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

/**
 * Parse an event's end time into a decimal hour.
 * Outlook events use outlookData.end; others default to start + 1 hour.
 */
export function eventEndHourDecimal(e) {
  if (e.outlookData?.end) {
    const d = new Date(e.outlookData.end);
    if (!isNaN(d.getTime())) {
      return d.getHours() + d.getMinutes() / 60;
    }
  }
  const start = eventHourDecimal(e);
  return start !== null ? start + 1 : null;
}

/**
 * Current time as a decimal hour.
 */
function nowHourDecimal() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

/**
 * Hook: returns the current hour decimal, updated every 60 seconds.
 */
export function useCurrentTime() {
  const [now, setNow] = useState(nowHourDecimal);
  useEffect(() => {
    const id = setInterval(() => setNow(nowHourDecimal()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Vertical column of hour labels: 8, 9, ..., 17.
 * Designed to sit on the left (in RTL = visual left = DOM start).
 */
export function TimeAxisColumn({ hourStart = HOUR_START, hourEnd = HOUR_END, rowHeight = ROW_HEIGHT }) {
  const hours = [];
  for (let h = hourStart; h <= hourEnd; h++) hours.push(h);
  return (
    <div className="flex-shrink-0 w-12 sm:w-14 border-l border-border bg-card">
      {hours.map((h) => (
        <div
          key={h}
          className="relative text-caption text-muted-foreground text-center"
          style={{ height: rowHeight }}
        >
          <span className="absolute -translate-y-1/2 top-1/2 left-0 right-0">
            {h}:00
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal grid lines layer — one line per hour.
 * Rendered absolutely behind event chips.
 */
export function HourGridLines({ hourStart = HOUR_START, hourEnd = HOUR_END, rowHeight = ROW_HEIGHT }) {
  const lines = [];
  for (let h = hourStart; h <= hourEnd; h++) {
    lines.push(
      <div
        key={h}
        className="absolute left-0 right-0 border-t border-border/60"
        style={{ top: (h - hourStart) * rowHeight }}
      />
    );
  }
  return <div className="absolute inset-0 pointer-events-none">{lines}</div>;
}

/**
 * Current time indicator — a dashed line at the current time height.
 * Hidden when the current time is outside the hour range.
 */
export function CurrentTimeLine({ hourStart = HOUR_START, hourEnd = HOUR_END, rowHeight = ROW_HEIGHT }) {
  const now = useCurrentTime();
  if (now < hourStart || now > hourEnd + 1) return null;
  const top = (now - hourStart) * rowHeight;
  return (
    <div
      className="absolute left-0 right-0 border-t-2 border-dashed border-primary pointer-events-none z-10"
      style={{ top }}
    >
      <span className="absolute -translate-y-1/2 -left-1 top-1/2 w-2 h-2 rounded-full bg-primary" />
    </div>
  );
}
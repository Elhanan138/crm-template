// Canonical table styling shared across the whole system, so every table row
// looks identical everywhere. Import these instead of re-defining classes.

export const TABLE = "w-full text-sm";
export const THEAD_ROW = "border-b border-border";
export const TH = "text-right text-xs font-semibold text-muted-foreground py-3 px-4";
export const TH_CENTER = "text-center text-xs font-semibold text-muted-foreground py-3 px-4";

// Row: same height, same border, same hover everywhere.
export const TR = "border-b border-border last:border-0 transition-colors hover:bg-muted/30";
export const TR_CLICKABLE = `${TR} cursor-pointer`;
export const TD = "py-3 px-4 align-middle";
export const TD_MUTED = "py-3 px-4 align-middle text-muted-foreground";

// Canonical "row card" — for card-style lists (tasks, quotes, gantt, tickets)
// that aren't <table>s. Same container, border, radius, shadow & hover everywhere.
export const ROW_CARD = "bg-card rounded-lg border border-border shadow-sm p-4 transition-colors hover:bg-muted/20";
export const ROW_CARD_CLICKABLE = `${ROW_CARD} cursor-pointer`;
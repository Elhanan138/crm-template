import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"
import { he } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// ── Custom caption: single row with month + year dropdowns + nav buttons ──
function CustomCaption({ displayMonth }) {
 const { goToMonth } = useNavigation();
 const { fromYear, toYear } = useDayPicker();

 const year = displayMonth.getFullYear();
 const month = displayMonth.getMonth();

 const startYear = fromYear || 2020;
 const endYear = toYear || new Date().getFullYear() + 5;
 const years = [];
 for (let y = startYear; y <= endYear; y++) years.push(y);

 const monthNames = [];
 for (let m = 0; m < 12; m++) {
  monthNames.push(format(new Date(2024, m, 1), "MMMM", { locale: he }));
 }

 return (
  <div className="flex justify-center items-center gap-2 pt-1 relative h-9">
   {/* RTL: previous (past) button on the right, arrow points right */}
   <button
    type="button"
    onClick={() => goToMonth(new Date(year, month - 1, 1))}
    className={cn(
     buttonVariants({ variant: "outline"}),
     "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute start-1"
    )}
   >
    <ChevronRight className="h-4 w-4"/>
   </button>

   <select
    value={month}
    onChange={(e) => goToMonth(new Date(year, parseInt(e.target.value, 10), 1))}
    className="bg-transparent text-sm font-bold text-foreground cursor-pointer border border-transparent rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring hover:bg-accent"
   >
    {monthNames.map((name, i) => (
     <option key={i} value={i}>{name}</option>
    ))}
   </select>

   <select
    value={year}
    onChange={(e) => goToMonth(new Date(parseInt(e.target.value, 10), month, 1))}
    className="bg-transparent text-sm font-bold text-foreground cursor-pointer border border-transparent rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring hover:bg-accent"
   >
    {years.map((y) => (
     <option key={y} value={y}>{y}</option>
    ))}
   </select>

   {/* RTL: next (future) button on the left, arrow points left */}
   <button
    type="button"
    onClick={() => goToMonth(new Date(year, month + 1, 1))}
    className={cn(
     buttonVariants({ variant: "outline"}),
     "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
    )}
   >
    <ChevronLeft className="h-4 w-4"/>
   </button>
  </div>
 );
}

function Calendar({
 className,
 classNames,
 showOutsideDays = true,
 ...props
}) {
 return (
  (<DayPicker
   showOutsideDays={showOutsideDays}
   locale={he}
   weekStartsOn={0}
   fromYear={2020}
   toYear={new Date().getFullYear() + 5}
   formatters={{
    formatWeekdayName: (date) => format(date, "EEEEEE", { locale: he }),
    formatDay: (date) => format(date, "d", { locale: he }),
   }}
   className={cn("p-3", className)}
   classNames={{
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-bold text-foreground",
    caption_dropdowns: "flex gap-2 items-center",
    dropdown:
     "bg-transparent text-sm font-bold text-foreground cursor-pointer border border-transparent rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring hover:bg-accent",
    dropdown_month: "relative",
    dropdown_year: "relative",
    vhidden: "hidden",
    nav: "space-x-1 flex items-center",
    nav_button: cn(
     buttonVariants({ variant: "outline"}),
     "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
    ),
    // RTL: previous month on the right, next month on the left
    nav_button_previous: "absolute right-1",
    nav_button_next: "absolute left-1",
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell:
     "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
    row: "flex w-full mt-2",
    cell: cn(
     "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
     props.mode === "range"
      ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
      : "[&:has([aria-selected])]:rounded-md"
    ),
    day: cn(
     buttonVariants({ variant: "ghost"}),
     "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
    ),
    day_range_start: "day-range-start",
    day_range_end: "day-range-end",
    day_selected:
     "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
    day_today: "ring-1 ring-primary text-primary",
    day_outside:
     "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
    day_disabled: "text-muted-foreground opacity-50",
    day_range_middle:
     "aria-selected:bg-accent aria-selected:text-accent-foreground",
    day_hidden: "invisible",
    ...classNames,
   }}
   components={{
    Caption: CustomCaption,
    // Suppress default Nav — our CustomCaption renders its own nav buttons
    Nav: () => null,
    // RTL: previous (past) button shows a left-pointing chevron (rotated 180°),
    // next (future) button shows a right-pointing chevron (rotated 180°).
    IconLeft: ({ className, ...props }) => (
     <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
    ),
    IconRight: ({ className, ...props }) => (
     <ChevronRight className={cn("h-4 w-4", className)} {...props} />
    ),
   }}
   {...props} />)
 );
}
Calendar.displayName = "Calendar"

export { Calendar }
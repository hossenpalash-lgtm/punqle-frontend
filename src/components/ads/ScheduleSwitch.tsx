import { CalendarClock, Clock, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { MAX_SCHEDULE_DAYS, MIN_SCHEDULE_MINUTES, formatScheduleDate, toDatetimeLocalMin } from "@/lib/schedule-dates";

// "Post now | Schedule" switch plus a "When" card, shared by the TikTok and YouTube panels so they look like the Facebook/Instagram
// one (founder, 2026-11-10: colourful, easy to read at a glance). `lines` = one short line per platform saying what will happen.
export function ScheduleSwitch({
  scheduling,
  onScheduling,
  scheduledAt,
  onScheduledAt,
  lines,
}: {
  scheduling: boolean;
  onScheduling: (v: boolean) => void;
  scheduledAt: string;
  onScheduledAt: (v: string) => void;
  lines?: ReactNode;
}) {
  return (
    <div className="mb-3 space-y-3">
      <div className="flex rounded-full bg-secondary p-1" role="tablist" aria-label="When to post">
        <button
          role="tab"
          aria-selected={!scheduling}
          onClick={() => onScheduling(false)}
          className={["flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-2 text-sm font-semibold transition-colors", !scheduling ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"].join(" ")}
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Post now
        </button>
        <button
          role="tab"
          aria-selected={scheduling}
          onClick={() => {
            onScheduling(true);
            if (!scheduledAt) onScheduledAt(toDatetimeLocalMin(MIN_SCHEDULE_MINUTES));
          }}
          className={["flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-2 text-sm font-semibold transition-colors", scheduling ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"].join(" ")}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Schedule
        </button>
      </div>
      {scheduling && (
        <div className="rounded-2xl bg-secondary p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            When
          </p>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={toDatetimeLocalMin(MIN_SCHEDULE_MINUTES)}
            max={toDatetimeLocalMin(MAX_SCHEDULE_DAYS * 24 * 60)}
            onChange={(e) => onScheduledAt(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {scheduledAt && <p className="mt-2 font-display text-[15px] font-extrabold text-foreground">{formatScheduleDate(new Date(scheduledAt))}</p>}
          {lines && <div className="mt-2.5 space-y-1.5 text-[13px] text-foreground">{lines}</div>}
        </div>
      )}
    </div>
  );
}

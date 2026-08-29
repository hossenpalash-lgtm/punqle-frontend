// Bounds mirror the backend's own validation (_parse_scheduled_time,
// main.py) — shown here too so a bad pick is caught before the request,
// not just after a 400 comes back.
export const MIN_SCHEDULE_MINUTES = 10;
export const MAX_SCHEDULE_DAYS = 30;

export function toDatetimeLocalMin(minutesFromNow: number): string {
  return toDatetimeLocalValue(new Date(Date.now() + minutesFromNow * 60_000));
}

// Converts any Date/ISO instant to the "YYYY-MM-DDTHH:mm" shape a
// <input type="datetime-local"> expects, in the viewer's local time.
export function toDatetimeLocalValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function formatScheduleDate(d: Date): string {
  const datePart = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

// Monday-anchored — matches Weekly Plan's own Mon..Fri convention, and
// Business Suite's own Planner (which we found unreliable for verifying
// scheduled posts, but whose week layout is still a sane one to mirror).
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // roll Sunday back to the prior Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

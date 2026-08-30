/**
 * Small date/time helpers shared by availability + booking logic.
 *
 * KNOWN SIMPLIFICATION: times are treated as the server's local timezone.
 * A real multi-region deployment should store an explicit `timezone` field
 * on the Hospital model and convert with a library like luxon/date-fns-tz -
 * flagged here rather than silently assumed.
 */

// "HH:mm" -> minutes since midnight
export function timeToMinutes(time: string): number {
    const [h,m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2,'0');
    const m = (minutes % 60).toString().padStart(2,'0');
    return `${h}:${m}`;
}

// Combines a calander date(YYYY-MM-DD) with a "HH:mm" time into one Date.
export function combineDateAndTime(dateStr: string, time: string): Date {
    const [h,m] = time.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(h, m, 0, 0);
    return date;
}

// Midnight of the given date (for grouping/lookups by day).
export function startOfDay(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay(); // 0 = Sunday ... 6 = Saturday
}

// Generates slot start times ("HH:mm") between start/end at the given
// interval, e.g. ("09:00","13:00",15) -> ["09:00","09:15",...,"12:45"]
export function generateSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  let cursor = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  while (cursor + durationMinutes <= end) {
    slots.push(minutesToTime(cursor));
    cursor += durationMinutes;
  }
  return slots;
}

// Minimal relative-time formatter. The app has no date library dependency
// (checked package.json before adding this — Task 20), so this stays
// hand-rolled rather than pulling in date-fns/dayjs for one helper.
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - target.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const units: Array<[string, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [label, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) return `${value} ${label}${value === 1 ? "" : "s"} ago`;
  }

  return "just now";
}

export function calculateAttendancePercentage(records: { status: string }[]): number {
  if (records.length === 0) return 0;
  const attended = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  return Math.round((attended / records.length) * 100);
}

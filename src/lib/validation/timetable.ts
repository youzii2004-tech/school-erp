import { z } from "zod";

export const timetableEntrySchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().optional(),
});

// "HH:MM" is zero-padded 24h, so plain string comparison sorts/compares exactly
// like the equivalent minute-of-day numbers would. Two half-open ranges [s1,e1)
// and [s2,e2) overlap iff each range's start is before the other's end — this is
// the standard interval-overlap test, written as a named helper (rather than
// inlined at each call site) specifically because the brief flagged this as the
// one piece of Task 19 logic that's easy to get backwards.
export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

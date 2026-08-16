import { z } from "zod";

export const attendanceBulkSchema = z.object({
  date: z.coerce.date(),
  sectionId: z.string().min(1),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
    remarks: z.string().optional(),
  })).min(1),
});

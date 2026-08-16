import { z } from "zod";

export const sessionSchema = z.object({
  name: z.string().min(4),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

export const classSchema = z.object({
  name: z.string().min(1),
  sessionId: z.string().min(1),
});

export const sectionSchema = z.object({
  name: z.string().min(1),
  classId: z.string().min(1),
});

export const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

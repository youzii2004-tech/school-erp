import { z } from "zod";

export const examCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MIDTERM", "FINAL", "MONTHLY", "QUIZ", "CLASS_TEST"]),
  academicSessionId: z.string().min(1),
});

export const examSubjectCreateSchema = z.object({
  examinationId: z.string().min(1),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  totalMarks: z.coerce.number().positive(),
  passingMarks: z.coerce.number().positive(),
  examDate: z.coerce.date(),
});

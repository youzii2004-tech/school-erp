import { z } from "zod";

export const teacherCreateSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  cnic: z.string().optional(),
  qualification: z.string().optional(),
  joiningDate: z.coerce.date().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
});

export const teacherUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  cnic: z.string().optional(),
  qualification: z.string().optional(),
  joiningDate: z.coerce.date().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
});

export const teacherAssignSchema = z.object({
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
});

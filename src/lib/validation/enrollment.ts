import { z } from "zod";

export const enrollmentCreateSchema = z.object({
  studentId: z.string().min(1),
  academicSessionId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().min(1),
});

export const guardianCreateSchema = z.object({
  fullName: z.string().min(1),
  relation: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
});

// GuardianLink's own fields (prisma/schema.prisma): studentId (from route param),
// guardianId (body), userId (optional, only set when a Parent portal login exists —
// not applicable to this simple link-by-admin flow).
export const guardianLinkSchema = z.object({
  guardianId: z.string().min(1),
});

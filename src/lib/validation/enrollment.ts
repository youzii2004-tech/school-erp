import { z } from "zod";

export const enrollmentCreateSchema = z.object({
  studentId: z.string().min(1),
  academicSessionId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().min(1),
});

// Task 21: bulk class promotion. fromSectionId identifies the roster's current
// section (its session is read off each student's own ACTIVE enrollment there,
// not passed separately — see src/app/api/promotions/route.ts).
export const promotionCreateSchema = z.object({
  fromSectionId: z.string().min(1),
  toClassId: z.string().min(1),
  toSectionId: z.string().min(1),
  toAcademicSessionId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1),
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

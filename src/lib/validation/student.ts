import { z } from "zod";

export const studentCreateSchema = z.object({
  admissionNumber: z.string().min(1),
  fullName: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.coerce.date(),
  cnicOrBForm: z.string().optional(),
  bloodGroup: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "LEFT", "GRADUATED"]).optional(),
});

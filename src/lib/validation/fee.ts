import { z } from "zod";

export const feeStructureSchema = z.object({
  classId: z.string().min(1),
  category: z.enum(["TUITION", "ADMISSION", "EXAM", "TRANSPORT", "COMPUTER", "LIBRARY", "ACTIVITY", "OTHER"]),
  amount: z.coerce.number().positive(),
  frequency: z.enum(["MONTHLY", "ONE_TIME", "ANNUAL"]),
});

export const feeVoucherCreateSchema = z.object({
  studentId: z.string().min(1),
  academicSessionId: z.string().min(1),
  billingMonth: z.string().min(4),
  dueDate: z.coerce.date(),
  discount: z.coerce.number().min(0).default(0),
  fine: z.coerce.number().min(0).default(0),
});

export const feePaymentSchema = z.object({
  voucherId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"]),
  reference: z.string().optional(),
});

import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { feeStructureSchema } from "@/lib/validation/fee";

// FeeStructure has no `name` field (Task 4's default orderBy is { name: "asc" }),
// so an explicit orderBy is required here.
export const { GET, POST } = makeCrudRoutes(prisma.feeStructure, feeStructureSchema, {
  writeRoles: ["ADMIN"],
  orderBy: { category: "asc" },
});

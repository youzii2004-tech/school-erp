import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { feeStructureSchema } from "@/lib/validation/fee";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.feeStructure, feeStructureSchema.partial(), {
  writeRoles: ["ADMIN"],
});

import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { classSchema } from "@/lib/validation/academic";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.class, classSchema.partial(), {
  writeRoles: ["ADMIN"],
});

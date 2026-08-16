import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { sessionSchema } from "@/lib/validation/academic";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.academicSession, sessionSchema.partial(), {
  writeRoles: ["ADMIN"],
});

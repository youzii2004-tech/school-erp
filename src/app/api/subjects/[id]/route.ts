import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { subjectSchema } from "@/lib/validation/academic";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.subject, subjectSchema.partial(), {
  writeRoles: ["ADMIN"],
});

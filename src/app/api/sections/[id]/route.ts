import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { sectionSchema } from "@/lib/validation/academic";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.section, sectionSchema.partial(), {
  writeRoles: ["ADMIN"],
});

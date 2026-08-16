import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { sectionSchema } from "@/lib/validation/academic";

export const { GET, POST } = makeCrudRoutes(prisma.section, sectionSchema, {
  writeRoles: ["ADMIN"],
});

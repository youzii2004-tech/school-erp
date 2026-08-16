import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { subjectSchema } from "@/lib/validation/academic";

export const { GET, POST } = makeCrudRoutes(prisma.subject, subjectSchema, {
  writeRoles: ["ADMIN"],
});

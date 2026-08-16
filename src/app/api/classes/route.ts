import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { classSchema } from "@/lib/validation/academic";

export const { GET, POST } = makeCrudRoutes(prisma.class, classSchema, {
  writeRoles: ["ADMIN"],
});

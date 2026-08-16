import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { sessionSchema } from "@/lib/validation/academic";

export const { GET, POST } = makeCrudRoutes(prisma.academicSession, sessionSchema, {
  writeRoles: ["ADMIN"],
  orderBy: { startDate: "desc" },
});

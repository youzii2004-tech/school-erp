import { z } from "zod";

export const announcementCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.string().min(1), // "ALL" | "CLASS:<id>" | "SECTION:<id>" | "ROLE:<role>"
});

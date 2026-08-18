// Single source of truth for "which area does each role land in", used by
// both src/middleware.ts (redirect a signed-in user away from another role's
// area) and src/app/page.tsx (redirect "/" straight to the signed-in user's
// home). Previously this map was inlined only in middleware.ts; duplicating
// it a second time for page.tsx would have made the two drift independently.
export const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

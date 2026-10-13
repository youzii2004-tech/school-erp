import { generateTempPassword } from "@/lib/temp-password";
import { passwordChangeSchema } from "@/lib/validation/password";

it("generates unique policy-compliant temp passwords", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = generateTempPassword();
    expect(p).toHaveLength(12);
    expect(passwordChangeSchema.safeParse({ currentPassword: "x", newPassword: p }).success).toBe(true);
    seen.add(p);
  }
  expect(seen.size).toBe(200);
});

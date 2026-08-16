import { verifyPassword, hashPassword } from "../auth";

describe("password hashing", () => {
  it("hashes and verifies a matching password", async () => {
    const hash = await hashPassword("Sch00l!Pass");
    expect(await verifyPassword("Sch00l!Pass", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Sch00l!Pass");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

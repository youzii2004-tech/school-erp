import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { safeUploadExtension, isSafePathId } from "@/lib/upload-validation";

describe("isRateLimited", () => {
  it("blocks after max attempts and recovers after the window", () => {
    resetRateLimit("k");
    for (let i = 0; i < 5; i++) expect(isRateLimited("k", 5, 1000, 0)).toBe(false);
    expect(isRateLimited("k", 5, 1000, 10)).toBe(true);
    expect(isRateLimited("k", 5, 1000, 2000)).toBe(false);
  });
});

describe("upload validation", () => {
  it("allows only document/image extensions, case-insensitively", () => {
    expect(safeUploadExtension("a.PDF")).toBe(".pdf");
    expect(safeUploadExtension("a.html")).toBeNull();
    expect(safeUploadExtension("a.svg")).toBeNull();
    expect(safeUploadExtension("noext")).toBeNull();
  });
  it("rejects path-traversal student ids", () => {
    expect(isSafePathId("clx123_AB-9")).toBe(true);
    expect(isSafePathId("../../etc")).toBe(false);
    expect(isSafePathId("a/b")).toBe(false);
  });
});

import { passwordChangeSchema } from "@/lib/validation/password";
describe("passwordChangeSchema", () => {
  it("enforces length, letter+digit and difference", () => {
    const ok = (n: string, c = "old") => passwordChangeSchema.safeParse({ currentPassword: c, newPassword: n }).success;
    expect(ok("abcdefghi1")).toBe(true);
    expect(ok("short1")).toBe(false);
    expect(ok("onlyletterss")).toBe(false);
    expect(ok("1234567890")).toBe(false);
    expect(ok("abcdefghi1", "abcdefghi1")).toBe(false);
  });
});

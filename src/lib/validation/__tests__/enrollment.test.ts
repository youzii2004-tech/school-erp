import { enrollmentCreateSchema } from "../enrollment";

describe("enrollmentCreateSchema", () => {
  it("accepts a valid enrollment", () => {
    const result = enrollmentCreateSchema.safeParse({
      studentId: "s1", academicSessionId: "sess1", classId: "c1", sectionId: "sec1", rollNumber: "12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing rollNumber", () => {
    const result = enrollmentCreateSchema.safeParse({
      studentId: "s1", academicSessionId: "sess1", classId: "c1", sectionId: "sec1",
    });
    expect(result.success).toBe(false);
  });
});

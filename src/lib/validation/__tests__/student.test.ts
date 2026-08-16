import { studentCreateSchema } from "../student";

describe("studentCreateSchema", () => {
  it("accepts a valid student payload", () => {
    const result = studentCreateSchema.safeParse({
      admissionNumber: "ADM-0001",
      fullName: "Ali Raza",
      gender: "MALE",
      dob: "2014-05-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing fullName", () => {
    const result = studentCreateSchema.safeParse({
      admissionNumber: "ADM-0001",
      gender: "MALE",
      dob: "2014-05-01",
    });
    expect(result.success).toBe(false);
  });
});

import { validateOrThrow } from "../crud-factory";
import { z } from "zod";

describe("validateOrThrow", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data for valid input", () => {
    expect(validateOrThrow(schema, { name: "Grade 6" })).toEqual({ name: "Grade 6" });
  });

  it("throws a ValidationError for invalid input", () => {
    expect(() => validateOrThrow(schema, { name: "" })).toThrow("Validation failed");
  });
});

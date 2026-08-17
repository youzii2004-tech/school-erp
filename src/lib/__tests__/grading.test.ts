import { calculateGrade, calculatePositions, DEFAULT_GRADE_BANDS } from "../grading";

describe("calculateGrade", () => {
  it("returns A+ for 90 and above", () => {
    expect(calculateGrade(95, DEFAULT_GRADE_BANDS)).toBe("A+");
  });
  it("returns F below the lowest band's passing minimum", () => {
    expect(calculateGrade(30, DEFAULT_GRADE_BANDS)).toBe("F");
  });
});

describe("calculatePositions", () => {
  it("ranks students by total descending, ties share a rank", () => {
    const positions = calculatePositions([
      { studentId: "a", total: 90 },
      { studentId: "b", total: 95 },
      { studentId: "c", total: 90 },
    ]);
    expect(positions.get("b")).toBe(1);
    expect(positions.get("a")).toBe(2);
    expect(positions.get("c")).toBe(2);
  });
});

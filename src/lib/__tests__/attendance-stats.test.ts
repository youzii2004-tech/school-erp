import { calculateAttendancePercentage } from "../attendance-stats";

describe("calculateAttendancePercentage", () => {
  it("counts PRESENT and LATE as attended", () => {
    const records = [
      { status: "PRESENT" }, { status: "LATE" }, { status: "ABSENT" }, { status: "LEAVE" },
    ];
    expect(calculateAttendancePercentage(records)).toBe(50);
  });

  it("returns 0 for an empty record set", () => {
    expect(calculateAttendancePercentage([])).toBe(0);
  });
});

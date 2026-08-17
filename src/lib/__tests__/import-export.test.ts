import { parseStudentRows } from "../import-export";
import * as XLSX from "xlsx";

function makeSheetBuffer(rows: Record<string, any>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("parseStudentRows", () => {
  it("parses valid rows", () => {
    const buffer = makeSheetBuffer([
      { admissionNumber: "ADM-1", fullName: "Sana Khan", gender: "FEMALE", dob: "2015-01-01" },
    ]);
    const { valid, errors } = parseStudentRows(buffer);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("reports an error row for a missing required field, keeping row numbers 1-based including header", () => {
    const buffer = makeSheetBuffer([
      { admissionNumber: "ADM-2", gender: "MALE", dob: "2015-01-01" },
    ]);
    const { valid, errors } = parseStudentRows(buffer);
    expect(valid).toHaveLength(0);
    expect(errors[0].row).toBe(2);
  });
});

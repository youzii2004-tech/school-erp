import { computeVoucherStatus, nextVoucherNumber } from "../fee-calc";

describe("computeVoucherStatus", () => {
  it("is PAID when paidAmount >= totalPayable", () => {
    expect(computeVoucherStatus(1000, 1000)).toBe("PAID");
  });
  it("is PARTIALLY_PAID when 0 < paidAmount < totalPayable", () => {
    expect(computeVoucherStatus(1000, 400)).toBe("PARTIALLY_PAID");
  });
  it("is UNPAID when paidAmount is 0", () => {
    expect(computeVoucherStatus(1000, 0)).toBe("UNPAID");
  });
});

describe("nextVoucherNumber", () => {
  it("starts at VCH-000001 when there is no last number", () => {
    expect(nextVoucherNumber(null)).toBe("VCH-000001");
  });
  it("increments the numeric suffix", () => {
    expect(nextVoucherNumber("VCH-000041")).toBe("VCH-000042");
  });
});

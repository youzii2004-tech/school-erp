export type GradeBand = { min: number; grade: string };

export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A" },
  { min: 70, grade: "B" },
  { min: 60, grade: "C" },
  { min: 50, grade: "D" },
  { min: 40, grade: "E" },
  { min: 0, grade: "F" },
];

export function calculateGrade(percentage: number, bands: GradeBand[] = DEFAULT_GRADE_BANDS): string {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const band = sorted.find((b) => percentage >= b.min);
  return band?.grade ?? "F";
}

export function calculatePositions(students: { studentId: string; total: number }[]): Map<string, number> {
  const sorted = [...students].sort((a, b) => b.total - a.total);
  const positions = new Map<string, number>();
  let rank = 0;
  let lastTotal: number | null = null;
  let seen = 0;
  for (const s of sorted) {
    seen += 1;
    if (s.total !== lastTotal) {
      rank = seen;
      lastTotal = s.total;
    }
    positions.set(s.studentId, rank);
  }
  return positions;
}

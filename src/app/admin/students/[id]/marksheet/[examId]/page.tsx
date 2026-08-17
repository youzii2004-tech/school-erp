"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  MarksheetView,
  type MarksheetAttendance,
  type MarksheetExam,
  type MarksheetResult,
  type MarksheetStudent,
} from "@/components/exams/MarksheetView";
import type { ResultRow } from "@/components/exams/ResultSheetTable";

// Matches GET /api/students/[id] (Task 6) — only the fields this page needs.
// enrollments come back ordered desc by createdAt (see StudentProfileTabs).
type StudentDetail = {
  id: string;
  fullName: string;
  admissionNumber: string;
  photoPath: string | null;
  enrollments: {
    id: string;
    rollNumber: string;
    status: string;
    class: { id: string; name: string };
    section: { id: string; name: string };
    session: { id: string; name: string; isCurrent: boolean };
  }[];
};

// Matches GET /api/exams/[id] (Task 14) — only the fields this page needs.
type ExamDetail = {
  id: string;
  name: string;
  type: string;
  academicSessionId: string;
  publishedAt: string | null;
  createdAt: string;
  examSubjects: { classId: string; examDate: string }[];
};

function monthValue(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function MarksheetPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id, examId } = use(params);

  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<MarksheetExam | null>(null);
  const [student, setStudent] = useState<MarksheetStudent | null>(null);
  const [result, setResult] = useState<MarksheetResult>(null);
  const [attendance, setAttendance] = useState<MarksheetAttendance>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    setExam(null);
    setStudent(null);
    setResult(null);
    setAttendance(null);

    (async () => {
      try {
        const [studentRes, examRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch(`/api/exams/${examId}`),
        ]);
        if (!studentRes.ok) throw new Error("Student not found");
        if (!examRes.ok) throw new Error("Exam not found");
        const studentData: StudentDetail = await studentRes.json();
        const examData: ExamDetail = await examRes.json();
        if (cancelled) return;

        // Enrollment matching the exam's academicSessionId, else the most
        // recent enrollment (enrollments are already ordered desc by
        // createdAt by the API — see task-17-brief context notes).
        const enrollment =
          studentData.enrollments.find((e) => e.session.id === examData.academicSessionId) ??
          studentData.enrollments[0] ??
          null;
        if (!enrollment) throw new Error("This student has no enrollment on record.");

        const [resultsRes, attendanceRes] = await Promise.all([
          fetch(`/api/results?examinationId=${examId}&classId=${enrollment.class.id}`),
          (() => {
            // Attendance % for the exam's "term" — this schema has no
            // term/semester concept, only individual months. Simplest
            // defensible choice: use the exam date of one of its
            // examSubjects (falling back to the exam's createdAt month if it
            // has none configured yet), and label the figure with that exact
            // month on-screen so it reads as a snapshot, not a full-term
            // aggregate.
            const anchorDate = examData.examSubjects[0]?.examDate ?? examData.createdAt;
            return fetch(
              `/api/attendance/summary?studentId=${id}&month=${monthValue(anchorDate)}`
            ).then((res) => ({ res, anchorDate }));
          })(),
        ]);
        if (cancelled) return;

        const resultsData: ResultRow[] = resultsRes.ok ? await resultsRes.json() : [];
        const studentResult = resultsData.find((r) => r.studentId === id) ?? null;

        let attendanceValue: MarksheetAttendance = null;
        const { res: attRes, anchorDate } = attendanceRes;
        if (attRes.ok) {
          const attData = await attRes.json();
          if (typeof attData.percentage === "number") {
            attendanceValue = { percentage: attData.percentage, monthLabel: monthLabel(anchorDate) };
          }
        }
        if (cancelled) return;

        setExam({ name: examData.name, type: examData.type });
        setStudent({
          fullName: studentData.fullName,
          admissionNumber: studentData.admissionNumber,
          photoPath: studentData.photoPath,
          className: enrollment.class.name,
          sectionName: enrollment.section.name,
          rollNumber: enrollment.rollNumber,
          enrollmentStatus: enrollment.status,
        });
        setResult(studentResult);
        setAttendance(attendanceValue);
        setLoaded(true);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load marksheet");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, examId]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Button variant="ghost" size="sm" render={<Link href={`/admin/students/${id}`} />}>
          <ArrowLeft />
          Back to Student
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : !loaded || !exam || !student ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <MarksheetView exam={exam} student={student} result={result} attendance={attendance} />
      )}
    </div>
  );
}

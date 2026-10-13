import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAttendancePercentage } from "@/lib/attendance-stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM format

  if (!studentId || !month) {
    return NextResponse.json({ error: "studentId and month are required" }, { status: 400 });
  }

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
  }

  // Access control: ADMIN/TEACHER can access any student, STUDENT/PARENT only their own
  const isAdminOrTeacher = requireRole(session, ["ADMIN", "TEACHER"]);
  if (!isAdminOrTeacher) {
    // STUDENT or PARENT: check if they have access to this student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true, guardianLinks: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // STUDENT: can only view own record
    if (session.user.role === "STUDENT") {
      if (student.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // PARENT: must have a matching GuardianLink
    else if (session.user.role === "PARENT") {
      const guardianLink = await prisma.guardianLink.findFirst({
        where: { studentId, userId: session.user.id },
      });
      if (!guardianLink) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // Parse month to get date range
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

  // Fetch attendance records for the month
  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  const percentage = calculateAttendancePercentage(records);

  return NextResponse.json({
    records,
    percentage,
  });
}

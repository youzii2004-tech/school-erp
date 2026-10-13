/**
 * Route-level tests with Prisma and next-auth mocked: they pin the authorization
 * rules (roster membership, last-admin protection, admin-only) that unit tests
 * on lib helpers can't see.
 */
const prismaMock = {
  teacher: { findUnique: jest.fn() },
  teacherSubject: { findFirst: jest.fn() },
  enrollment: { findMany: jest.fn() },
  examSubject: { findUnique: jest.fn() },
  attendance: { upsert: jest.fn() },
  mark: { upsert: jest.fn() },
  user: { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => ops),
};
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
const getServerSession = jest.fn();
jest.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a), default: jest.fn() }));
jest.mock("next-auth/providers/credentials", () => ({ __esModule: true, default: jest.fn(() => ({})) }));

import { NextRequest } from "next/server";
import { POST as attendancePost } from "@/app/api/attendance/route";
import { POST as marksPost } from "@/app/api/marks/route";
import { PATCH as userPatch } from "@/app/api/users/[id]/route";

const json = (body: unknown) =>
  new NextRequest("http://localhost/api/x", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const as = (role: string, id = "u1") => getServerSession.mockResolvedValue({ user: { id, name: id, role } });

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => ops);
});

describe("POST /api/attendance", () => {
  const body = { sectionId: "sec1", date: "2026-10-13", entries: [{ studentId: "s1", status: "PRESENT" }, { studentId: "s2", status: "ABSENT" }] };
  beforeEach(() => {
    prismaMock.teacher.findUnique.mockResolvedValue({ id: "t1" });
    prismaMock.teacherSubject.findFirst.mockResolvedValue({ id: "ts1" });
  });

  it("rejects students outside the section even for an assigned teacher", async () => {
    as("TEACHER");
    prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: "s1" }]); // s2 not rostered
    const res = await attendancePost(json(body));
    expect(res.status).toBe(400);
    expect(prismaMock.attendance.upsert).not.toHaveBeenCalled();
  });

  it("accepts when every student is rostered", async () => {
    as("TEACHER");
    prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: "s1" }, { studentId: "s2" }]);
    expect((await attendancePost(json(body))).status).toBe(201);
  });

  it("forbids students and unassigned teachers", async () => {
    as("STUDENT");
    expect((await attendancePost(json(body))).status).toBe(403);
    as("TEACHER");
    prismaMock.teacherSubject.findFirst.mockResolvedValue(null);
    expect((await attendancePost(json(body))).status).toBe(403);
  });
});

describe("POST /api/marks", () => {
  const body = { examSubjectId: "es1", entries: [{ studentId: "s1", obtainedMarks: 50 }] };
  it("rejects marks for a student not in the exam subject's class", async () => {
    as("ADMIN");
    prismaMock.examSubject.findUnique.mockResolvedValue({ id: "es1", classId: "c1", subjectId: "sub", totalMarks: 100, examinationId: "e1", examination: { publishedAt: null } });
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    expect((await marksPost(json(body))).status).toBe(400);
    expect(prismaMock.mark.upsert).not.toHaveBeenCalled();
  });
  it("refuses once results are published", async () => {
    as("ADMIN");
    prismaMock.examSubject.findUnique.mockResolvedValue({ id: "es1", classId: "c1", subjectId: "sub", totalMarks: 100, examinationId: "e1", examination: { publishedAt: new Date() } });
    expect((await marksPost(json(body))).status).toBe(409);
  });
});

describe("PATCH /api/users/[id]", () => {
  const call = (id: string, isActive: boolean) =>
    userPatch(json({ isActive }), { params: Promise.resolve({ id }) });

  it("is admin-only", async () => {
    as("TEACHER");
    expect((await call("x", false)).status).toBe(403);
  });
  it("blocks self-deactivation", async () => {
    as("ADMIN", "me");
    expect((await call("me", false)).status).toBe(400);
  });
  it("blocks deactivating the last active admin", async () => {
    as("ADMIN", "me");
    prismaMock.user.findUnique.mockResolvedValue({ id: "other", role: "ADMIN", username: "o" });
    prismaMock.user.count.mockResolvedValue(0);
    expect((await call("other", false)).status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
  it("allows deactivation when another admin remains, and audits it", async () => {
    as("ADMIN", "me");
    prismaMock.user.findUnique.mockResolvedValue({ id: "other", role: "ADMIN", username: "o" });
    prismaMock.user.count.mockResolvedValue(1);
    expect((await call("other", false)).status).toBe(200);
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });
});

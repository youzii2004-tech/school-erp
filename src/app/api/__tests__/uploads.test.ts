const prismaMock = {
  student: { findFirst: jest.fn(), findUnique: jest.fn() },
  document: { create: jest.fn(), findFirst: jest.fn() },
  guardianLink: { findFirst: jest.fn() },
  auditLog: { create: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
const getServerSession = jest.fn();
jest.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a), default: jest.fn() }));
jest.mock("next-auth/providers/credentials", () => ({ __esModule: true, default: jest.fn(() => ({})) }));
jest.mock("fs/promises", () => ({ writeFile: jest.fn(), mkdir: jest.fn(), readFile: jest.fn(async () => Buffer.from("x")) }));

import { NextRequest } from "next/server";
import { POST as upload } from "@/app/api/upload/route";
import { GET as download } from "@/app/api/uploads/[...path]/route";
import { matchesMagicBytes } from "@/lib/upload-validation";

const as = (role: string, id = "u1", mustChange = false) =>
  getServerSession.mockResolvedValue({ user: { id, name: id, role, mustChange } });

function uploadReq(studentId: string, name: string, bytes: number[]) {
  const fd = new FormData();
  fd.set("studentId", studentId);
  fd.set("type", "PHOTO");
  fd.set("file", new File([new Uint8Array(bytes)], name));
  return new NextRequest("http://localhost/api/upload", { method: "POST", body: fd });
}
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];

beforeEach(() => jest.clearAllMocks());

describe("POST /api/upload", () => {
  it("is admin-only", async () => {
    as("TEACHER");
    expect((await upload(uploadReq("s1", "a.pdf", PDF))).status).toBe(403);
  });
  it("refuses everything while a password change is pending", async () => {
    as("ADMIN", "a", true);
    expect((await upload(uploadReq("s1", "a.pdf", PDF))).status).toBe(403);
  });
  it("rejects traversal ids, bad extensions and mismatched content", async () => {
    as("ADMIN");
    expect((await upload(uploadReq("../../x", "a.pdf", PDF))).status).toBe(400);
    expect((await upload(uploadReq("s1", "a.html", PDF))).status).toBe(400);
    prismaMock.student.findFirst.mockResolvedValue({ id: "s1" });
    expect((await upload(uploadReq("s1", "a.pdf", [0x3c, 0x68, 0x74, 0x6d, 0x6c]))).status).toBe(400);
  });
  it("404s an unknown student and accepts a genuine PDF", async () => {
    as("ADMIN");
    prismaMock.student.findFirst.mockResolvedValue(null);
    expect((await upload(uploadReq("s1", "a.pdf", PDF))).status).toBe(404);
    prismaMock.student.findFirst.mockResolvedValue({ id: "s1" });
    expect((await upload(uploadReq("s1", "a.pdf", PDF))).status).toBe(201);
  });
});

describe("GET /api/uploads/[...path]", () => {
  const call = () =>
    download(new NextRequest("http://localhost/x"), { params: Promise.resolve({ path: ["students", "s1", "f.pdf"] }) });
  beforeEach(() => {
    prismaMock.document.findFirst.mockResolvedValue({ studentId: "s1" });
    prismaMock.student.findUnique.mockResolvedValue({ id: "s1", userId: "stu-user", deletedAt: null });
  });
  it("requires login", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });
  it("stops another student, and an unlinked parent", async () => {
    as("STUDENT", "someone-else");
    expect((await call()).status).toBe(403);
    as("PARENT", "p1");
    prismaMock.guardianLink.findFirst.mockResolvedValue(null);
    expect((await call()).status).toBe(403);
  });
  it("lets the owner and a linked parent in, with nosniff", async () => {
    as("STUDENT", "stu-user");
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    as("PARENT", "p1");
    prismaMock.guardianLink.findFirst.mockResolvedValue({ id: "l" });
    expect((await call()).status).toBe(200);
  });
});

it("magic bytes", () => {
  expect(matchesMagicBytes(new Uint8Array(PDF), ".pdf")).toBe(true);
  expect(matchesMagicBytes(new Uint8Array(PDF), ".png")).toBe(false);
});

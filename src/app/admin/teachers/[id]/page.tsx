"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Inbox, ArrowLeft } from "lucide-react";
import { AssignDialog } from "@/components/teachers/AssignDialog";

// Shape matches GET /api/teachers/[id] (Task 18): Teacher row with `user` and
// `subjects` (TeacherSubject rows, each with its `subject` relation) included.
// TeacherSubject has no @relation to Class/Section in prisma/schema.prisma (raw
// classId/sectionId fields only), so this page resolves names client-side via
// the /api/classes and /api/sections list endpoints.
type TeacherProfile = {
  id: string;
  fullName: string;
  cnic: string | null;
  qualification: string | null;
  joiningDate: string | null;
  designation: string | null;
  phone: string | null;
  user: { email: string; username: string };
  subjects: {
    id: string;
    classId: string;
    sectionId: string;
    subject: { id: string; name: string };
  }[];
};

type SchoolClass = { id: string; name: string };
type SchoolSection = { id: string; name: string };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);

  const loadTeacher = () => {
    setError(null);
    return fetch(`/api/teachers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Teacher not found" : "Failed to load teacher");
        return res.json();
      })
      .then((data) => setTeacher(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load teacher"));
  };

  useEffect(() => {
    let cancelled = false;
    setTeacher(null);
    setError(null);

    Promise.all([
      fetch(`/api/teachers/${id}`).then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Teacher not found" : "Failed to load teacher");
        return res.json();
      }),
      fetch("/api/classes").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/sections").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([teacherData, classesData, sectionsData]) => {
        if (cancelled) return;
        setTeacher(teacherData);
        setClasses(classesData);
        setSections(sectionsData);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load teacher");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const classNameById = (classId: string) => classes.find((c) => c.id === classId)?.name ?? "—";
  const sectionNameById = (sectionId: string) => sections.find((s) => s.id === sectionId)?.name ?? "—";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/teachers" />}>
        <ArrowLeft />
        Back to Teachers
      </Button>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : teacher === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 pt-4">
              <Avatar size="lg">
                <AvatarFallback>{initials(teacher.fullName) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <h1 className="font-heading text-xl font-semibold">{teacher.fullName}</h1>
                <p className="text-sm text-muted-foreground">
                  {teacher.designation || "No designation"} · {teacher.user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Username" value={teacher.user.username} />
              <Field label="Email" value={teacher.user.email} />
              <Field label="CNIC" value={teacher.cnic} />
              <Field label="Qualification" value={teacher.qualification} />
              <Field label="Joining Date" value={formatDate(teacher.joiningDate)} />
              <Field label="Designation" value={teacher.designation} />
              <Field label="Phone" value={teacher.phone} />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold">Class / Subject Assignments</h2>
              <AssignDialog teacherId={teacher.id} onAssigned={loadTeacher} />
            </div>

            {teacher.subjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No assignments yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacher.subjects.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.subject.name}</TableCell>
                        <TableCell>{classNameById(assignment.classId)}</TableCell>
                        <TableCell>{sectionNameById(assignment.sectionId)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Inbox, Search, Eye, Upload, Download } from "lucide-react";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  status: string;
  enrollments: { class: { name: string }; section: { name: string } }[];
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive"> = {
  ACTIVE: "default",
  LEFT: "outline",
  GRADUATED: "outline",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setStudents(null);
    setError(null);

    const url = debouncedQuery
      ? `/api/students?q=${encodeURIComponent(debouncedQuery)}`
      : "/api/students";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load students");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load students");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, refreshCount]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">
            All enrolled and past students in the system.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/admin/students/import" />}>
            <Upload />
            Import
          </Button>
          {/* Plain <a> triggers a browser download via the route's
              Content-Disposition: attachment header (Task 24 Step 7) — no
              fetch+blob dance needed; this codebase has no existing
              download-via-fetch pattern to reuse (checked uploads route). */}
          {/* File download, not a page navigation: a plain <a> is correct (next/link would try to route). */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <Button variant="outline" size="sm" render={<a href="/api/students/export" />}>
            <Download />
            Export
          </Button>
          <StudentFormDialog onCreated={() => setRefreshCount((c) => c + 1)} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or admission number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
          </CardContent>
        </Card>
      ) : students === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No students yet</p>
            <p className="text-xs text-muted-foreground">
              {debouncedQuery
                ? "No students match your search."
                : "Students you add will show up here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Photo</TableHead>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class / Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Avatar>
                      <AvatarFallback>{initials(student.fullName) || "?"}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>{student.admissionNumber}</TableCell>
                  <TableCell className="font-medium">{student.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.enrollments[0]
                      ? `${student.enrollments[0].class.name} - ${student.enrollments[0].section.name}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[student.status] ?? "outline"}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/admin/students/${student.id}`} />}>
                      <Eye />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

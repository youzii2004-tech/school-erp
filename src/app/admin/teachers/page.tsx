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
import { Input } from "@/components/ui/input";
import { Inbox, Search, Eye } from "lucide-react";
import { TeacherFormDialog } from "@/components/teachers/TeacherFormDialog";

// Shape matches GET /api/teachers (Task 18): plain Teacher rows with `user` included.
type Teacher = {
  id: string;
  fullName: string;
  designation: string | null;
  user: { email: string };
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function TeachersPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // GET /api/teachers (Task 18) has no server-side search param, unlike
  // GET /api/students (?q=). Filter client-side over the fetched list instead.
  useEffect(() => {
    let cancelled = false;
    setTeachers(null);
    setError(null);

    fetch("/api/teachers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load teachers");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setTeachers(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load teachers");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  const filteredTeachers = (teachers ?? []).filter((t) => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return true;
    return t.fullName.toLowerCase().includes(q) || t.user.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            All teachers with a portal account in the system.
          </p>
        </div>
        <TeacherFormDialog onCreated={() => setRefreshCount((c) => c + 1)} />
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
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
      ) : teachers === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredTeachers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No teachers yet</p>
            <p className="text-xs text-muted-foreground">
              {debouncedQuery
                ? "No teachers match your search."
                : "Teachers you add will show up here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <Avatar>
                      <AvatarFallback>{initials(teacher.fullName) || "?"}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{teacher.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{teacher.designation || "—"}</TableCell>
                  <TableCell>{teacher.user.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/admin/teachers/${teacher.id}`} />}>
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

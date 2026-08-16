"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StudentProfileTabs, type StudentProfile } from "@/components/students/StudentProfileTabs";

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStudent(null);
    setError(null);

    fetch(`/api/students/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Student not found" : "Failed to load student");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setStudent(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load student");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/students" />}>
        <ArrowLeft />
        Back to Students
      </Button>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : student === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <StudentProfileTabs student={student} />
      )}
    </div>
  );
}

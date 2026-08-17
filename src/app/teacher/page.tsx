"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Clock, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";

// Row shapes matching the plain (no-include) list endpoints this page stitches
// together client-side: GET /api/teacher-subjects (Task 16/18), GET /api/classes,
// GET /api/sections, GET /api/subjects (all Task 4/1 CRUD-factory routes — flat
// rows, no relations included).
type TeacherSubjectRow = { id: string; subjectId: string; classId: string; sectionId: string };
type ClassRow = { id: string; name: string };
type SectionRow = { id: string; name: string; classId: string };
type SubjectRow = { id: string; name: string };

// Matches GET /api/timetable?teacherId=me (Task 19's sentinel) — full include
// (subject/teacher/section+class).
type TimetableEntryRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subject: { name: string };
  section: { name: string; class: { name: string } };
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState<
    { key: string; className: string; sectionName: string; subjectName: string }[]
  >([]);
  const [todayEntries, setTodayEntries] = useState<TimetableEntryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [tsRes, classesRes, sectionsRes, subjectsRes, timetableRes] = await Promise.all([
          fetch("/api/teacher-subjects"),
          fetch("/api/classes"),
          fetch("/api/sections"),
          fetch("/api/subjects"),
          fetch("/api/timetable?teacherId=me"),
        ]);
        if (!tsRes.ok || !classesRes.ok || !sectionsRes.ok || !subjectsRes.ok || !timetableRes.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const [teacherSubjects, classes, sections, subjects, timetable]: [
          TeacherSubjectRow[],
          ClassRow[],
          SectionRow[],
          SubjectRow[],
          TimetableEntryRow[]
        ] = await Promise.all([
          tsRes.json(),
          classesRes.json(),
          sectionsRes.json(),
          subjectsRes.json(),
          timetableRes.json(),
        ]);

        if (cancelled) return;

        const classById = new Map(classes.map((c) => [c.id, c]));
        const sectionById = new Map(sections.map((s) => [s.id, s]));
        const subjectById = new Map(subjects.map((s) => [s.id, s]));

        setMyClasses(
          teacherSubjects.map((ts) => ({
            key: ts.id,
            className: classById.get(ts.classId)?.name ?? "—",
            sectionName: sectionById.get(ts.sectionId)?.name ?? "—",
            subjectName: subjectById.get(ts.subjectId)?.name ?? "—",
          }))
        );

        const todayDow = new Date().getDay();
        setTodayEntries(
          timetable
            .filter((e) => e.dayOfWeek === todayDow)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Distinct (class, section) pairs from my assignments — used for the
  // "Today's Attendance" quick-link list. Task 10's /teacher/attendance page
  // doesn't accept URL params for pre-selecting a section (checked its source
  // — it just renders <AttendanceGrid /> with no query-string handling), so
  // per the brief this stays a plain link rather than a deep link the target
  // page can't consume.
  const mySections = Array.from(
    new Map(myClasses.map((c) => [`${c.className}-${c.sectionName}`, c])).values()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your classes and schedule for today.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm font-medium text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  My Classes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : myClasses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No subjects assigned yet.</p>
                ) : (
                  myClasses.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {c.className} - {c.sectionName}
                      </span>
                      <span className="text-muted-foreground">{c.subjectName}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="size-4 text-primary" />
                  Today&apos;s Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {loading ? (
                  <Skeleton className="h-10 w-full" />
                ) : mySections.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No sections assigned yet.</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Pick a section on the attendance page to mark today&apos;s attendance:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {mySections.map((c) => (
                        <Button key={c.key} variant="outline" size="sm" render={<Link href="/teacher/attendance" />}>
                          {c.className} - {c.sectionName}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Today&apos;s Timetable — {DAY_NAMES[new Date().getDay()]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : todayEntries.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No classes scheduled today.</p>
                ) : (
                  todayEntries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {e.startTime} - {e.endTime}
                      </span>
                      <span>{e.subject.name}</span>
                      <span className="text-muted-foreground">
                        {e.section.class.name} - {e.section.name}
                        {e.room ? ` · Room ${e.room}` : ""}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold">Announcements</h2>
            <AnnouncementFeed showComposer={false} />
          </div>
        </div>
      )}
    </div>
  );
}

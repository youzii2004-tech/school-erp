"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Inbox, Megaphone, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
};

type ClassRow = { id: string; name: string };
type SectionRow = { id: string; name: string; classId: string };
type TeacherSubjectRow = { classId: string; sectionId: string };

const ROLE_OPTIONS = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];

function audienceLabel(audience: string) {
  if (audience === "ALL") return "Everyone";
  if (audience.startsWith("ROLE:")) return audience.replace("ROLE:", "") + "s";
  if (audience.startsWith("CLASS:")) return "Class";
  if (audience.startsWith("SECTION:")) return "Section";
  return audience;
}

// Composer dialog. ADMIN can target ALL / a role / a class / a section. TEACHER
// is restricted client-side to their own assigned sections (per the brief) —
// the audience-type picker isn't even shown to a TEACHER, the select goes
// straight to their sections. The server also re-checks this (see POST
// /api/announcements), but the UI never offers a section a teacher can't pick.
function AnnouncementComposer({
  role,
  onCreated,
}: {
  role: "ADMIN" | "TEACHER";
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<"ALL" | "ROLE" | "CLASS" | "SECTION">(
    role === "TEACHER" ? "SECTION" : "ALL"
  );
  const [audienceValue, setAudienceValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [teacherSectionIds, setTeacherSectionIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setAudienceType(role === "TEACHER" ? "SECTION" : "ALL");
    setAudienceValue("");

    Promise.all([
      fetch("/api/classes").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/sections").then((r) => (r.ok ? r.json() : [])),
      role === "TEACHER"
        ? fetch("/api/teacher-subjects").then((r) => (r.ok ? r.json() : []))
        : Promise.resolve(null),
    ]).then(([classData, sectionData, teacherSubjects]) => {
      setClasses(Array.isArray(classData) ? classData : []);
      setSections(Array.isArray(sectionData) ? sectionData : []);
      if (Array.isArray(teacherSubjects)) {
        const ids = [...new Set((teacherSubjects as TeacherSubjectRow[]).map((t) => t.sectionId))];
        setTeacherSectionIds(ids);
      }
    });
  }, [open, role]);

  const sectionOptions = useMemo(() => {
    const pool =
      role === "TEACHER" && teacherSectionIds
        ? sections.filter((s) => teacherSectionIds.includes(s.id))
        : sections;
    return pool.map((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      return { value: s.id, label: cls ? `${cls.name} - ${s.name}` : s.name };
    });
  }, [sections, classes, teacherSectionIds, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      toast.add({ title: "Missing information", description: "Please fill in title and body.", type: "warning" });
      return;
    }

    let audience = "ALL";
    if (audienceType === "ROLE") audience = `ROLE:${audienceValue}`;
    else if (audienceType === "CLASS") audience = `CLASS:${audienceValue}`;
    else if (audienceType === "SECTION") audience = `SECTION:${audienceValue}`;

    if (audienceType !== "ALL" && !audienceValue) {
      toast.add({ title: "Missing information", description: "Please choose an audience.", type: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, audience }),
      });
      if (!res.ok) {
        throw new Error(res.status === 400 ? "Please check the highlighted fields." : "Could not save announcement.");
      }
      toast.add({ title: "Saved", description: "Announcement posted.", type: "success" });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save announcement.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New Announcement
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Body</Label>
            <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>

          {role === "ADMIN" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-audience-type">Audience</Label>
              <Select
                value={audienceType}
                onValueChange={(v) => {
                  setAudienceType(v as typeof audienceType);
                  setAudienceValue("");
                }}
              >
                <SelectTrigger id="ann-audience-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="ROLE">A specific role</SelectItem>
                  <SelectItem value="CLASS">A specific class</SelectItem>
                  <SelectItem value="SECTION">A specific section</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {audienceType === "ROLE" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-role-value">Role</Label>
              <Select value={audienceValue} onValueChange={(v) => setAudienceValue((v as string) ?? "")}>
                <SelectTrigger id="ann-role-value" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audienceType === "CLASS" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-class-value">Class</Label>
              <Select value={audienceValue} onValueChange={(v) => setAudienceValue((v as string) ?? "")}>
                <SelectTrigger id="ann-class-value" className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audienceType === "SECTION" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-section-value">Section</Label>
              <Select value={audienceValue} onValueChange={(v) => setAudienceValue((v as string) ?? "")}>
                <SelectTrigger id="ann-section-value" className="w-full">
                  <SelectValue
                    placeholder={sectionOptions.length === 0 ? "No sections assigned" : "Select section"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Reusable announcement card list. Two modes, per the brief:
//  - `showComposer` (default true): standalone use with a "New Announcement"
//    dialog above the list — used by the admin announcements page.
//  - `showComposer={false}`: embedded, read-only, no dialog — for Task 24's
//    per-role dashboards, which only need to display the feed.
// The list itself is always server-filtered to what the signed-in caller is
// allowed to see (GET /api/announcements resolves that from the session), so
// this component never needs to know the caller's class/section itself.
export function AnnouncementFeed({
  showComposer = true,
  className,
}: {
  showComposer?: boolean;
  className?: string;
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/announcements")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load announcements");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load announcements");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  const canCompose = showComposer && (role === "ADMIN" || role === "TEACHER");

  return (
    <div className={className ? className + " space-y-4" : "space-y-4"}>
      {canCompose && (
        <div className="flex justify-end">
          <AnnouncementComposer
            role={role as "ADMIN" | "TEACHER"}
            onCreated={() => setRefreshCount((c) => c + 1)}
          />
        </div>
      )}

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
          </CardContent>
        </Card>
      ) : items === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No announcements yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="size-4 shrink-0 text-primary" />
                    <h3 className="font-heading text-sm font-semibold">{item.title}</h3>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {audienceLabel(item.audience)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import { Inbox, FileText, Plus, UserPlus } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { EnrollDialog } from "@/components/students/EnrollDialog";
import { cn } from "@/lib/utils";

// Shape matches the include on GET /api/students/[id] (Task 6):
// guardianLinks -> guardian, enrollments -> class/section/session (desc by createdAt),
// promotions, transfers, documents. Field names taken verbatim from prisma/schema.prisma.
type Guardian = {
  id: string;
  fullName: string;
  relation: string;
  phone: string;
  email: string | null;
  cnic: string | null;
  address: string | null;
};

type GuardianLink = {
  id: string;
  guardian: Guardian;
};

type Enrollment = {
  id: string;
  rollNumber: string;
  status: string;
  class: { id: string; name: string };
  section: { id: string; name: string };
  // isCurrent comes through automatically: GET /api/students/[id] (Task 6) does a
  // plain `session: true` include, which returns the full AcademicSession row.
  session: { id: string; name: string; isCurrent: boolean };
};

type PromotionHistory = {
  id: string;
  fromClassName: string;
  toClassName: string;
  fromSessionName: string;
  toSessionName: string;
  promotedAt: string;
};

type TransferHistory = {
  id: string;
  type: string;
  reason: string | null;
  otherSchool: string | null;
  date: string;
};

type Document = {
  id: string;
  type: string;
  filePath: string;
  uploadedAt: string;
};

export type StudentProfile = {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: string;
  dob: string;
  cnicOrBForm: string | null;
  bloodGroup: string | null;
  phone: string | null;
  address: string | null;
  previousSchool: string | null;
  status: string;
  guardianLinks: GuardianLink[];
  enrollments: Enrollment[];
  promotions: PromotionHistory[];
  transfers: TransferHistory[];
  documents: Document[];
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

// Link Guardian mini-dialog: search existing guardians by phone/name (client-side
// filter over GET /api/guardians — no dedicated search API for v1) or create a new
// Guardian then immediately link it. Kept inline in this file since the brief only
// lists EnrollDialog.tsx as a separate component to create.
function LinkGuardianDialog({ studentId, onLinked }: { studentId: string; onLinked: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");
  const [submitting, setSubmitting] = useState(false);

  // Search mode
  const [loadingGuardians, setLoadingGuardians] = useState(false);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [query, setQuery] = useState("");

  // Create mode
  const [fullName, setFullName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCnic] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("search");
    setQuery("");
    setFullName("");
    setRelation("");
    setPhone("");
    setEmail("");
    setCnic("");
    setAddress("");

    setLoadingGuardians(true);
    fetch("/api/guardians")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGuardians)
      .finally(() => setLoadingGuardians(false));
  }, [open]);

  const filteredGuardians = guardians.filter((g) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return g.fullName.toLowerCase().includes(q) || g.phone.toLowerCase().includes(q);
  });

  const linkGuardian = async (guardianId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/students/${studentId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianId }),
      });
      if (res.status === 409) {
        const body = await res.json();
        toast.add({
          title: "Already linked",
          description: body.error ?? "This guardian is already linked to this student.",
          type: "warning",
        });
        return;
      }
      if (!res.ok) throw new Error("Could not link guardian.");
      toast.add({ title: "Linked", description: "Guardian linked to student.", type: "success" });
      setOpen(false);
      onLinked();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not link guardian.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !relation || !phone) {
      toast.add({
        title: "Missing information",
        description: "Please fill in full name, relation and phone.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const createRes = await fetch("/api/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          relation,
          phone,
          email: email || undefined,
          cnic: cnic || undefined,
          address: address || undefined,
        }),
      });
      if (!createRes.ok) {
        throw new Error(createRes.status === 400 ? "Please check the highlighted fields." : "Could not create guardian.");
      }
      const guardian = await createRes.json();
      await linkGuardian(guardian.id);
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not create guardian.",
        type: "error",
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus />
            Link Guardian
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Guardian</DialogTitle>
          <DialogDescription>Search an existing guardian or create a new one.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "search" ? "default" : "outline"}
            onClick={() => setMode("search")}
          >
            Search existing
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "create" ? "default" : "outline"}
            onClick={() => setMode("create")}
          >
            <Plus />
            Create new
          </Button>
        </div>

        {mode === "search" ? (
          <div className="space-y-3">
            <Input
              placeholder="Search by name or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {loadingGuardians ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
              ) : filteredGuardians.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No guardians found.</p>
              ) : (
                filteredGuardians.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{g.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.relation} · {g.phone}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => linkGuardian(g.id)}
                    >
                      Link
                    </Button>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleCreateAndLink} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-fullName">Full Name</Label>
              <Input id="g-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-relation">Relation</Label>
              <Input
                id="g-relation"
                placeholder="Father / Mother / Guardian"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-phone">Phone</Label>
              <Input id="g-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-email">Email</Label>
              <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-cnic">CNIC</Label>
              <Input id="g-cnic" value={cnic} onChange={(e) => setCnic(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-address">Address</Label>
              <Input id="g-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Create & Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Matches GET /api/attendance/summary response (Task 9, src/app/api/attendance/summary/route.ts):
// { records: Attendance[], percentage: number }. Each record is a plain Prisma
// Attendance row (id, studentId, date, status, remarks, markedById) — date and
// status are what this tab needs.
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
type AttendanceRecord = { id: string; date: string; status: AttendanceStatus };

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function percentageBadgeClass(pct: number) {
  if (pct >= 75) return "bg-success/10 text-success";
  if (pct >= 50) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

const ATTENDANCE_STATUS_CLASS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success/10 text-success",
  ABSENT: "bg-destructive/10 text-destructive",
  LATE: "bg-warning/10 text-warning",
  LEAVE: "bg-primary/10 text-primary",
};

function AttendanceTab({ studentId }: { studentId: string }) {
  const [month, setMonth] = useState(currentMonthValue());
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [percentage, setPercentage] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/attendance/summary?studentId=${studentId}&month=${month}`)
      .then((res) => (res.ok ? res.json() : { records: [], percentage: 0 }))
      .then((data) => {
        if (cancelled) return;
        setRecords(data.records ?? []);
        setPercentage(typeof data.percentage === "number" ? data.percentage : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
          setPercentage(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, month]);

  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Month</label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44"
          />
        </div>
        {percentage !== null && (
          <div
            className={cn(
              "flex flex-col items-end gap-0.5 rounded-lg px-3 py-1.5",
              percentageBadgeClass(percentage)
            )}
          >
            <span className="text-xs opacity-80">Attendance this month</span>
            <span className="text-lg font-semibold">{percentage}%</span>
          </div>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="space-y-2 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </CardContent>
        </Card>
      ) : sortedRecords.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState label="No attendance records for this month" />
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn("border-0", ATTENDANCE_STATUS_CLASS[r.status])} variant="outline">
                      {r.status}
                    </Badge>
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

export function StudentProfileTabs({ student }: { student: StudentProfile }) {
  // Local copy so this component can refresh itself after enroll / guardian-link
  // actions without requiring the parent page to pass a refetch callback (the
  // parent page is out of scope for this task).
  const [profile, setProfile] = useState<StudentProfile>(student);

  useEffect(() => {
    setProfile(student);
  }, [student]);

  const refetch = async () => {
    const res = await fetch(`/api/students/${profile.id}`);
    if (res.ok) setProfile(await res.json());
  };

  // Latest enrollment = first item, since the API orders enrollments desc by
  // createdAt.
  const latestEnrollment = profile.enrollments[0] ?? null;
  const hasCurrentEnrollment = profile.enrollments.some((e) => e.session.isCurrent);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-4">
          <Avatar size="lg">
            <AvatarFallback>{initials(profile.fullName) || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h1 className="font-heading text-xl font-semibold">{profile.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              Admission # {profile.admissionNumber}
              {latestEnrollment
                ? ` · ${latestEnrollment.class.name} - ${latestEnrollment.section.name}`
                : " · No enrollment yet"}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[profile.status] ?? "outline"}>{profile.status}</Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="guardian">Guardian Information</TabsTrigger>
          <TabsTrigger value="academic">Academic History</TabsTrigger>
          <TabsTrigger value="history">Class / Promotion / Transfer</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {!hasCurrentEnrollment && (
            <div className="flex justify-end">
              <EnrollDialog studentId={profile.id} onEnrolled={refetch} />
            </div>
          )}
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Admission Number" value={profile.admissionNumber} />
              <Field
                label="Class / Section"
                value={
                  latestEnrollment
                    ? `${latestEnrollment.class.name} - ${latestEnrollment.section.name}`
                    : "—"
                }
              />
              <Field label="Session" value={latestEnrollment?.session.name ?? "—"} />
              <Field label="Roll Number" value={latestEnrollment?.rollNumber ?? "—"} />
              <Field
                label="Status"
                value={<Badge variant={STATUS_VARIANT[profile.status] ?? "outline"}>{profile.status}</Badge>}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Date of Birth" value={formatDate(profile.dob)} />
              <Field label="Gender" value={profile.gender} />
              <Field label="CNIC / B-Form" value={profile.cnicOrBForm} />
              <Field label="Blood Group" value={profile.bloodGroup} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Previous School" value={profile.previousSchool} />
              <Field label="Address" value={profile.address} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardian" className="space-y-4">
          <div className="flex justify-end">
            <LinkGuardianDialog studentId={profile.id} onLinked={refetch} />
          </div>
          {profile.guardianLinks.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState label="No guardians linked yet" />
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Relation</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.guardianLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.guardian.fullName}</TableCell>
                      <TableCell>{link.guardian.relation}</TableCell>
                      <TableCell>{link.guardian.phone}</TableCell>
                      <TableCell>{link.guardian.email || "—"}</TableCell>
                      <TableCell>{link.guardian.address || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="academic">
          {profile.enrollments.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState label="No enrollment history yet" />
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>{enrollment.session.name}</TableCell>
                      <TableCell>{enrollment.class.name}</TableCell>
                      <TableCell>{enrollment.section.name}</TableCell>
                      <TableCell>{enrollment.rollNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{enrollment.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Promotion History</h2>
            {profile.promotions.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState label="No promotion history yet" />
                </CardContent>
              </Card>
            ) : (
              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.promotions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.fromClassName} ({p.fromSessionName})
                        </TableCell>
                        <TableCell>
                          {p.toClassName} ({p.toSessionName})
                        </TableCell>
                        <TableCell>{formatDate(p.promotedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Transfer History</h2>
            {profile.transfers.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState label="No transfer history yet" />
                </CardContent>
              </Card>
            ) : (
              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Other School</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.transfers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="outline">{t.type}</Badge>
                        </TableCell>
                        <TableCell>{t.reason || "—"}</TableCell>
                        <TableCell>{t.otherSchool || "—"}</TableCell>
                        <TableCell>{formatDate(t.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          {profile.documents.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState label="No documents uploaded yet" />
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                      <TableCell className="text-right">
                        <a
                          href={doc.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FileText className="size-3.5" />
                          Download
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab studentId={profile.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


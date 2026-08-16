"use client";

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
import { Inbox, FileText } from "lucide-react";

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
  session: { id: string; name: string };
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

export function StudentProfileTabs({ student }: { student: StudentProfile }) {
  // Latest enrollment = first item, since the API orders enrollments desc by
  // createdAt. No enrollment yet (Task 9 not built) -> "—" everywhere below.
  const latestEnrollment = student.enrollments[0] ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-4">
          <Avatar size="lg">
            <AvatarFallback>{initials(student.fullName) || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h1 className="font-heading text-xl font-semibold">{student.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              Admission # {student.admissionNumber}
              {latestEnrollment
                ? ` · ${latestEnrollment.class.name} - ${latestEnrollment.section.name}`
                : " · No enrollment yet"}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[student.status] ?? "outline"}>{student.status}</Badge>
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
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Admission Number" value={student.admissionNumber} />
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
                value={<Badge variant={STATUS_VARIANT[student.status] ?? "outline"}>{student.status}</Badge>}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Date of Birth" value={formatDate(student.dob)} />
              <Field label="Gender" value={student.gender} />
              <Field label="CNIC / B-Form" value={student.cnicOrBForm} />
              <Field label="Blood Group" value={student.bloodGroup} />
              <Field label="Phone" value={student.phone} />
              <Field label="Previous School" value={student.previousSchool} />
              <Field label="Address" value={student.address} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardian">
          {student.guardianLinks.length === 0 ? (
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
                  {student.guardianLinks.map((link) => (
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
          {student.enrollments.length === 0 ? (
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
                  {student.enrollments.map((enrollment) => (
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
            {student.promotions.length === 0 ? (
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
                    {student.promotions.map((p) => (
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
            {student.transfers.length === 0 ? (
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
                    {student.transfers.map((t) => (
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
          {student.documents.length === 0 ? (
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
                  {student.documents.map((doc) => (
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
      </Tabs>
    </div>
  );
}

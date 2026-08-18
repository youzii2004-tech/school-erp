"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_GRADE_BANDS, type GradeBand } from "@/lib/grading";

type InstituteSettings = { name: string; address: string; contact: string };
type SessionRow = { id: string; name: string; isCurrent: boolean };

const DEFAULT_INSTITUTE: InstituteSettings = { name: "", address: "", contact: "" };

// Three independent form sections, each saved separately (Institute + Grading
// Bands via POST /api/settings, Current Session via PATCH /api/sessions/[id]).
// They're loaded together from one GET /api/settings + one GET /api/sessions
// so the page doesn't waterfall three separate requests before it can render.
export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [institute, setInstitute] = useState<InstituteSettings>(DEFAULT_INSTITUTE);
  const [savingInstitute, setSavingInstitute] = useState(false);

  const [gradeBands, setGradeBands] = useState<GradeBand[]>(DEFAULT_GRADE_BANDS);
  const [savingBands, setSavingBands] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [savingSession, setSavingSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/settings").then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      }),
      fetch("/api/sessions").then((res) => {
        if (!res.ok) throw new Error("Failed to load sessions");
        return res.json();
      }),
    ])
      .then(([settingsData, sessionData]) => {
        if (cancelled) return;
        setInstitute({ ...DEFAULT_INSTITUTE, ...(settingsData?.institute ?? {}) });
        setGradeBands(
          Array.isArray(settingsData?.gradeBands) && settingsData.gradeBands.length > 0
            ? settingsData.gradeBands
            : DEFAULT_GRADE_BANDS
        );
        const rows: SessionRow[] = Array.isArray(sessionData) ? sessionData : [];
        setSessions(rows);
        setSelectedSessionId(rows.find((s) => s.isCurrent)?.id ?? "");
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveInstitute = async () => {
    setSavingInstitute(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "institute", value: institute }),
      });
      if (!res.ok) throw new Error("Could not save institute profile");
      toast.add({ title: "Saved", description: "Institute profile updated.", type: "success" });
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save institute profile.",
        type: "error",
      });
    } finally {
      setSavingInstitute(false);
    }
  };

  const updateBand = (index: number, patch: Partial<GradeBand>) => {
    setGradeBands((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const addBand = () => {
    setGradeBands((prev) => [...prev, { min: 0, grade: "" }]);
  };

  const removeBand = (index: number) => {
    setGradeBands((prev) => prev.filter((_, i) => i !== index));
  };

  const saveGradeBands = async () => {
    setSavingBands(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "gradeBands", value: gradeBands }),
      });
      if (!res.ok) throw new Error("Could not save grading bands");
      toast.add({ title: "Saved", description: "Grading bands updated.", type: "success" });
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save grading bands.",
        type: "error",
      });
    } finally {
      setSavingBands(false);
    }
  };

  const saveCurrentSession = async () => {
    if (!selectedSessionId) return;
    setSavingSession(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true }),
      });
      if (!res.ok) throw new Error("Could not set current session");
      setSessions((prev) => prev.map((s) => ({ ...s, isCurrent: s.id === selectedSessionId })));
      toast.add({ title: "Saved", description: "Current session updated.", type: "success" });
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not set current session.",
        type: "error",
      });
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Institute profile, grading bands, and the active academic session.
        </p>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm font-medium text-destructive">
            {loadError}
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <h2 className="font-heading text-lg font-medium">Institute</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="instituteName">Name</Label>
                  <Input
                    id="instituteName"
                    value={institute.name}
                    onChange={(e) => setInstitute((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instituteContact">Contact</Label>
                  <Input
                    id="instituteContact"
                    value={institute.contact}
                    onChange={(e) => setInstitute((prev) => ({ ...prev, contact: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="instituteAddress">Address</Label>
                  <Input
                    id="instituteAddress"
                    value={institute.address}
                    onChange={(e) => setInstitute((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveInstitute} disabled={savingInstitute}>
                  {savingInstitute ? "Saving…" : "Save Institute Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-medium">Grading Bands</h2>
                <Button type="button" variant="outline" size="sm" onClick={addBand}>
                  <Plus />
                  Add Row
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minimum %</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeBands.map((band, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          type="number"
                          value={band.min}
                          onChange={(e) => updateBand(i, { min: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={band.grade}
                          onChange={(e) => updateBand(i, { grade: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove band ${i + 1}`}
                          onClick={() => removeBand(i)}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button onClick={saveGradeBands} disabled={savingBands}>
                  {savingBands ? "Saving…" : "Save Grading Bands"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-4">
              <h2 className="font-heading text-lg font-medium">Current Session</h2>
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="currentSession">Academic Session</Label>
                <Select
                  items={sessions.map((s) => ({
                    value: s.id,
                    label: `${s.name}${s.isCurrent ? " (current)" : ""}`,
                  }))}
                  value={selectedSessionId}
                  onValueChange={(v) => setSelectedSessionId(v as string)}
                >
                  <SelectTrigger id="currentSession" className="w-full">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.isCurrent ? " (current)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={saveCurrentSession}
                  disabled={
                    savingSession ||
                    !selectedSessionId ||
                    sessions.find((s) => s.id === selectedSessionId)?.isCurrent
                  }
                >
                  {savingSession ? "Saving…" : "Set as Current Session"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

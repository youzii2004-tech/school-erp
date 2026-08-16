"use client";

import { useEffect, useState } from "react";
import { EntityTable } from "@/components/academic/EntityTable";
import { EntityFormDialog } from "@/components/academic/EntityFormDialog";

export default function ClassesPage() {
  const [refreshCount, setRefreshCount] = useState(0);
  // GET /api/classes returns raw Class rows (id/name/sessionId only, no relation
  // include — crud-factory is generic and doesn't join). Resolve sessionId -> name
  // client-side here so the table can show "Session" per the brief, without touching
  // Task 4's API/crud-factory files.
  const [sessionNames, setSessionNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; name: string }[]) => {
        if (cancelled) return;
        setSessionNames(Object.fromEntries(data.map((s) => [s.id, s.name])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-muted-foreground">
            Classes offered within each academic session.
          </p>
        </div>
        <EntityFormDialog
          title="Add Class"
          postUrl="/api/classes"
          onCreated={() => setRefreshCount((c) => c + 1)}
          fields={[
            { name: "name", label: "Class Name", type: "text" },
            { name: "sessionId", label: "Session", type: "select", optionsUrl: "/api/sessions" },
          ]}
        />
      </div>
      <EntityTable
        key={refreshCount}
        fetchUrl="/api/classes"
        columns={[
          { key: "name", header: "Name" },
          {
            key: "sessionId",
            header: "Session",
            render: (row) => sessionNames[row.sessionId as string] ?? "—",
          },
        ]}
      />
    </div>
  );
}

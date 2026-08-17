"use client";

import { useEffect, useState } from "react";
import { EntityTable } from "@/components/academic/EntityTable";
import { EntityFormDialog } from "@/components/academic/EntityFormDialog";

export default function SectionsPage() {
  const [refreshCount, setRefreshCount] = useState(0);
  // Same reasoning as the Classes page: resolve classId -> name client-side since
  // GET /api/sections doesn't include the related Class.
  const [classNames, setClassNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; name: string }[]) => {
        if (cancelled) return;
        setClassNames(Object.fromEntries(data.map((c) => [c.id, c.name])));
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
          <h1 className="font-heading text-2xl font-semibold">Sections</h1>
          <p className="text-sm text-muted-foreground">
            Sections within each class, e.g. &quot;A&quot;, &quot;B&quot;.
          </p>
        </div>
        <EntityFormDialog
          title="Add Section"
          postUrl="/api/sections"
          onCreated={() => setRefreshCount((c) => c + 1)}
          fields={[
            { name: "name", label: "Section Name", type: "text" },
            { name: "classId", label: "Class", type: "select", optionsUrl: "/api/classes" },
          ]}
        />
      </div>
      <EntityTable
        key={refreshCount}
        fetchUrl="/api/sections"
        columns={[
          { key: "name", header: "Name" },
          {
            key: "classId",
            header: "Class",
            render: (row) => classNames[row.classId as string] ?? "—",
          },
        ]}
      />
    </div>
  );
}

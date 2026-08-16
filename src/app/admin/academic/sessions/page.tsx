"use client";

import { useState } from "react";
import { EntityTable } from "@/components/academic/EntityTable";
import { EntityFormDialog } from "@/components/academic/EntityFormDialog";

export default function SessionsPage() {
  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Academic Sessions</h1>
          <p className="text-sm text-muted-foreground">
            The school years students and classes are scoped to.
          </p>
        </div>
        <EntityFormDialog
          title="Add Academic Session"
          postUrl="/api/sessions"
          onCreated={() => setRefreshCount((c) => c + 1)}
          fields={[
            { name: "name", label: "Session Name", type: "text" },
            { name: "startDate", label: "Start Date", type: "date" },
            { name: "endDate", label: "End Date", type: "date" },
          ]}
        />
      </div>
      <EntityTable
        key={refreshCount}
        fetchUrl="/api/sessions"
        columns={[
          { key: "name", header: "Name" },
          { key: "startDate", header: "Start Date" },
          { key: "endDate", header: "End Date" },
          { key: "isCurrent", header: "Current" },
        ]}
      />
    </div>
  );
}

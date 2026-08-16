"use client";

import { useState } from "react";
import { EntityTable } from "@/components/academic/EntityTable";
import { EntityFormDialog } from "@/components/academic/EntityFormDialog";

export default function SubjectsPage() {
  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            The subject catalog used across exams, timetables, and teacher assignments.
          </p>
        </div>
        <EntityFormDialog
          title="Add Subject"
          postUrl="/api/subjects"
          onCreated={() => setRefreshCount((c) => c + 1)}
          fields={[
            { name: "name", label: "Subject Name", type: "text" },
            { name: "code", label: "Code", type: "text" },
          ]}
        />
      </div>
      <EntityTable
        key={refreshCount}
        fetchUrl="/api/subjects"
        columns={[
          { key: "name", header: "Name" },
          { key: "code", header: "Code" },
        ]}
      />
    </div>
  );
}

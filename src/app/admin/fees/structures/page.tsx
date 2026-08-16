"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { EntityFormDialog } from "@/components/academic/EntityFormDialog";

type ClassRow = { id: string; name: string; sessionId: string };
type FeeStructureRow = {
  id: string;
  classId: string;
  category: string;
  amount: number;
  frequency: string;
};

const CATEGORY_OPTIONS = [
  "TUITION",
  "ADMISSION",
  "EXAM",
  "TRANSPORT",
  "COMPUTER",
  "LIBRARY",
  "ACTIVITY",
  "OTHER",
].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

const FREQUENCY_OPTIONS = ["MONTHLY", "ONE_TIME", "ANNUAL"].map((v) => ({
  value: v,
  label: v === "ONE_TIME" ? "One-time" : v.charAt(0) + v.slice(1).toLowerCase(),
}));

export default function FeeStructuresPage() {
  const [refreshCount, setRefreshCount] = useState(0);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [structures, setStructures] = useState<FeeStructureRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setClasses(null);
    setStructures(null);
    setError(null);

    Promise.all([
      fetch("/api/classes").then((res) => {
        if (!res.ok) throw new Error("Failed to load classes");
        return res.json();
      }),
      fetch("/api/fee-structures").then((res) => {
        if (!res.ok) throw new Error("Failed to load fee structures");
        return res.json();
      }),
    ])
      .then(([classData, structureData]) => {
        if (cancelled) return;
        setClasses(Array.isArray(classData) ? classData : []);
        setStructures(Array.isArray(structureData) ? structureData : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  const loading = classes === null || structures === null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Fee Structures</h1>
          <p className="text-sm text-muted-foreground">
            Charges applied to each class, grouped below by class.
          </p>
        </div>
        <EntityFormDialog
          title="Add Charge"
          postUrl="/api/fee-structures"
          onCreated={() => setRefreshCount((c) => c + 1)}
          fields={[
            { name: "classId", label: "Class", type: "select", optionsUrl: "/api/classes" },
            { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS },
            { name: "amount", label: "Amount", type: "text" },
            { name: "frequency", label: "Frequency", type: "select", options: FREQUENCY_OPTIONS },
          ]}
        />
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
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
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No classes yet</p>
            <p className="text-xs text-muted-foreground">
              Add a class under Academic before setting up fee charges.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {classes.map((cls) => {
            const rows = structures.filter((s) => s.classId === cls.id);
            return (
              <div key={cls.id} className="space-y-2">
                <h2 className="font-heading text-lg font-medium">{cls.name}</h2>
                {rows.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
                      <p className="text-sm text-muted-foreground">No charges set up yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="py-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Frequency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Badge variant="outline">{row.category}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {row.amount.toLocaleString(undefined, {
                                style: "currency",
                                currency: "PKR",
                                maximumFractionDigits: 0,
                              })}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.frequency === "ONE_TIME" ? "One-time" : row.frequency}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

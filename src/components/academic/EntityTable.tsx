"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Pencil, Trash2 } from "lucide-react";

// Slightly wider than the brief's literal `{ key, header }` — an optional `render`
// lets a page format a value (e.g. resolve a foreign-key id to a related record's
// name) without EntityTable needing to know about relations. Backwards compatible:
// omitting `render` falls back to sensible default formatting below.
export type EntityColumn = {
  key: string;
  header: string;
  render?: (row: Record<string, unknown>) => ReactNode;
};

interface EntityTableProps {
  fetchUrl: string;
  columns: EntityColumn[];
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
}

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "outline"}>{value ? "Yes" : "No"}</Badge>;
  }
  if (typeof value === "string" && ISO_DATETIME_RE.test(value)) {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return String(value);
}

export function EntityTable({ fetchUrl, columns, onEdit, onDelete }: EntityTableProps) {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      });

    return () => {
      cancelled = true;
    };
  }, [fetchUrl]);

  const showActions = Boolean(onEdit || onDelete);

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  if (items === null) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No records yet</p>
          <p className="text-xs text-muted-foreground">
            Records you add will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.header}</TableHead>
            ))}
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={String(row.id)}>
              {columns.map((c) => (
                <TableCell key={c.key}>
                  {c.render ? c.render(row) : formatCell(row[c.key])}
                </TableCell>
              ))}
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

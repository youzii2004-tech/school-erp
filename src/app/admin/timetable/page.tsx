import { TimetableGrid } from "@/components/timetable/TimetableGrid";

export default function AdminTimetablePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Timetable</h1>
        <p className="text-sm text-muted-foreground">
          Build the weekly class schedule for a section. Editing an entry means removing it and adding the corrected one.
        </p>
      </div>
      <TimetableGrid editable />
    </div>
  );
}

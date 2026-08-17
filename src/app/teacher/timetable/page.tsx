import { TimetableGrid } from "@/components/timetable/TimetableGrid";

export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Timetable</h1>
        <p className="text-sm text-muted-foreground">Your weekly teaching schedule.</p>
      </div>
      <TimetableGrid editable={false} />
    </div>
  );
}

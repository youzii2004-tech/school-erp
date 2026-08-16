import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";

export default function TeacherAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Mark daily attendance for a section.</p>
      </div>
      <AttendanceGrid />
    </div>
  );
}

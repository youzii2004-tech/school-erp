import { MarksEntryGrid } from "@/components/exams/MarksEntryGrid";

export default function TeacherMarksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Marks Entry</h1>
        <p className="text-sm text-muted-foreground">Enter marks for the exams and subjects assigned to you.</p>
      </div>
      <MarksEntryGrid />
    </div>
  );
}

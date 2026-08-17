import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Post updates targeted to everyone, a specific role, class, or section.
        </p>
      </div>
      <AnnouncementFeed />
    </div>
  );
}

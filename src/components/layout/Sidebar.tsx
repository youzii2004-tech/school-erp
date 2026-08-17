"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  Wallet,
  ClipboardList,
  GraduationCap,
  CalendarDays,
  Megaphone,
  BarChart3,
  ChevronDown,
  School,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

type IconType = ComponentType<{ className?: string }>;

type NavLeaf = { label: string; href: string; icon: IconType };
type NavGroup = { label: string; icon: IconType; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

// Role-scoped nav trees. ADMIN gets the full operational menu; TEACHER/STUDENT/PARENT
// are collapsed down to what those read-mostly portals actually need per the spec's
// role definitions (see docs/superpowers/specs/2026-08-16-school-erp-mvp-design.md,
// "Roles (v1)"). Only the /admin/academic/* routes exist as of this task — the rest
// are placeholders future tasks (8, 11, 14, 17, 19, 22, 24, 26) will fill in.
const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: Users },
    {
      label: "Academic",
      icon: BookOpen,
      children: [
        { label: "Sessions", href: "/admin/academic/sessions", icon: CalendarDays },
        { label: "Classes", href: "/admin/academic/classes", icon: BookOpen },
        { label: "Sections", href: "/admin/academic/sections", icon: BookOpen },
        { label: "Subjects", href: "/admin/academic/subjects", icon: BookOpen },
      ],
    },
    { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
    { label: "Fees", href: "/admin/fees", icon: Wallet },
    { label: "Examinations", href: "/admin/examinations", icon: ClipboardList },
    { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
    { label: "Timetable", href: "/admin/timetable", icon: CalendarDays },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "My Classes", href: "/teacher/classes", icon: Users },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck },
    { label: "Marks Entry", href: "/teacher/marks", icon: ClipboardList },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarDays },
    { label: "Announcements", href: "/teacher/announcements", icon: Megaphone },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
    { label: "Fees", href: "/student/fees", icon: Wallet },
    { label: "Results", href: "/student/results", icon: ClipboardList },
    { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
    { label: "Announcements", href: "/student/announcements", icon: Megaphone },
  ],
  PARENT: [
    { label: "Dashboard", href: "/parent", icon: LayoutDashboard },
    { label: "My Children", href: "/parent/children", icon: Users },
    { label: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
    { label: "Fees", href: "/parent/fees", icon: Wallet },
    { label: "Results", href: "/parent/results", icon: ClipboardList },
    { label: "Announcements", href: "/parent/announcements", icon: Megaphone },
  ],
};

const ROOT_HREFS = new Set(["/admin", "/teacher", "/student", "/parent"]);

function isActive(pathname: string, href: string) {
  if (ROOT_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ item, active }: { item: NavLeaf; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const containsActive = group.children.some((c) => isActive(pathname, c.href));
  const [open, setOpen] = useState(containsActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          containsActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 ml-4 space-y-0.5 border-l border-border pl-3">
          {group.children.map((child) => (
            <NavLink key={child.href} item={child} active={isActive(pathname, child.href)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <School className="size-5 text-primary" />
        <span className="font-heading text-sm font-semibold">School ERP</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) =>
          isGroup(item) ? (
            <NavGroupItem key={item.label} group={item} pathname={pathname} />
          ) : (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          )
        )}
      </nav>
    </aside>
  );
}

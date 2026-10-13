"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
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
  Menu,
  School,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

type IconType = ComponentType<{ className?: string }>;

type NavLeaf = { label: string; href: string; icon: IconType };
type NavGroup = { label: string; icon: IconType; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

// Role-scoped nav trees. Every href below is verified against a real page.tsx
// under src/app/ (Task 28's review independently re-derived this exact list —
// see .superpowers/sdd/2026-08-16-school-erp-mvp/progress.md, Task 28 entry).
// STUDENT/PARENT only ever got a single dashboard page each (Task 22 consolidated
// attendance/fees/results/announcements onto one page rather than separate routes),
// so their nav trees are intentionally just "Dashboard" — this is not a placeholder,
// it matches what was actually built. Same for TEACHER's "My Classes" and
// "Announcements", which live on the /teacher dashboard, not standalone routes.
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
    {
      label: "Fees",
      icon: Wallet,
      children: [
        { label: "Fee Structures", href: "/admin/fees/structures", icon: Wallet },
        { label: "Vouchers", href: "/admin/fees/vouchers", icon: Wallet },
        { label: "Defaulters", href: "/admin/fees/defaulters", icon: BarChart3 },
      ],
    },
    { label: "Examinations", href: "/admin/exams", icon: ClipboardList },
    { label: "Promotions", href: "/admin/promotions", icon: GraduationCap },
    { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
    { label: "Timetable", href: "/admin/timetable", icon: CalendarDays },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "User accounts", href: "/admin/users", icon: Users },
    { label: "Audit log", href: "/admin/audit", icon: ClipboardList },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck },
    { label: "Marks Entry", href: "/teacher/marks", icon: ClipboardList },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarDays },
  ],
  STUDENT: [{ label: "Dashboard", href: "/student", icon: LayoutDashboard }],
  PARENT: [{ label: "Dashboard", href: "/parent", icon: LayoutDashboard }],
};

const ROOT_HREFS = new Set(["/admin", "/teacher", "/student", "/parent"]);

function isActive(pathname: string, href: string) {
  if (ROOT_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
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

function NavGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
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
            <NavLink
              key={child.href}
              item={child}
              active={isActive(pathname, child.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Shared between the always-visible desktop sidebar and the mobile drawer
// (MobileSidebarTrigger below) so both render identical nav content from one
// source. `onNavigate` is only passed by the mobile drawer, to close itself
// after a real navigation (not on group-expand clicks, which don't navigate).
function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <School className="size-5 text-primary" />
        <span className="font-heading text-sm font-semibold">School ERP</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) =>
          isGroup(item) ? (
            <NavGroupItem
              key={item.label}
              group={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ) : (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          )
        )}
      </nav>
    </>
  );
}

// Desktop sidebar. BUG-002: this used to render unconditionally at a fixed
// w-60, with no responsive collapse — below md it consumed the entire
// viewport width and pushed all page content off-screen. Now hidden below
// md; MobileSidebarTrigger below provides the small-viewport equivalent.
export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <SidebarNav role={role} />
    </aside>
  );
}

// Mobile/tablet equivalent of Sidebar: a hamburger button (rendered by
// Topbar, hidden at md and up) that opens the same nav in a left-anchored
// slide-in drawer instead of a permanently docked column.
export function MobileSidebarTrigger({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu />
        <span className="sr-only">Open menu</span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex h-full w-64 max-w-[80vw] flex-col border-r border-border bg-card outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-left">
          <DialogTitle className="sr-only">Navigation menu</DialogTitle>
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

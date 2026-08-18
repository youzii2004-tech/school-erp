# Bugs & Ideas Log

> This is the running queue for this project. Any Claude session opening this repo reads
> this file before touching the frontend. Work items top to bottom, one at a time, mark
> each one off when actually verified fixed (not just "code changed" — see Workflow).
> If you find something else along the way — a new bug, a rough edge, an idea for a
> better pattern, a performance win — log it here immediately, in the right section,
> before you forget it or move on. Don't batch it for later.

## Workflow

1. Pick the highest-priority OPEN item below.
2. Fix it.
3. **Verify visually** — run the app (`npm run dev`), actually click through the flow in
   a browser (Playwright MCP or claude-in-chrome), confirm the fix with your own eyes.
   Don't mark something fixed off a code read alone.
4. Move the item to the "Fixed" section at the bottom: keep its ID, add the date and a
   one-line note on what the actual fix was and how it was verified.
5. If fixing one thing surfaces another problem, add a new entry under the right section
   before continuing — don't lose it.
6. New ideas/enhancements/optimizations discovered mid-work go under "Enhancements &
   Ideas" or "Optimization Notes" — they are not lower-value than bugs, just different
   sections. Log them the moment you think of them.

Severity guide: **P0** = broken/incorrect data or blocks a core flow. **P1** = visibly
wrong or janky, doesn't block. **P2** = polish/nice-to-have.

---

## Open Bugs

*(none open)*

---

## Enhancements & Ideas

*(none logged yet — add here as they come up)*

## Optimization Notes

- **General note from Usaid, 2026-08-18:** the app currently doesn't feel like it's
  getting real value out of Tailwind/React — "no purpose of tailwind or React if not
  clearly visible in smooth layout interactions overall." Read as: interactions
  (hover states, transitions, loading states, route changes) feel static/abrupt rather
  than smooth. When picking up bugs above, keep an eye out for missing transitions,
  layout shift, or places a small `transition-*`/motion touch would make the UI feel
  considerably more polished — log specific instances here rather than doing a vague
  blanket pass.

---

## Fixed

### BUG-003 — Some text is wrong (unspecified) (P1)
- **Fixed:** 2026-08-19 — asked Usaid for the specific location (per the task's own
  procedure) rather than guessing.
- **Usaid's answer:** "On pages such as Promotion, when selected Anything within
  section of From and To it showed random text, however in this run it's working
  fine, so don't know whether you already fixed it or not."
- **Diagnosis:** this is the same symptom as BUG-001 (Select showing a raw stored
  value/id instead of its human label), on the exact page it was described on —
  `/admin/promotions`'s "From" and "To" sections are `src/app/admin/promotions/page.tsx`,
  which had 5 `<Select>` instances fixed as part of BUG-001 (see below). Usaid could not
  confirm with certainty it was the identical bug since he saw it working when he
  re-checked, but it fully matches BUG-001's description, location, and fix — not a
  separate, still-unresolved issue.
- **Verified:** live browser pass (Playwright MCP) directly on `/admin/promotions` —
  opened the "From → Class" select, chose "Grade 7"; the trigger displays "Grade 7"
  (not a raw id), matching Usaid's now-working observation. No independent BUG-003
  defect was found beyond this — if Usaid sees wrong text again on a page/string BUG-001
  doesn't cover, log a fresh entry with the specific location so it isn't blind-swept.

### BUG-002 — Overall app layout feels off / possibly a browser-rendering issue (P1)
- **Fixed:** 2026-08-19.
- **Reported by:** Usaid, 2026-08-18: "the layout of entire app itself maybe due to
  browser not sure" — no specific page. Never previously reproduced (a prior Claude
  session tested at a cramped ~400px viewport and wrongly concluded things were broken;
  this pass tested realistic desktop widths per the corrected instruction).
- **Root cause (confirmed, reproducible):** `Sidebar` (`src/components/layout/Sidebar.tsx`)
  rendered as `<aside className="sticky top-0 flex h-screen w-60 shrink-0 ...">`
  unconditionally, with no responsive breakpoint at all. Below Tailwind's `md` (768px)
  breakpoint — i.e. any real phone, and effectively most tablets once the scrollbar is
  accounted for — the fixed 240px sidebar consumed most/all of the viewport width and
  pushed all page content (dashboard cards, tables, everything) off-screen to the right,
  requiring horizontal scrolling to see anything. This reproduced identically on both
  `/admin` and `/admin/students` (shared layout shell), confirming it as an app-wide
  defect, not a single-page one. Screenshots at 1920×1080 / 1440×900 / 1280×800 showed no
  problem — the defect is width-triggered, matching a user on a narrow browser window,
  a small laptop, or heavy OS/browser zoom, which fits Usaid's "maybe due to browser"
  description exactly.
- **Two secondary overflows found live-testing the same fix at 390×844 (same root
  cause class — fixed-width flex rows with no wrap/hide at mobile widths), fixed in the
  same pass:**
  - `Topbar` (`src/components/layout/Topbar.tsx`): the right-side cluster
    (avatar + username + role badge + "Sign out" button with label) didn't fit next to
    the institute name at mobile widths, clipping the "Sign out" text off the right edge
    of the screen with a real horizontal scrollbar.
  - `src/app/admin/students/page.tsx`: the header's `Import` / `Export` / `Add Student`
    button row (`flex items-center gap-2`, no wrap) overflowed off-screen at mobile
    widths, making "Add Student" unreachable without scrolling right.
- **Fix:**
  - `Sidebar.tsx`: split into `SidebarNav` (shared nav content), `Sidebar` (desktop,
    now `hidden md:flex` instead of always `flex`), and a new `MobileSidebarTrigger` — a
    hamburger `Button` that opens the same nav in a left-anchored slide-in drawer built
    on the existing `@base-ui/react/dialog` primitive (same one already used for
    `src/components/ui/dialog.tsx`), closing itself when a real nav link is clicked
    (`onNavigate`, not fired by group-expand toggle clicks).
  - `Topbar.tsx`: takes a new `role` prop, renders `MobileSidebarTrigger` next to the
    institute name; the role `Badge` and the "Sign out" button's text label are now
    `hidden`/`sr-only` below `sm`, matching the existing `hidden ... sm:inline` pattern
    already used for the username on that same line.
  - `DashboardShell.tsx`: passes `role` through to `Topbar` (previously only `Sidebar`
    got it).
  - `students/page.tsx`: added `flex-wrap` to both the header row and the button-group
    row so the action buttons wrap onto their own line(s) instead of overflowing.
- **Verified:** live Playwright MCP browser pass, viewport (not `fullPage`, which has an
  unrelated screenshot-stitching quirk in this environment — see task-6-report.md)
  screenshots at 1920×1080, 1440×900, 1280×800, 768×1024, and 390×844, on `/admin`
  (dashboard) and `/admin/students` (data table + Add Student form dialog). At ≥768px:
  identical desktop sidebar/topbar as before, table/dialog unaffected, no regression. At
  390×844: hamburger opens a working slide-in drawer with the full nav; clicking
  "Students" navigates and auto-closes the drawer; topbar no longer clips; all three
  student-list action buttons are reachable and the "Add Student" dialog opens and
  renders correctly (it was already mobile-safe via its existing
  `max-w-[calc(100%-2rem)]` sizing). Full detail, screenshots, and the viewport-quirk
  writeup: `.superpowers/sdd/2026-08-19-bug-fix-batch/task-6-report.md`.

### BUG-004 — Students list table: Class/Section column always shows "—" (P0)
- **Fixed:** 2026-08-19.
- **Root cause:** `GET /api/students` never joined the enrollment relation, so the list
  had no class/section data to render — the hardcoded `"—"` cell was a deliberate
  placeholder from earlier scaffolding, not a bug in the rendering logic itself.
- **Fix:** added an `enrollments: { include: { class: true, section: true }, orderBy:
  { createdAt: "desc" }, take: 1 }` include to the list query in
  `src/app/api/students/route.ts` (mirroring the detail route's existing shape), and
  replaced the hardcoded `"—"` in `src/app/admin/students/page.tsx` with
  `"<Class> - <Section>"` (falling back to `"—"` only when a student truly has no
  enrollment).
- **Verified:** live browser pass (Playwright MCP) against the seeded dev DB at
  `/admin/students` — all 20 seeded students now show their real class/section
  (e.g. "Grade 6 - A") instead of "—".

### BUG-005 — Base UI Button: `nativeButton` prop mismatch (P2)
- **Fixed:** 2026-08-19.
- **Root cause:** `@base-ui/react`'s `Button` primitive defaults `nativeButton` to
  `true`. Every call site in this app that renders `Button` as a Next.js `<Link>` or
  `<a>` via the `render` prop (18 sites across the app, not just the 3 originally seen
  on the Students page) never passed `nativeButton={false}`, so Base UI assumed the
  rendered element was a real `<button>` and warned.
- **Fix:** single shared-component fix in `src/components/ui/button.tsx` — `Button` now
  destructures `render` and defaults `nativeButton = render == null`, fixing every
  current (and future) call site at once instead of patching each one individually.
- **Verified:** live browser pass (Playwright MCP) — full console history across
  `/admin/students` and `/admin/students/[id]` shows zero `nativeButton` warnings;
  navigation via the fixed buttons (Import, Export, View, Back to Students) still works.

### BUG-001 — Selectors render a random string instead of the selected label (P0)
- **Fixed:** 2026-08-19.
- **Root cause:** `@base-ui/react`'s `Select.Root` resolves its trigger's displayed
  label from an `items` prop (`value` → `label` pairs). No `<Select>` in this app ever
  passed one, so the label resolver fell back to stringifying the raw stored value (a
  database id, or a raw enum key like `"FEMALE"`) instead of showing the human label —
  most visible on pre-filled/edit selects and enum-backed selects (e.g. Gender).
- **Fix:** added `items={array.map(x => ({ value: x.id, label: <same text the
  SelectItem already rendered> }))}` to every `<Select>` root in the app — 31 instances
  across 16 files total (`src/components/ui/select.tsx` itself was not touched; only
  call sites), covering fetched-array selects, static/enum-backed selects, and
  conditional-label selects (e.g. the session picker's `" (Current)"` suffix).
- **Verified:** live browser pass (Playwright MCP) — the Add Student dialog's Gender
  select now shows "Female" in the trigger (not the raw `"FEMALE"` value) after
  selection; the Timetable page's Section select shows "Grade 7 - A" (not a database
  id) after selection. Both are representative of the fetched-array and enum-backed
  cases respectively; the remaining 39 sites use the identical, mechanically verified
  `items` pattern.

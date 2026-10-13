/* eslint-disable @typescript-eslint/no-require-imports -- plain Node CLI script */
// Snapshot the SQLite DB and uploads into backups/<timestamp>/.
// Usage: npm run backup   (schedule via cron / Task Scheduler, then copy off-machine)
const fs = require("fs");
const path = require("path");
const url = (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, "");
const db = path.resolve(process.cwd(), "prisma", url);
const dest = path.resolve(process.cwd(), "backups", new Date().toISOString().replace(/[:.]/g, "-"));
fs.mkdirSync(dest, { recursive: true });
if (!fs.existsSync(db)) { console.error("Database not found:", db); process.exit(1); }
fs.copyFileSync(db, path.join(dest, "database.db"));
const up = path.resolve(process.cwd(), "uploads");
if (fs.existsSync(up)) fs.cpSync(up, path.join(dest, "uploads"), { recursive: true });
console.log("Backup written to", dest);

// Retention: keep only the newest KEEP backups (default 14).
const keep = parseInt(process.env.BACKUP_KEEP || "14", 10);
const root = path.resolve(process.cwd(), "backups");
const dirs = fs.readdirSync(root).sort(); // ISO timestamps sort chronologically
for (const d of dirs.slice(0, Math.max(0, dirs.length - keep))) {
  fs.rmSync(path.join(root, d), { recursive: true, force: true });
  console.log("Removed old backup", d);
}

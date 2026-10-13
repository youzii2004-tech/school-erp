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

# Backups

`npm run backup` copies the SQLite database and `uploads/` into `backups/<timestamp>/` and keeps the
newest 14 (`BACKUP_KEEP=30 npm run backup` to change). Run it from the app folder with the same
`DATABASE_URL` the app uses. **A backup on the same disk is not a backup**: copy `backups/` to a USB
drive or cloud folder as well.

## Schedule it

**Windows (Task Scheduler), daily at 20:00:**

```
schtasks /Create /SC DAILY /ST 20:00 /TN "School ERP backup" /TR "cmd /c cd /d C:\path\to\school-erp && npm run backup"
```

**Linux/macOS (cron), daily at 20:00:**

```
0 20 * * * cd /path/to/school-erp && npm run backup >> backups.log 2>&1
```

## Restore

1. Stop the app.
2. Copy `backups/<timestamp>/database.db` over the live database file (the path in `DATABASE_URL`, relative to `prisma/`).
3. Copy `backups/<timestamp>/uploads/` back to `uploads/`.
4. Start the app and check the dashboard.

Test a restore on a spare folder once before you need it.

Backups contain students' personal data. Keep them somewhere access-controlled and encrypted (e.g. BitLocker / an encrypted USB drive).

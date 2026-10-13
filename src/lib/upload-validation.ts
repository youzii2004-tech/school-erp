import path from "path";

export const ALLOWED_UPLOAD_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];

/** Returns the lowercased extension if allowed, otherwise null. */
export function safeUploadExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_UPLOAD_EXTENSIONS.includes(ext) ? ext : null;
}

/** studentId is interpolated into a filesystem path, so accept only id-like strings. */
export function isSafePathId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

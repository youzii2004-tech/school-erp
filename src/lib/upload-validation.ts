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

/** True if the leading bytes match the file type implied by `ext` (blocks e.g. HTML/EXE renamed to .pdf). */
export function matchesMagicBytes(buf: Uint8Array, ext: string): boolean {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => buf[offset + i] === b);
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return starts([0xff, 0xd8, 0xff]);
    case ".png":
      return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case ".gif":
      return starts([0x47, 0x49, 0x46, 0x38]);
    case ".webp":
      return starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8);
    case ".pdf":
      return starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
    default:
      return false;
  }
}

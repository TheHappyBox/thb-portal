/**
 * Shared brand-asset constants + validation, safe to import from BOTH client and
 * server (no secrets, no server-only deps). The upload server action is the
 * authoritative validator; the client uses these only for nicer UX.
 */

export const MAX_BRAND_ASSETS = 5;
export const MAX_BRAND_ASSET_BYTES = 10 * 1024 * 1024; // 10 MB

/** Accepted file extensions (print + vector formats included). */
export const ALLOWED_BRAND_ASSET_EXTENSIONS = ["png", "jpg", "jpeg", "svg", "pdf", "eps"] as const;

/** Canonical content-type we store per extension (EPS often lacks a browser MIME). */
export const EXTENSION_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  eps: "application/postscript",
};

/**
 * Only these render inline as <img>. Everything else (SVG/PDF/EPS) is shown as a
 * file icon + download link — we never parse untrusted markup (e.g. a scripted
 * SVG) inline in our own origin.
 */
export const INLINE_PREVIEW_CONTENT_TYPES = new Set(["image/png", "image/jpeg"]);

/** The `accept` attribute for the file picker (UX hint only — not enforcement). */
export const BRAND_ASSET_ACCEPT_ATTR =
  ".png,.jpg,.jpeg,.svg,.pdf,.eps,image/png,image/jpeg,image/svg+xml,application/pdf,application/postscript";

/** Lower-cased extension (without dot), or "" if none. */
export function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : "";
}

/** Whether a filename's extension is an allowed brand-asset type. */
export function isAllowedBrandAssetName(filename: string): boolean {
  return (ALLOWED_BRAND_ASSET_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

/** Human-readable size, e.g. 1536 -> "1.5 KB", 2_400_000 -> "2.3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

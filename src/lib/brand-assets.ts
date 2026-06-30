import "server-only";

import { createClient } from "@/lib/supabase/server";
import { INLINE_PREVIEW_CONTENT_TYPES } from "@/lib/brand-asset-types";

/**
 * Server-only loader for a company's brand assets. Reads run through the
 * account-scoped client, so RLS returns ONLY the caller's own rows, and signed
 * URLs are minted only for objects the caller can select (their own folder).
 */

export interface BrandAssetView {
  id: string;
  fileName: string;
  label: string | null;
  contentType: string;
  sizeBytes: number;
  /** True for raster types we render inline; false → file icon + download. */
  inlinePreview: boolean;
  /** Short-lived signed URL (inline for raster, attachment download otherwise). */
  url: string | null;
  createdAt: string;
}

const SIGNED_URL_TTL_SECONDS = 60;

export async function loadBrandAssets(): Promise<BrandAssetView[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brand_assets")
    .select("id, storage_path, file_name, label, content_type, size_bytes, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load brand assets: ${error.message}`);

  const views: BrandAssetView[] = [];
  for (const row of data ?? []) {
    const inlinePreview = INLINE_PREVIEW_CONTENT_TYPES.has(row.content_type);
    // Non-raster files download (attachment) rather than render — keeps a scripted
    // SVG/PDF from ever being framed inline in our origin.
    const { data: signed } = await supabase.storage
      .from("brand-assets")
      .createSignedUrl(
        row.storage_path,
        SIGNED_URL_TTL_SECONDS,
        inlinePreview ? undefined : { download: row.file_name },
      );

    views.push({
      id: row.id,
      fileName: row.file_name,
      label: row.label,
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      inlinePreview,
      url: signed?.signedUrl ?? null,
      createdAt: row.created_at,
    });
  }

  return views;
}

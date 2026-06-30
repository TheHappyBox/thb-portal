"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  EXTENSION_CONTENT_TYPE,
  MAX_BRAND_ASSETS,
  MAX_BRAND_ASSET_BYTES,
  extensionOf,
  isAllowedBrandAssetName,
} from "@/lib/brand-asset-types";

/**
 * Brand-asset server actions. The upload action is the AUTHORITATIVE validator
 * (type + size + per-account limit) — client checks are UX only. Every action
 * re-verifies the user and relies on account-scoped RLS (both the brand_assets
 * table and the storage bucket), so a company can only ever touch its own files.
 */

export type BrandAssetActionState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | undefined;

const BUCKET = "brand-assets";

async function requireAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ error: string } | { accountId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: profile, error } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) return { error: "Could not load your account." };
  return { accountId: profile.account_id as string };
}

/** Upload one brand asset to the account's private folder + record it. */
export async function uploadBrandAsset(
  _prev: BrandAssetActionState,
  formData: FormData,
): Promise<BrandAssetActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Please choose a file to upload." };
  }
  if (!isAllowedBrandAssetName(file.name)) {
    return { status: "error", message: "Unsupported file type. Use PNG, JPG, SVG, PDF, or EPS." };
  }
  if (file.size > MAX_BRAND_ASSET_BYTES) {
    return { status: "error", message: "That file is larger than the 10 MB limit." };
  }
  const ext = extensionOf(file.name);
  const contentType = EXTENSION_CONTENT_TYPE[ext] ?? "application/octet-stream";

  const supabase = await createClient();
  const auth = await requireAccount(supabase);
  if ("error" in auth) return { status: "error", message: auth.error };

  // Enforce the 5-asset limit (app-level, per spec).
  const { count, error: countError } = await supabase
    .from("brand_assets")
    .select("id", { count: "exact", head: true })
    .eq("account_id", auth.accountId);
  if (countError) {
    return { status: "error", message: `Could not check your assets: ${countError.message}` };
  }
  if ((count ?? 0) >= MAX_BRAND_ASSETS) {
    return {
      status: "error",
      message: `You can store up to ${MAX_BRAND_ASSETS} logos. Remove one to add another.`,
    };
  }

  // Path is keyed by account id → structural isolation; storage RLS enforces it.
  const storagePath = `${auth.accountId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });
  if (uploadError) {
    return { status: "error", message: `Upload failed: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("brand_assets").insert({
    account_id: auth.accountId,
    storage_path: storagePath,
    file_name: file.name,
    content_type: contentType,
    size_bytes: file.size,
  });
  if (insertError) {
    // Don't leave an orphaned object if the row insert fails.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { status: "error", message: `Could not save the asset: ${insertError.message}` };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Logo uploaded." };
}

/** Edit an asset's optional label (RLS scopes the update to the owner). */
export async function updateBrandAssetLabel(
  _prev: BrandAssetActionState,
  formData: FormData,
): Promise<BrandAssetActionState> {
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!id) return { status: "error", message: "Missing asset." };

  const supabase = await createClient();
  const auth = await requireAccount(supabase);
  if ("error" in auth) return { status: "error", message: auth.error };

  const { error } = await supabase
    .from("brand_assets")
    .update({ label: label || null })
    .eq("id", id);
  if (error) return { status: "error", message: `Could not save the label: ${error.message}` };

  revalidatePath("/settings");
  return { status: "success", message: "Label saved." };
}

/** Delete an asset: remove the storage object, then the row. */
export async function deleteBrandAsset(
  _prev: BrandAssetActionState,
  formData: FormData,
): Promise<BrandAssetActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing asset." };

  const supabase = await createClient();
  const auth = await requireAccount(supabase);
  if ("error" in auth) return { status: "error", message: auth.error };

  // RLS scopes this select to the caller's own rows.
  const { data: row, error: rowError } = await supabase
    .from("brand_assets")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (rowError) return { status: "error", message: rowError.message };
  if (!row) return { status: "error", message: "That asset could not be found." };

  // Storage RLS scopes this to the caller's own `<account_id>/` folder.
  const { error: objectError } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
  if (objectError) {
    return { status: "error", message: `Could not delete the file: ${objectError.message}` };
  }

  const { error: deleteError } = await supabase.from("brand_assets").delete().eq("id", id);
  if (deleteError) {
    return { status: "error", message: `Could not delete the asset: ${deleteError.message}` };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Logo removed." };
}

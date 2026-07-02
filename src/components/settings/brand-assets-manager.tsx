"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  uploadBrandAsset,
  updateBrandAssetLabel,
  deleteBrandAsset,
  type BrandAssetActionState,
} from "@/app/settings/brand-assets-actions";
import {
  BRAND_ASSET_ACCEPT_ATTR,
  MAX_BRAND_ASSETS,
  extensionOf,
  formatBytes,
} from "@/lib/brand-asset-types";
import type { BrandAssetView } from "@/lib/brand-assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandAssetsManager({ assets }: { assets: BrandAssetView[] }) {
  const atLimit = assets.length >= MAX_BRAND_ASSETS;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {assets.length}/{MAX_BRAND_ASSETS} logos stored
      </p>

      {assets.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </ul>
      )}

      {atLimit ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You&apos;ve reached the limit of {MAX_BRAND_ASSETS} logos. Remove one to add another.
        </p>
      ) : (
        <UploadForm />
      )}
    </div>
  );
}

function UploadSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? "Uploading…" : "Upload logo"}
    </Button>
  );
}

function UploadForm() {
  const [state, action] = useActionState<BrandAssetActionState, FormData>(
    uploadBrandAsset,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand-asset-file">Add a logo</Label>
        <input
          id="brand-asset-file"
          name="file"
          type="file"
          accept={BRAND_ASSET_ACCEPT_ATTR}
          required
          className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
        />
        <span className="text-xs text-muted-foreground">PNG, JPG, SVG, PDF, or EPS · up to 10 MB.</span>
      </div>
      <Feedback state={state} />
      <UploadSubmit />
    </form>
  );
}

function AssetCard({ asset }: { asset: BrandAssetView }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {asset.inlinePreview && asset.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.label || asset.fileName} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {extensionOf(asset.fileName) || "file"}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium text-foreground" title={asset.fileName}>
            {asset.fileName}
          </p>
          <p className="text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</p>
          {asset.url && !asset.inlinePreview && (
            <a
              href={asset.url}
              className="mt-1 w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Download
            </a>
          )}
        </div>
      </div>

      <LabelForm assetId={asset.id} label={asset.label ?? ""} />
      <DeleteForm assetId={asset.id} fileName={asset.fileName} />
    </li>
  );
}

function LabelForm({ assetId, label }: { assetId: string; label: string }) {
  const [state, action] = useActionState<BrandAssetActionState, FormData>(
    updateBrandAssetLabel,
    undefined,
  );
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="id" value={assetId} />
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={`label-${assetId}`} className="text-xs text-muted-foreground">
          Label (optional)
        </Label>
        <Input
          id={`label-${assetId}`}
          name="label"
          defaultValue={label}
          placeholder="e.g. Primary, White version"
        />
      </div>
      <LabelSubmit />
      {state?.status === "error" && (
        <span className="text-xs text-red-600" role="alert">
          {state.message}
        </span>
      )}
    </form>
  );
}

function LabelSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function DeleteForm({ assetId, fileName }: { assetId: string; fileName: string }) {
  const [state, action] = useActionState<BrandAssetActionState, FormData>(
    deleteBrandAsset,
    undefined,
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={assetId} />
      <DeleteSubmit fileName={fileName} />
      {state?.status === "error" && (
        <span className="text-xs text-red-600" role="alert">
          {state.message}
        </span>
      )}
    </form>
  );
}

function DeleteSubmit({ fileName }: { fileName: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(`Remove "${fileName}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Removing…" : "Delete"}
    </Button>
  );
}

function Feedback({ state }: { state: BrandAssetActionState }) {
  if (!state) return null;
  const isSuccess = state.status === "success";
  return (
    <p
      role="alert"
      className={
        isSuccess
          ? "rounded-md bg-green-50 px-3 py-2 text-sm text-green-700"
          : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </p>
  );
}

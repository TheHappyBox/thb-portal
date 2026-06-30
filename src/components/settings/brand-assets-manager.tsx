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

export function BrandAssetsManager({ assets }: { assets: BrandAssetView[] }) {
  const atLimit = assets.length >= MAX_BRAND_ASSETS;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {assets.length}/{MAX_BRAND_ASSETS} logos stored
        </p>
      </div>

      {assets.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </ul>
      )}

      {atLimit ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
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
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
    >
      {pending ? "Uploading…" : "Upload logo"}
    </button>
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
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Add a logo</span>
        <input
          name="file"
          type="file"
          accept={BRAND_ASSET_ACCEPT_ATTR}
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200 dark:file:bg-gray-800 dark:hover:file:bg-gray-700"
        />
        <span className="text-xs text-gray-500">PNG, JPG, SVG, PDF, or EPS · up to 10 MB.</span>
      </label>
      <Feedback state={state} />
      <UploadSubmit />
    </form>
  );
}

function AssetCard({ asset }: { asset: BrandAssetView }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          {asset.inlinePreview && asset.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.label || asset.fileName} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-semibold uppercase text-gray-500">
              {extensionOf(asset.fileName) || "file"}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium" title={asset.fileName}>
            {asset.fileName}
          </p>
          <p className="text-xs text-gray-500">{formatBytes(asset.sizeBytes)}</p>
          {asset.url && !asset.inlinePreview && (
            <a
              href={asset.url}
              className="mt-1 w-fit text-xs font-medium underline"
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
      <label className="flex flex-1 flex-col gap-1 text-xs">
        <span className="font-medium text-gray-500">Label (optional)</span>
        <input
          name="label"
          defaultValue={label}
          placeholder="e.g. Primary, White version"
          className="rounded-md border border-gray-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        />
      </label>
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
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium transition hover:border-gray-400 disabled:opacity-50 dark:border-gray-700"
    >
      {pending ? "Saving…" : "Save"}
    </button>
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
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(`Remove "${fileName}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
    >
      {pending ? "Removing…" : "Delete"}
    </button>
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
          ? "rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
          : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
      }
    >
      {state.message}
    </p>
  );
}

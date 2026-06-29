"use client";

import { useFormStatus } from "react-dom";
import type { SettingsFormState } from "@/app/settings/actions";

/** A labelled text input, matching the neutral auth/dashboard styling. */
export function SettingsField({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  required = false,
  readOnly = false,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly}
        aria-readonly={readOnly}
        className={`rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:focus:border-white ${
          readOnly ? "cursor-not-allowed text-gray-500" : ""
        }`}
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

/** Submit button that disables + relabels while the action is pending. */
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/** Inline success/error message for a settings form. */
export function Feedback({ state }: { state: SettingsFormState }) {
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

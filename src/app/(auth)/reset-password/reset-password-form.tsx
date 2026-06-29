"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type AuthFormState } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
    >
      {pending ? "Please wait…" : "Set new password"}
    </button>
  );
}

/** Set a new password using the active recovery session. On success the action
 * redirects to the dashboard, so this only ever renders errors. */
export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">New password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        />
        <span className="text-xs text-gray-500">At least 8 characters.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        />
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, type ResetRequestState } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
    >
      {pending ? "Please wait…" : "Email me a reset link"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  );

  // Same confirmation whether or not the email is registered (no account probing).
  if (state?.status === "sent") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-gray-500">
          If an account exists for that address, we&apos;ve sent a link to reset your
          password. The link expires after a short while.
        </p>
        <Link href="/login" className="text-sm font-medium underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
          />
        </label>

        {state?.status === "error" && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {state.message}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-gray-500">
        Remembered it?{" "}
        <Link href="/login" className="font-medium underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

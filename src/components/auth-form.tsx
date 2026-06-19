"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthFormState } from "@/app/(auth)/actions";

type AuthAction = (
  prevState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
      />
    </label>
  );
}

/**
 * Shared sign-in / sign-up form. `mode` switches the extra fields and copy.
 * Errors returned by the server action are shown inline — failures never pass
 * silently.
 */
export function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: AuthAction;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    action,
    undefined,
  );
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {isSignup ? "Create your company account" : "Log in"}
        </h1>
        <p className="text-sm text-gray-500">
          {isSignup
            ? "Sign up to start sending corporate gifts at scale."
            : "Welcome back to The Happy Box portal."}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {isSignup && (
          <>
            <Field label="Company name" name="companyName" autoComplete="organization" />
            <Field
              label="Your name"
              name="fullName"
              autoComplete="name"
              required={false}
            />
          </>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
        />

        {state?.error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {state.error}
          </p>
        )}

        <SubmitButton label={isSignup ? "Create account" : "Log in"} />
      </form>

      <p className="text-center text-sm text-gray-500">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium underline">
              Create a company account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthAction = (
  prevState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Please wait…" : label}
    </Button>
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
    <div className="flex flex-col gap-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </div>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isSignup ? "Create your company account" : "Log in"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Sign up to start sending corporate gifts at scale."
              : "Welcome back to The Happy Box portal."}
          </CardDescription>
        </CardHeader>

        <CardContent>
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

            {!isSignup && (
              <Link
                href="/forgot-password"
                className="-mt-2 self-end text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            )}

            {state?.error && (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {state.error}
              </p>
            )}

            <SubmitButton label={isSignup ? "Create account" : "Log in"} />
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create a company account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Please wait…" : "Set new password"}
    </Button>
  );
}

/** Set a new password using the active recovery session. On success the action
 * redirects to the dashboard, so this only ever renders errors. */
export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <span className="text-xs text-muted-foreground">At least 8 characters.</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

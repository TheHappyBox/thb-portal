"use client";

import { useActionState } from "react";
import { changePassword, type SettingsFormState } from "@/app/settings/actions";
import { Feedback, SettingsField, SubmitButton } from "./form-bits";

/** Set a new password while logged in (new password + confirm). */
export function ChangePasswordForm() {
  const [state, action] = useActionState<SettingsFormState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <SettingsField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
      />
      <SettingsField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
      />
      <Feedback state={state} />
      <SubmitButton label="Update password" />
    </form>
  );
}

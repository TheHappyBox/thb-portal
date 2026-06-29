"use client";

import { useActionState } from "react";
import { updateProfile, type SettingsFormState } from "@/app/settings/actions";
import { Feedback, SettingsField, SubmitButton } from "./form-bits";

/** Edit the logged-in user's own profile (name). Email is read-only for now. */
export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState<SettingsFormState, FormData>(
    updateProfile,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <SettingsField
        label="Your name"
        name="fullName"
        defaultValue={fullName}
        autoComplete="name"
      />
      <SettingsField
        label="Email"
        name="email"
        type="email"
        defaultValue={email}
        readOnly
        hint="Email changes aren't available yet."
      />
      <Feedback state={state} />
      <SubmitButton label="Save profile" />
    </form>
  );
}

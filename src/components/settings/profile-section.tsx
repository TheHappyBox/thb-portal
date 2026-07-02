"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type SettingsFormState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadRow, SavedNote, SectionError } from "@/components/settings/section-bits";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/** View-by-default profile section; "Edit" reveals a Save/Cancel form. */
export function ProfileSection({ fullName, email }: { fullName: string; email: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<SettingsFormState, FormData>(updateProfile, undefined);

  // Return to the read-only view once a save succeeds (updated values come back
  // via the page's revalidation).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the form once the save action reports success
    if (state?.status === "success") setEditing(false);
  }, [state]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Your profile</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Your name</Label>
              <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={email} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                Email changes aren&apos;t available yet.
              </p>
            </div>
            <SectionError state={state} />
            <div className="flex gap-2">
              <SaveButton />
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className="flex flex-col gap-3">
            <ReadRow label="Name" value={fullName || "—"} />
            <ReadRow label="Email" value={email} />
            <SavedNote state={state} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

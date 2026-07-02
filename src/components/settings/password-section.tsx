"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { changePassword, type SettingsFormState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedNote, SectionError } from "@/components/settings/section-bits";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Update password"}
    </Button>
  );
}

/** Password has nothing to display, so it stays collapsed behind a button. */
export function PasswordSection() {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<SettingsFormState, FormData>(changePassword, undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the form once the save action reports success
    if (state?.status === "success") setEditing(false);
  }, [state]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Password</CardTitle>
          <CardDescription>Set a new password for signing in.</CardDescription>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change password
          </Button>
        )}
      </CardHeader>
      {(editing || state?.status === "success") && (
        <CardContent>
          {editing ? (
            <form action={action} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
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
            <SavedNote state={state} />
          )}
        </CardContent>
      )}
    </Card>
  );
}

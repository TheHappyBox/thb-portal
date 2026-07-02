"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateCompany, type SettingsFormState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadRow, SavedNote, SectionError } from "@/components/settings/section-bits";

export interface CompanyInfo {
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/** Format the stored address parts into a readable block, or a dash if empty. */
function formatAddress(c: CompanyInfo): string {
  const parts = [
    c.address_line1,
    c.address_line2,
    [c.city, c.region].filter(Boolean).join(", "),
    c.postal_code,
    c.country,
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join("\n") : "No address on file yet";
}

/** View-by-default company section; "Edit" reveals a Save/Cancel form. */
export function CompanySection({ company }: { company: CompanyInfo }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<SettingsFormState, FormData>(updateCompany, undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the form once the save action reports success
    if (state?.status === "success") setEditing(false);
  }, [state]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Company info</CardTitle>
          <CardDescription>
            Your company&apos;s details — used on your orders. This is your company, not The Happy
            Box.
          </CardDescription>
        </div>
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
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={company.name}
                autoComplete="organization"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                defaultValue={company.address_line1 ?? ""}
                autoComplete="address-line1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input
                id="addressLine2"
                name="addressLine2"
                defaultValue={company.address_line2 ?? ""}
                autoComplete="address-line2"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={company.city ?? ""} autoComplete="address-level2" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="region">Province / region</Label>
                <Input id="region" name="region" defaultValue={company.region ?? ""} autoComplete="address-level1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input id="postalCode" name="postalCode" defaultValue={company.postal_code ?? ""} autoComplete="postal-code" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue={company.country ?? ""} autoComplete="country-name" />
              </div>
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
            <ReadRow label="Company name" value={company.name} />
            <div className="flex flex-col">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Address
              </dt>
              <dd className="whitespace-pre-line text-foreground">{formatAddress(company)}</dd>
            </div>
            <SavedNote state={state} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { updateCompany, type SettingsFormState } from "@/app/settings/actions";
import { Feedback, SettingsField, SubmitButton } from "./form-bits";

export interface CompanyInfo {
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
}

/** Edit the buyer company's own name + mailing address. */
export function CompanyForm({ company }: { company: CompanyInfo }) {
  const [state, action] = useActionState<SettingsFormState, FormData>(
    updateCompany,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <SettingsField
        label="Company name"
        name="name"
        defaultValue={company.name}
        autoComplete="organization"
        required
      />
      <SettingsField
        label="Address line 1"
        name="addressLine1"
        defaultValue={company.address_line1 ?? ""}
        autoComplete="address-line1"
      />
      <SettingsField
        label="Address line 2"
        name="addressLine2"
        defaultValue={company.address_line2 ?? ""}
        autoComplete="address-line2"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SettingsField
          label="City"
          name="city"
          defaultValue={company.city ?? ""}
          autoComplete="address-level2"
        />
        <SettingsField
          label="Province / region"
          name="region"
          defaultValue={company.region ?? ""}
          autoComplete="address-level1"
        />
        <SettingsField
          label="Postal code"
          name="postalCode"
          defaultValue={company.postal_code ?? ""}
          autoComplete="postal-code"
        />
        <SettingsField
          label="Country"
          name="country"
          defaultValue={company.country ?? ""}
          autoComplete="country-name"
        />
      </div>
      <Feedback state={state} />
      <SubmitButton label="Save company info" />
    </form>
  );
}

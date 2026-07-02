import type { SettingsFormState } from "@/app/settings/actions";

/** A labelled read-only value row for the view state of a settings section. */
export function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

/** Inline error shown inside a section's edit form. */
export function SectionError({ state }: { state: SettingsFormState }) {
  if (state?.status !== "error") return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.message}
    </p>
  );
}

/** Subtle "saved" confirmation shown in the view state after a successful save. */
export function SavedNote({ state }: { state: SettingsFormState }) {
  if (state?.status !== "success") return null;
  return <p className="text-sm font-medium text-brand-teal">{state.message}</p>;
}

"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import type { RecipientDraft } from "@/types/order";
import { blankRecipient, recipientIssues } from "@/lib/order-builder";
import { Button } from "@/components/ui/button";

/**
 * Bulk recipient upload. Parses .xlsx / .csv entirely in the browser (recipient
 * PII never hits our server until the buyer saves), previews the parsed rows with
 * any per-row issues flagged, then hands the rows up to be appended to the list.
 * A blank address defaults the row to self-claim (editable after import).
 */

const TEMPLATE_HEADERS = [
  "name",
  "email",
  "address_line1",
  "address_line2",
  "city",
  "region",
  "postal_code",
  "country",
  "message",
];

const EXAMPLE_ROW = [
  "Jane Doe",
  "jane@example.com",
  "123 Main St",
  "Suite 4",
  "Toronto",
  "ON",
  "M5V 1A1",
  "Canada",
  "Happy holidays from the team!",
];

// Map varied spreadsheet headers onto our recipient fields.
const HEADER_ALIASES: Record<string, keyof RecipientDraft> = {
  name: "fullName",
  full_name: "fullName",
  fullname: "fullName",
  email: "email",
  email_address: "email",
  address_line1: "addressLine1",
  address1: "addressLine1",
  address: "addressLine1",
  street: "addressLine1",
  address_line2: "addressLine2",
  address2: "addressLine2",
  city: "city",
  town: "city",
  region: "region",
  province: "region",
  state: "region",
  postal_code: "postalCode",
  postal: "postalCode",
  postcode: "postalCode",
  zip: "postalCode",
  country: "country",
  message: "message",
  note: "message",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function rowToRecipient(row: Record<string, unknown>): RecipientDraft {
  const r = blankRecipient();
  for (const [rawKey, value] of Object.entries(row)) {
    const field = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!field) continue;
    const text = value == null ? "" : String(value).trim();
    if (field === "selfClaim") continue; // not a text field
    (r as unknown as Record<string, string>)[field] = text;
  }
  // No address provided → assume they'll add it via a self-claim link.
  const hasAddress = r.addressLine1 || r.city || r.postalCode;
  r.selfClaim = !hasAddress;
  return r;
}

function downloadTemplate(bookType: "xlsx" | "csv") {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Recipients");
  XLSX.writeFile(wb, `recipients-template.${bookType}`, { bookType });
}

export function RecipientUpload({
  onImport,
}: {
  onImport: (recipients: RecipientDraft[]) => void;
}) {
  const [parsed, setParsed] = useState<RecipientDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        setError("That file has no sheets we could read.");
        setParsed(null);
        return;
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const recipients = rows
        .map(rowToRecipient)
        .filter((r) => r.fullName || r.email || r.addressLine1);
      if (recipients.length === 0) {
        setError("No recipient rows found. Check the column headers against the template.");
        setParsed(null);
        return;
      }
      setParsed(recipients);
    } catch (err) {
      setError(
        `Could not read that file: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      setParsed(null);
    }
  }

  function confirmImport() {
    if (parsed) onImport(parsed);
    setParsed(null);
    setFileName("");
  }

  const flagged = parsed?.filter((r) => recipientIssues(r).length > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-white p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Upload a list</h3>
        <p className="text-sm text-muted-foreground">
          Add many recipients at once from an Excel or CSV file.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => downloadTemplate("xlsx")}
          className="text-sm text-primary underline transition hover:text-primary/80"
        >
          Download Excel template
        </button>
        <button
          type="button"
          onClick={() => downloadTemplate("csv")}
          className="text-sm text-primary underline transition hover:text-primary/80"
        >
          Download CSV template
        </button>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-white">
        Choose file
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {parsed && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            Found <strong>{parsed.length}</strong> recipient
            {parsed.length === 1 ? "" : "s"}
            {flagged > 0 && (
              <span className="text-amber-700"> · {flagged} need attention</span>
            )}
            .
          </p>
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Delivery</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsed.map((r, i) => {
                  const issues = recipientIssues(r);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-foreground">{r.fullName || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.selfClaim ? "Self-claim link" : "Address provided"}
                      </td>
                      <td className="px-3 py-2 text-amber-700">
                        {issues.length > 0 ? issues.join("; ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={confirmImport}>
              Import {parsed.length} recipient{parsed.length === 1 ? "" : "s"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setParsed(null);
                setFileName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A single validation message rendered directly under the field it belongs to.
 *
 * `tone="error"` is a hard problem (blocks progress, e.g. a missing name);
 * `tone="advisory"` is a nudge that doesn't block (e.g. a missing address, since
 * the recipient can be sent a self-claim link instead).
 */
export function FieldError({
  children,
  tone = "error",
  id,
}: {
  children: React.ReactNode;
  tone?: "error" | "advisory";
  id?: string;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      className={`text-xs ${tone === "error" ? "text-destructive" : "text-amber-700"}`}
    >
      {children}
    </p>
  );
}

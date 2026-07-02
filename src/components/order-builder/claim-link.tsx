"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Shows a self-claim recipient's claim link with a Copy button, for the buyer to
 * send. The absolute URL is built from the current origin so it works in any
 * environment; it's resolved after mount to avoid a server/client mismatch.
 */
export function ClaimLink({ token }: { token: string }) {
  const path = `/claim/${token}`;
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read client-only origin once after mount
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the link is visible to copy manually.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="max-w-[14rem] truncate rounded bg-muted/40 px-2 py-1 text-xs text-foreground sm:max-w-xs">
        {url}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copy}
        className="shrink-0"
      >
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}

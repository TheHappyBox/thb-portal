import Link from "next/link";

/**
 * The Happy Box wordmark for the app header.
 *
 * PLACEHOLDER: renders a styled text wordmark in the brand display font + pink.
 * Swap to the real logo by replacing the inner <span> with a next/image of the
 * PNG (drop it in /public). This is the single place to change it. A crisp SVG
 * is a nice future upgrade over the PNG.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      aria-label="The Happy Box — home"
      className={`inline-flex items-center ${className}`}
    >
      <span className="font-heading text-xl font-semibold lowercase tracking-tight text-brand-pink">
        the happy box
      </span>
    </Link>
  );
}

/**
 * Product image with a warm on-brand placeholder. Every product's `image_url` is
 * null today — real photography arrives with the future Shopify sync — so this
 * renders a simple gift-box motif over a warm gradient when there's no image.
 */
export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} />;
  }

  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-12 w-12 text-primary/40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 12v9H4v-9" />
        <path d="M2 7h20v5H2z" />
        <path d="M12 22V7" />
        <path d="M12 7S10.5 3 8 3a2 2 0 0 0 0 4h4z" />
        <path d="M12 7s1.5-4 4-4a2 2 0 0 1 0 4h-4z" />
      </svg>
    </div>
  );
}

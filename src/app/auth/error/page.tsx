import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t verify that link. It may have expired or already been
        used. Please try logging in again.
      </p>
      <Link
        href="/login"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to log in
      </Link>
    </main>
  );
}

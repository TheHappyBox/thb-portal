import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-gray-500">
        We couldn&apos;t verify that link. It may have expired or already been
        used. Please try logging in again.
      </p>
      <Link href="/login" className="text-sm font-medium underline">
        Back to log in
      </Link>
    </main>
  );
}

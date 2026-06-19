import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm font-medium text-gray-500">The Happy Box</span>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
          Corporate gifting, at scale.
        </h1>
        <p className="max-w-md text-lg text-gray-500">
          Browse, configure, and send curated gift boxes for your whole team —
          all from one company account.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/signup"
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Create a company account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-gray-300 px-6 py-3 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}

import { signOut } from "@/app/(auth)/actions";

/**
 * Sign-out control. Rendered as a tiny form so it can call the `signOut`
 * server action directly without any client-side JavaScript.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
      >
        Sign out
      </button>
    </form>
  );
}

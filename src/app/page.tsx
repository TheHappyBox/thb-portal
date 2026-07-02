import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">The Happy Box</span>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground">
          Corporate gifting, at scale.
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Browse, configure, and send curated gift boxes for your whole team —
          all from one company account.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button render={<Link href="/signup" />}>
          Create a company account
        </Button>
        <Button variant="outline" render={<Link href="/login" />}>
          Log in
        </Button>
      </div>
    </main>
  );
}

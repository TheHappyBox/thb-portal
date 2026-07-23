"use client";

import { useState } from "react";
import type { AuthFormState } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";

type AuthAction = (
  prevState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

/**
 * The single auth screen: the brand pitch on the left, the sign-in / sign-up form
 * on the right. The two states swap IN PLACE — no navigation, no page load — so
 * reaching a login form is never more than the first paint.
 *
 * Remounting the form on swap (via `key`) resets its action state, so an error
 * from one mode can never bleed into the other. The block is top-anchored so the
 * taller signup state grows downwards instead of re-centring the whole card,
 * which is what makes the swap feel jumpy.
 *
 * Rendered by /, /login and /signup — same component, different starting mode.
 */
export function AuthPage({
  initialMode,
  signInAction,
  signUpAction,
}: {
  initialMode: "signin" | "signup";
  signInAction: AuthAction;
  signUpAction: AuthAction;
}) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const isSignup = mode === "signup";

  return (
    <div className="grid w-full max-w-5xl gap-10 md:grid-cols-2 md:items-start md:gap-16">
      {/* Left: what this is */}
      <div className="flex flex-col gap-4 md:pt-8">
        <span className="text-[24px] font-extrabold text-brand-pink">The Happy Box</span>
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-navy">
          Corporate gifting, at scale.
        </h1>
        <p className="max-w-md text-lg text-brand-ink-soft">
          Browse, configure, and send curated gift boxes for your whole team — all from one
          company account.
        </p>
      </div>

      {/* Right: the form. The column reserves the taller (signup) height so
          swapping modes doesn't resize the block and re-centre the page — that's
          what makes the swap feel jumpy. Sign in simply leaves space below. */}
      <div className="md:min-h-[448px]">
        <AuthForm
          key={mode}
          mode={mode}
          action={isSignup ? signUpAction : signInAction}
          onSwitchMode={() => setMode(isSignup ? "signin" : "signup")}
        />
      </div>
    </div>
  );
}

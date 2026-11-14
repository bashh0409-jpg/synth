"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { SquareArrowRightExit } from "lucide-react";
import type { ReactNode } from "react";
import { reportClientError } from "@/lib/monitoring/client";

type SignOutButtonProps = {
  ariaLabel?: string;
  className?: string;
  icon?: ReactNode;
  label?: string;
  pendingLabel?: string;
};

export default function SignOutButton({
  ariaLabel,
  className,
  icon,
  label,
  pendingLabel,
}: SignOutButtonProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setErrorMessage("");
    setIsSigningOut(true);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = new Error("Supabase is not configured.");
      reportClientError("Unable to sign out.", error);
      setErrorMessage(error.message);
      setIsSigningOut(false);
      return;
    }

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.auth.signOut();

      if (error) {
        reportClientError("Unable to sign out.", error);
        setErrorMessage(error.message);
        setIsSigningOut(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      reportClientError("Unable to sign out.", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <button
        aria-label={
          isSigningOut
            ? (pendingLabel ?? "Signing out…")
            : (ariaLabel ?? (label ? undefined : "Sign out"))
        }
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
        className={
          className ??
          `cursor-pointer rounded-lg text-sm text-black/70 hover:bg-black/5 disabled:cursor-wait disabled:opacity-50 dark:text-white/80 dark:hover:bg-white/5 ${
            label
              ? "flex w-full items-center px-2 py-2 text-left"
              : "flex h-7 w-7 items-center justify-center p-1"
          }`
        }
      >
        {icon ?? <SquareArrowRightExit size={16} />}
        {label && (
          <span className="ml-2">
            {isSigningOut ? (pendingLabel ?? "Signing out…") : label}
          </span>
        )}
      </button>
      {errorMessage && (
        <span className="sr-only" role="alert">
          {errorMessage}
        </span>
      )}
    </>
  );
}

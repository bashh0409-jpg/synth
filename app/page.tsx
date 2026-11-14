"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function redirectSignedInUser() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          "Supabase is not configured. Check the public Supabase environment variables.",
        );
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;
      if (!isActive) return;

      if (data.user) {
        router.replace("/workspace");
        return;
      }

      setIsCheckingSession(false);
    }

    void redirectSignedInUser().catch((error: unknown) => {
      console.error("Unable to restore the saved sign-in session.", error);
      if (!isActive) return;

      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to check the saved sign-in session.",
      );
      setIsCheckingSession(false);
    });

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      {isCheckingSession ? (
        <p role="status">Checking your saved session...</p>
      ) : (
        <>
          {sessionError && (
            <p className="mb-3 text-center text-sm text-red-600" role="alert">
              {sessionError}
            </p>
          )}
          <a
            className="cursor-pointer rounded-full bg-black p-1 px-4 text-md font-semibold text-white hover:bg-black/80"
            href="/signin"
          >
            Sign in
          </a>
        </>
      )}
    </main>
  );
}

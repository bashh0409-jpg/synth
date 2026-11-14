"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { reportClientError } from "@/lib/monitoring/client";

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
      reportClientError("Unable to restore the saved sign-in session.", error);
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
     
        <svg className="animate-spin" role="status" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24px" width="24px" fill="#999"><path d="M8.13,21.21Q6.3,20.43 4.94,19.06Q3.58,17.7 2.79,15.88T2,11.99T2.79,8.11T4.94,4.94T8.13,2.79T12,2q0.43,0 0.71,0.29T13,3q0,0.42-0.29,0.71T12,4Q8.68,4 6.34,6.34T4,12t2.34,5.66T12,20t5.66-2.34T20,12q0-0.43 0.29-0.71T21,11q0.43,0 0.71,0.29T22,12q0,2.05-0.79,3.88t-2.15,3.19t-3.17,2.15T12.01,22T8.13,21.21Z"/></svg>
      ) : (
        <>
          {sessionError && (
            <p className="mb-3 text-center font-medium text-sm text-red-600" role="alert">
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

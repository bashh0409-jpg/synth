"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { Mail } from "lucide-react";
import { reportClientError } from "@/lib/monitoring/client";

export default function GoogleSignInButton() {
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "github" | "email" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  async function signInWithProvider(provider: "google" | "github") {
    setLoadingProvider(provider);
    setErrorMessage("");

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase is not configured. Check the public Supabase environment variables.");
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Fworkspace&sign_in_provider=${provider}`,
          ...(provider === "google"
            ? { queryParams: { prompt: "select_account" } }
            : {}),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      reportClientError(`Unable to start ${provider} sign-in.`, error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Unable to start ${provider} sign-in.`,
      );
      setLoadingProvider(null);
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingProvider("email");
    setErrorMessage("");
    setEmailSent(false);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          "Supabase is not configured. Check the public Supabase environment variables.",
        );
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fworkspace&sign_in_provider=email`,
        },
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
    } catch (error) {
      reportClientError("Unable to send the sign-in email.", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send the sign-in email.",
      );
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      {!isEmailMode ? (
        <>
          <button
            className="bg-black cursor-pointer hover:bg-black/80 disabled:cursor-wait disabled:opacity-70 text-white text-md p-1 px-4 rounded-full font-semibold"
            disabled={loadingProvider !== null}
            onClick={() => signInWithProvider("google")}
            type="button"
          >
            <span className="flex items-center justify-center gap-2">
              {loadingProvider !== "google" && (
                <FaGoogle aria-hidden="true" className="text-white" size={18} />
              )}
              {loadingProvider === "google"
                ? "Redirecting..."
                : "Continue with Google"}
            </span>
          </button>
          <button
            className="bg-black cursor-pointer hover:bg-black/80 disabled:cursor-wait disabled:opacity-70 text-white text-md p-1 px-4 rounded-full font-semibold"
            disabled={loadingProvider !== null}
            onClick={() => signInWithProvider("github")}
            type="button"
          >
            <span className="flex items-center justify-center gap-2">
              {loadingProvider !== "github" && (
                <FaGithub aria-hidden="true" className="text-white" size={18} />
              )}
              {loadingProvider === "github"
                ? "Redirecting..."
                : "Continue with GitHub"}
            </span>
          </button>
          <button
            className="bg-black cursor-pointer hover:bg-black/80 disabled:cursor-wait disabled:opacity-70 text-white text-md p-1 px-4 rounded-full font-semibold"
            onClick={() => {
              setIsEmailMode(true);
              setErrorMessage("");
            }}
            type="button"
          >
            <span className="flex items-center justify-center gap-2">
              <Mail aria-hidden="true" size={18} />
              Continue with email
            </span>
          </button>
        </>
      ) : (
        <>
          {emailSent ? (
            <p role="status" className="text-sm capitalize font-semibold tracking-tight text-[#999]">
               Check your email for a sign-in link.
            </p>
          ) : (
            <form
              className="flex w-full flex-col items-center gap-2"
              onSubmit={signInWithEmail}
            >
              <label className="sr-only" htmlFor="sign-in-email">
                Email address
              </label>
              <input
                autoComplete="email"
                className="w-full rounded-md font-medium bg-black/10  px-4 py-1  outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                id="sign-in-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                required
                type="email"
                value={email}
              />
              <button
                className="bg-black cursor-pointer hover:bg-black/80 disabled:cursor-wait disabled:opacity-70 text-white text-md p-1 px-4 rounded-full font-semibold"
                disabled={loadingProvider !== null}
                type="submit"
              >
                {loadingProvider === "email" ? "Sending..." : "Continue"}
              </button>
            </form>
          )}
          <button
            className="cursor-pointer text-sm hover:bg-black/10 disabled:cursor-wait disabled:opacity-70 rounded-md p-1 px-4 font-semibold"
            disabled={loadingProvider !== null}
            onClick={() => {
              setIsEmailMode(false);
              setEmailSent(false);
              setErrorMessage("");
            }}
            type="button"
          >
            <p className="text-sm capitalize font-medium tracking-tight text-black">
              Use another sign-in method
            </p>
          </button>
        </>
      )}
      {errorMessage && (
        <p
          className="text-sm max-w-sm leading-tight text-center font-medium p-2 bg-red-100 border-2 border-dashed border-red-200 rounded text-red-600"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

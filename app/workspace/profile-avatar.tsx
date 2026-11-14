"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { reportClientError } from "@/lib/monitoring/client";

export default function ProfileAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleAvatarUpdate(event: Event) {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setAvatarUrl(event.detail);
      }
    }

    window.addEventListener("profile-avatar-updated", handleAvatarUpdate);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      reportClientError(
        "Supabase is not configured. Check the public Supabase environment variables.",
        new Error("Missing Supabase environment variables."),
      );
      return () =>
        window.removeEventListener("profile-avatar-updated", handleAvatarUpdate);
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          reportClientError("Unable to load the signed-in user's profile.", error);
          return;
        }

        const user = data.user;
        if (!user) return;

        const picture =
          user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
        if (typeof picture === "string") {
          setAvatarUrl(picture);
        }

      })
      .catch((error: unknown) => {
        reportClientError("Unable to load the signed-in user's profile.", error);
      });

    return () =>
      window.removeEventListener("profile-avatar-updated", handleAvatarUpdate);
  }, []);

  return (
    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black/10 text-xs font-medium text-black/60">
      {avatarUrl ? (
        <img
          alt=""
          className="h-full w-full object-cover"
          onError={() => setAvatarUrl(null)}
          src={avatarUrl}
        />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="40"
          height="40"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="24" height="24" rx="6" fill="#6366F1" />
          <path
            fill="#fff"
            transform="translate(4.8 4.8) scale(0.6)"
            d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4776 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002H11.7225ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z"
          />
        </svg>
      )}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, RotateCwSquare, Settings } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import ProfileAvatar from "./profile-avatar";
import SignOutButton from "./sign-out-button";

type AccountFlyoutProps = {
  onOpenSettings: () => void;
};

function getNameFromEmail(email: string | null) {
  const username = email?.split("@")[0]?.split("+")[0];
  const name = username
    ?.replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

  return name || null;
}

export default function AccountFlyout({ onOpenSettings }: AccountFlyoutProps) {
  const [isAccountFlyoutOpen, setIsAccountFlyoutOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const userAgent = useSyncExternalStore(
    () => () => {},
    () => navigator.userAgent,
    () => "",
  );
  const deviceType = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    ? "Mobile phone"
    : "Desktop";
  const browserDetails = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Google Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Unknown browser";
  const accountFlyoutRef = useRef<HTMLDivElement>(null);
  const displayName = userFullName ?? getNameFromEmail(userEmail);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Supabase is not configured. Check the public Supabase environment variables.",
      );
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.error("Unable to load the signed-in user's email.", error);
          return;
        }

        const user = data.user;
        const fullName =
          user?.user_metadata?.full_name ?? user?.user_metadata?.name;

        setUserEmail(user?.email ?? null);
        setUserFullName(
          typeof fullName === "string" && fullName.trim()
            ? fullName.trim()
            : null,
        );
      })
      .catch((error: unknown) => {
        console.error("Unable to load the signed-in user's email.", error);
      });
  }, []);

  useEffect(() => {
    if (!isAccountFlyoutOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !accountFlyoutRef.current?.contains(event.target)
      ) {
        setIsAccountFlyoutOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAccountFlyoutOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountFlyoutOpen]);

  return (
    <div className="relative" ref={accountFlyoutRef}>
      {isAccountFlyoutOpen && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-black/10 bg-white py-3 shadow-xl dark:border-white/10 dark:bg-zinc-900"
          id="account-flyout"
          role="dialog"
          aria-label="Account options"
        >
          <aside className="h-fit ">
            <span className="flex px-3 flex-col">
              <div className="flex hidden items-center w-full justify-between">
                {" "}
                <p className="text-sm  font-medium tracking-tight text-black">
                  Profiles
                </p>
                <SignOutButton
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/5 text-sm font-medium tracking-tight text-black/60 transition-colors duration-200 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  icon={
                    <RotateCwSquare className="size-4" aria-hidden="true" />
                  }
                  ariaLabel="Switch account"
                />
              </div>
              <div className="flex gap-1  items-center">
                <span className="w-7 h-7">
                  <ProfileAvatar />
                </span>
                <span className="flex  flex-col">
                  <p className="geist text-xs capitalize font-medium tracking-tight">
                    {displayName ?? "Name unavailable"}
                  </p>
                  <p className="geist -mt-1 text-sm font-medium tracking-tight text-[#999]">
                    {userEmail ?? "Email unavailable"}
                  </p>
                </span>
              </div>
            </span>


            <div className="mt-2 px-3 border-t-2 border-black/5 ">
              <span className="flex mt-2 flex-col">
                <p className="text-sm  font-medium tracking-tight text-black">
                  Tokens
                </p>
                <p className="geist text-sm font-medium tracking-tight text-[#999]">
                  0
                </p>
              </span>
              <button className="flex mt-2 text-left  flex-col p-1 -ml-1 hover:bg-black/10 w-full rounded-md">

                <p className="text-sm  font-medium tracking-tight text-black">
                  Subscription
                </p>
                <p className="geist text-sm font-medium tracking-tight text-[#999]">
                  Pro
                </p>
              </button>
            </div>
            {/* <PasskeySettings /> */}

            <div className=" px-3 border-t-2 mt-1 border-black/5 ">
              <span className="flex mt-2 flex-col">
                <p className="text-sm  font-medium tracking-tight text-black">
                  Status
                </p>
                <p className="geist text-sm font-medium tracking-tight text-[#999]">
                  All systems operational
                </p>
              </span>

              <p className="text-sm mt-2 capitalize font-medium tracking-tight text-black">
                Devices
              </p>

              <p className="geist text-sm font-medium tracking-tight text-[#999]">
                <span className="flex gap-2 mt-1 capitalize items-center">
                  {" "}
                  {deviceType === "Mobile phone" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  )}{" "}
                  {browserDetails}
                </span>
              </p>
            </div>
            <div className="mt-1 px-3 border-t-2 border-black/5 ">
              <button
                className="-ml-1  p-1 gap-2 w-full mt-2 flex items-center rounded-md font-medium text-left text-sm tracking-tight hover:bg-black/10"
                onClick={() => {
                  setIsAccountFlyoutOpen(false);
                  onOpenSettings();
                }}
                type="button"
              >
                <Settings size={16} /> Settings
              </button>

              <span className="flex  mt-1   flex-col">
                <SignOutButton
                  className="-ml-1 p-1 flex items-center rounded-md font-medium  text-left text-sm tracking-tight hover:bg-black/10"
                  label="Sign out"
                />
              </span>
            </div>
          </aside>
        </div>
      )}
      <button
        aria-controls="account-flyout"
        aria-expanded={isAccountFlyoutOpen}
        aria-haspopup="dialog"
        aria-label="Open account options"
        className="flex h-7 cursor-pointer items-center justify-center rounded-lg p-1 text-black/40 duration-200 hover:bg-black/10"
        onClick={() => setIsAccountFlyoutOpen((open) => !open)}
        type="button"
      >
        <span className="aspect-square w-5">
          <ProfileAvatar />
        </span>
        <ChevronDown
          className={`ml-2 transition-transform ${isAccountFlyoutOpen ? "rotate-180" : ""}`}
          size={16}
        />
      </button>
    </div>
  );
}

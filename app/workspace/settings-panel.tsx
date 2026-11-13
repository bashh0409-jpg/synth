"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import {
  ArrowUpRight,
  ChevronsUpDown,
  CircleUserRound,
  Copy,
  Download,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  Monitor,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { createElement } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { FaGithub, FaGoogle } from "react-icons/fa";
import ProfileAvatar from "./profile-avatar";
import SegmentedToggle from "./SegmentedToggle";
import SignOutButton from "./sign-out-button";
import { GrApple, GrGoogle } from "react-icons/gr";
import { DiChrome } from "react-icons/di";

type SettingsPanelProps = {
  activeSection: string;
  onActiveSectionChange: (section: string) => void;
  onClose: () => void;
};

type SettingsItem = {
  title: string;
  icon: typeof Settings | "plan";
};

type Passkey = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

type TotpFactor = {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
};

type TotpEnrollment = {
  id: string;
  qrCode: string;
  secret: string;
};

const settingsGroups: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Personal",
    items: [
      { title: "Account", icon: CircleUserRound },
      { title: "Plan & Usage", icon: "plan" },
      { title: "Security & Privacy", icon: LockKeyhole },
    ],
  },
  {
    title: "Security",
    items: [{ title: "Passkeys", icon: KeyRound }],
  },
];

const navItemClass =
  "flex w-full font-medium mb-0.5 tracking-tight items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-black/60 transition-colors hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10";

  const subtleClass = "mt-0.5 text-xs text-black/45 dark:text-white/45 font-medium tracking-tight";

  function createConfiguredSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase is not configured. Check the public Supabase environment variables.",
      );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  function formatLastUsed(lastUsedAt?: string) {
    if (!lastUsedAt) return "Never";

    const date = new Date(lastUsedAt);
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
  }

export default function SettingsPanel({
  activeSection,
  onActiveSectionChange,
  onClose,
}: SettingsPanelProps) {
  const [search, setSearch] = useState("");
  const [usageMonth, setUsageMonth] = useState(() => new Date().getMonth());
  const [usageYear, setUsageYear] = useState(() => new Date().getFullYear());
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [signInMethod, setSignInMethod] = useState("Email");
  const [notice, setNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [hasLoadedPasskeys, setHasLoadedPasskeys] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [removingPasskeyId, setRemovingPasskeyId] = useState<string | null>(
    null,
  );
  const [passkeyError, setPasskeyError] = useState("");
  const [passkeyNotice, setPasskeyNotice] = useState("");
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [hasLoadedTotpFactors, setHasLoadedTotpFactors] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState<string[]>(() => Array(6).fill(""));
  const [isEnrollingTotp, setIsEnrollingTotp] = useState(false);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const [removingTotpId, setRemovingTotpId] = useState<string | null>(null);
  const [totpError, setTotpError] = useState("");
  const [totpNotice, setTotpNotice] = useState("");
  const [isTotpModalOpen, setIsTotpModalOpen] = useState(false);
  const [isTotpSecretCopied, setIsTotpSecretCopied] = useState(false);
  const [isTotpAutoConfirmPending, setIsTotpAutoConfirmPending] =
    useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const totpCodeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const totpCodeFormRef = useRef<HTMLFormElement>(null);
  const lastAutoSubmittedTotpCodeRef = useRef("");
  const totpCodeValue = totpCode.join("");
  const userAgent = useSyncExternalStore(
    () => () => {},
    () => navigator.userAgent,
    () => "",
  );
  const platform = /Mac/.test(userAgent)
    ? "macOS"
    : /Win/.test(userAgent)
      ? "Windows"
      : /Linux/.test(userAgent)
        ? "Linux"
        : "Unknown OS";
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Google Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  const device = `${platform} • ${browser}`;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const unavailablePlanAction = () =>
    setNotice("Billing isn't connected yet. No payment or plan changes were made.");

  const filteredGroups = useMemo(
    () =>
      settingsGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.title.toLowerCase().includes(search.trim().toLowerCase()),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [search],
  );

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const supportedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    if (!supportedTypes.has(file.type)) {
      setAvatarError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("The image must be 5 MB or smaller.");
      return;
    }

    setAvatarError("");
    setIsUploadingAvatar(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          "Supabase is not configured. Check the public Supabase environment variables.",
        );
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!userData.user) throw new Error("Sign in before changing your avatar.");

      const avatarPath = `${userData.user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
      const avatarUrl = new URL(data.publicUrl);
      avatarUrl.searchParams.set("v", Date.now().toString());

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl.toString() },
      });

      if (updateError) throw updateError;

      window.dispatchEvent(
        new CustomEvent("profile-avatar-updated", {
          detail: avatarUrl.toString(),
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload the avatar.";
      const normalizedMessage = message.toLowerCase();
      setAvatarError(
        normalizedMessage.includes("bucket not found")
          ? 'Supabase Storage bucket "avatars" was not found. Run the avatar setup migration in the Supabase project configured for this app.'
          : normalizedMessage.includes("row-level security")
            ? "Supabase blocked this upload. Run the latest avatar setup migration in the Supabase project configured for this app to apply the per-user Storage policies."
            : message,
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function addPasskey() {
    setPasskeyError("");
    setPasskeyNotice("");
    setIsAddingPasskey(true);

    try {
      if (!window.isSecureContext) {
        throw new Error("Passkeys require a secure connection (HTTPS).");
      }

      const supabase = createConfiguredSupabaseClient();
      const { data, error } = await supabase.auth.registerPasskey();

      if (error) throw error;
      if (!data) throw new Error("Passkey registration returned no passkey.");

      setPasskeys((current) => [
        data,
        ...current.filter((passkey) => passkey.id !== data.id),
      ]);
      setPasskeyNotice("Passkey added successfully.");
    } catch (error) {
      console.error("Unable to add a passkey.", error);
      setPasskeyError(
        error instanceof Error ? error.message : "Unable to add a passkey.",
      );
    } finally {
      setIsAddingPasskey(false);
    }
  }

  async function removePasskey(passkey: Passkey) {
    const passkeyName = passkey.friendly_name || "this passkey";
    if (!window.confirm(`Remove ${passkeyName}?`)) return;

    setPasskeyError("");
    setPasskeyNotice("");
    setRemovingPasskeyId(passkey.id);

    try {
      const supabase = createConfiguredSupabaseClient();
      const { error } = await supabase.auth.passkey.delete({
        passkeyId: passkey.id,
      });

      if (error) throw error;

      setPasskeys((current) =>
        current.filter((currentPasskey) => currentPasskey.id !== passkey.id),
      );
      setPasskeyNotice("Passkey removed.");
    } catch (error) {
      console.error("Unable to remove a passkey.", error);
      setPasskeyError(
        error instanceof Error ? error.message : "Unable to remove a passkey.",
      );
    } finally {
      setRemovingPasskeyId(null);
    }
  }

  async function refreshTotpFactors() {
    const supabase = createConfiguredSupabaseClient();
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) throw error;

    setTotpFactors(
      data.all
        .filter((factor) => factor.factor_type === "totp")
        .map((factor) => ({
          id: factor.id,
          friendly_name: factor.friendly_name,
          status: factor.status,
        })),
    );
  }

  async function startTotpEnrollment() {
    setTotpError("");
    setTotpNotice("");
    setIsEnrollingTotp(true);

    try {
      const supabase = createConfiguredSupabaseClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
        issuer: "Synthetic",
      });

      if (error) throw error;
      if (!data) throw new Error("Authenticator setup returned no data.");

      setTotpEnrollment({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setTotpCode(Array(6).fill(""));
      setIsTotpSecretCopied(false);
      setTotpFactors((current) => [
        ...current,
        {
          id: data.id,
          friendly_name: data.friendly_name,
          status: "unverified",
        },
      ]);
    } catch (error) {
      console.error("Unable to set up an authenticator app.", error);
      setTotpError(
        error instanceof Error
          ? error.message
          : "Unable to set up an authenticator app.",
      );
    } finally {
      setIsEnrollingTotp(false);
    }
  }

  function updateTotpCode(index: number, value: string) {
    lastAutoSubmittedTotpCodeRef.current = "";
    setIsTotpAutoConfirmPending(true);
    const digits = value.replace(/\D/g, "").slice(0, 6 - index);

    if (!digits) {
      setTotpCode((current) =>
        current.map((digit, currentIndex) =>
          currentIndex === index ? "" : digit,
        ),
      );
      return;
    }

    setTotpCode((current) => {
      const next = [...current];
      digits.split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });

    const nextIndex = Math.min(index + digits.length, 5);
    if (nextIndex !== index) {
      totpCodeInputRefs.current[nextIndex]?.focus();
    }
  }

  async function copyTotpSecret() {
    if (!totpEnrollment) return;

    try {
      await navigator.clipboard.writeText(totpEnrollment.secret);
      setIsTotpSecretCopied(true);
    } catch (error) {
      setTotpError(
        error instanceof Error
          ? error.message
          : "Unable to copy the authenticator setup key.",
      );
    }
  }

  const cancelTotpEnrollment = useCallback(async () => {
    if (isEnrollingTotp || isVerifyingTotp || removingTotpId !== null) return;

    setTotpError("");
    if (totpEnrollment) {
      setRemovingTotpId(totpEnrollment.id);
      try {
        const supabase = createConfiguredSupabaseClient();
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: totpEnrollment.id,
        });

        if (error) throw error;
        setTotpFactors((current) =>
          current.filter((factor) => factor.id !== totpEnrollment.id),
        );
      } catch (error) {
        setTotpError(
          error instanceof Error
            ? error.message
            : "Unable to cancel authenticator setup.",
        );
        return;
      } finally {
        setRemovingTotpId(null);
      }
    }

    setTotpEnrollment(null);
    setTotpCode(Array(6).fill(""));
    setIsTotpModalOpen(false);
  }, [
    isEnrollingTotp,
    isVerifyingTotp,
    removingTotpId,
    totpEnrollment,
  ]);

  async function verifyTotpCode() {
    if (!totpEnrollment) return;

    const code = totpCode.join("");
    if (!/^\d{6}$/.test(code)) {
      setTotpError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setTotpError("");
    setTotpNotice("");
    setIsVerifyingTotp(true);

    try {
      const supabase = createConfiguredSupabaseClient();
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: totpEnrollment.id,
        });

      if (challengeError) throw challengeError;
      if (!challenge) throw new Error("Could not start code verification.");

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpEnrollment.id,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) throw verifyError;

      setTotpEnrollment(null);
      setTotpCode(Array(6).fill(""));
      setIsTotpModalOpen(false);
      setTotpNotice("Authenticator app enabled.");

      try {
        await refreshTotpFactors();
      } catch (error) {
        console.error("Unable to refresh authenticator factors.", error);
        setTotpError(
          "The code was verified, but the authenticator list could not be refreshed. Reopen this section to check its status.",
        );
      }
    } catch (error) {
      console.error("Unable to verify the authenticator code.", error);
      setTotpError(
        error instanceof Error
          ? error.message
          : "Unable to verify the authenticator code.",
      );
    } finally {
      setIsVerifyingTotp(false);
    }
  }

  async function removeTotpFactor(factor: TotpFactor) {
    const factorName = factor.friendly_name || "this authenticator app";
    if (!window.confirm(`Remove ${factorName}?`)) return;

    setTotpError("");
    setTotpNotice("");
    setRemovingTotpId(factor.id);

    try {
      const supabase = createConfiguredSupabaseClient();
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (error) throw error;

      setTotpFactors((current) =>
        current.filter((currentFactor) => currentFactor.id !== factor.id),
      );
      if (totpEnrollment?.id === factor.id) {
        setTotpEnrollment(null);
        setTotpCode(Array(6).fill(""));
      }
      setTotpNotice("Authenticator removed.");
    } catch (error) {
      console.error("Unable to remove the authenticator.", error);
      setTotpError(
        error instanceof Error
          ? error.message
          : "Unable to remove the authenticator.",
      );
    } finally {
      setRemovingTotpId(null);
    }
  }

  function downloadProfileDetails() {
    const profile = {
      name: userName,
      email: userEmail,
      signInMethod,
      exportedAt: new Date().toISOString(),
    };
    const file = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synthetic-profile.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function openBrowserSettings(section: "site" | "ads" | "advanced") {
    const site = encodeURIComponent(window.location.origin);
    const settingsUrlBySection = {
      GoogleChrome: {
        site: `chrome://settings/content/siteDetails?site=${site}`,
        ads: "chrome://settings/adPrivacy",
        advanced: "chrome://settings/security",
      },
      MicrosoftEdge: {
        site: `edge://settings/content/siteDetails?site=${site}`,
        ads: "edge://settings/privacy",
        advanced: "edge://settings/privacy",
      },
      Firefox: {
        site: "about:preferences#privacy",
        ads: "about:preferences#privacy",
        advanced: "about:preferences#privacy",
      },
    };
    const browserSettingsKey =
      browser === "Google Chrome"
        ? "GoogleChrome"
        : browser === "Microsoft Edge"
          ? "MicrosoftEdge"
          : browser === "Firefox"
            ? "Firefox"
            : null;
    const settingsUrl = browserSettingsKey
      ? settingsUrlBySection[browserSettingsKey][section]
      : null;

    if (settingsUrl) {
      window.open(settingsUrl, "_blank", "noopener,noreferrer");
      setNotice(
        "If your browser blocks this link, open the browser menu and choose Settings.",
      );
      return;
    }

    setNotice(
      browser === "Safari"
        ? "Open Safari > Settings to manage website permissions and privacy."
        : "Open your browser’s Settings to manage website permissions and privacy.",
    );
  }

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const callbackProvider = currentUrl.searchParams.get("sign_in_provider");
    const validCallbackProvider =
      callbackProvider === "google" ||
      callbackProvider === "github" ||
      callbackProvider === "email"
        ? callbackProvider
        : null;

    if (validCallbackProvider) {
      currentUrl.searchParams.delete("sign_in_provider");
      window.history.replaceState(
        window.history.state,
        "",
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      );
    }

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
          console.error("Unable to load account settings.", error);
          return;
        }

        const user = data.user;
        const provider = validCallbackProvider ??
          user.user_metadata?.last_sign_in_provider ??
          user.app_metadata?.provider ??
          user.identities?.[0]?.provider ??
          "email";
        const metadataName =
          user?.user_metadata?.full_name ?? user?.user_metadata?.name;
        const email = user?.email ?? "";
        const emailName = email.split("@")[0]?.split("+")[0] ?? "";
        const fallbackName = emailName
          .replace(/[._-]+/g, " ")
          .trim()
          .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

        setUserEmail(email);
        setSignInMethod(
          typeof provider === "string"
            ? provider === "google"
              ? "Google"
              : provider === "github"
                ? "GitHub"
                : provider === "email"
                  ? "Email"
                  : provider
            : "Email",
        );
        setUserName(
          typeof metadataName === "string" && metadataName.trim()
            ? metadataName.trim()
            : fallbackName,
        );
      })
      .catch((error: unknown) => {
        console.error("Unable to load account settings.", error);
      });
  }, []);

  useEffect(() => {
    if (activeSection !== "Passkeys") return;

    let isActive = true;

    async function loadPasskeys() {
      try {
        const supabase = createConfiguredSupabaseClient();
        const { data, error } = await supabase.auth.passkey.list();

        if (error) throw error;
        if (isActive) {
          setPasskeys(data ?? []);
          setPasskeyError("");
        }
      } catch (error) {
        console.error("Unable to load passkeys.", error);
        if (isActive) {
          setPasskeyError(
            error instanceof Error ? error.message : "Unable to load passkeys.",
          );
        }
      } finally {
        if (isActive) setHasLoadedPasskeys(true);
      }
    }

    void loadPasskeys();

    return () => {
      isActive = false;
    };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "Passkeys") return;

    let isActive = true;

    async function loadTotpFactors() {
      try {
        const supabase = createConfiguredSupabaseClient();
        const { data, error } = await supabase.auth.mfa.listFactors();

        if (error) throw error;
        if (isActive) {
          setTotpFactors(
            data.all
              .filter((factor) => factor.factor_type === "totp")
              .map((factor) => ({
                id: factor.id,
                friendly_name: factor.friendly_name,
                status: factor.status,
              })),
          );
          setTotpError("");
        }
      } catch (error) {
        console.error("Unable to load authenticator factors.", error);
        if (isActive) {
          setTotpError(
            error instanceof Error
              ? error.message
              : "Unable to load authenticator factors.",
          );
        }
      } finally {
        if (isActive) setHasLoadedTotpFactors(true);
      }
    }

    void loadTotpFactors();

    return () => {
      isActive = false;
    };
  }, [activeSection]);

  useEffect(() => {
    if (!isTotpModalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void cancelTotpEnrollment();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelTotpEnrollment, isTotpModalOpen]);

  useEffect(() => {
    if (
      !isTotpModalOpen ||
      !totpEnrollment ||
      isVerifyingTotp ||
      !isTotpAutoConfirmPending ||
      totpCodeValue.length !== 6 ||
      lastAutoSubmittedTotpCodeRef.current === totpCodeValue
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!totpCodeFormRef.current) return;
      lastAutoSubmittedTotpCodeRef.current = totpCodeValue;
      setIsTotpAutoConfirmPending(false);
      totpCodeFormRef.current.requestSubmit();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [
    isTotpModalOpen,
    isTotpAutoConfirmPending,
    isVerifyingTotp,
    totpCodeValue,
    totpEnrollment,
  ]);

  return (
    <div className="flex min-h-0  flex-1 overflow-hidden dark:border-white/10">
      <aside className="w-48 shrink-0 overflow-y-auto  p-3 dark:border-white/10 dark:bg-zinc-950/60 sm:w-56">
        <label className="mb-4 flex h-7 items-center gap-2 rounded-lg border border-black/10 bg-white px-2 text-black/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
          <Search aria-hidden="true" size={15} />
          <input
            aria-label="Search settings"
            className="min-w-0 flex-1 font-medium bg-transparent text-sm outline-none placeholder:text-black/35 dark:placeholder:text-white/35"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            type="search"
            value={search}
          />
        </label>

        <nav aria-label="Settings sections" className="space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-1 px-2 text-xs font-semibold text-black/40 dark:text-white/40">
                {group.title}
              </h2>
              {group.items.map(({ title, icon }) => (
                <button
                  aria-current={activeSection === title ? "page" : undefined}
                  className={`${navItemClass} ${
                    activeSection === title
                      ? "bg-black/[0.07]  font-medium text-black dark:bg-white/10 dark:text-white"
                      : ""
                  }`}
                  key={title}
                  onClick={() => {
                    onActiveSectionChange(title);
                    setNotice("");
                  }}
                  type="button"
                >
                  {icon === "plan" ? (
                    <svg
                      aria-hidden="true"
                      className="shrink-0"
                      fill="currentColor"
                      height="15"
                      viewBox="0 0 24 24"
                      width="15"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M6,20q-1.65,0-2.83-1.18T2,16V8Q2,6.35 3.18,5.18T6,4H18q1.65,0 2.83,1.18T22,8v8q0,1.65-1.17,2.82T18,20H6ZM6,8H18q0.55,0 1.05,0.13T20,8.52V8q0-0.82-0.59-1.41T18,6H6Q5.18,6 4.59,6.59Q4,7.18 4,8V8.52q0.45-0.27 0.95-0.4T6,8ZM4.15,11.25l11.13,2.7q0.22,0.05 0.45,0t0.43-0.2l3.47-2.9q-0.27-0.38-0.7-0.61T18,10H6q-0.65,0-1.14,0.34q-0.49,0.34-0.71,0.91Z" />
                    </svg>
                  ) : (
                    createElement(icon, { "aria-hidden": true, size: 15 })
                  )}
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <section
        aria-labelledby="workspace-settings-heading"
        className="min-h-0 flex-1 border border-black/10 rounded-xl mr-4 mb-4 overflow-y-auto p-5 sm:p-8 shadow-[0_0_8px_rgba(0,0,0,0.08)] dark:border-white/10 dark:shadow-[0_0_8px_rgba(0,0,0,0.4)]"
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h1
              className="text-xl font-semibold"
              id="workspace-settings-heading"
            >
              {activeSection}
            </h1>
          </div>

          {activeSection === "Account" ? (
            <div className="space-y-6">
              <section aria-labelledby="profile-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="profile-heading"
                >
                  Profile
                </h2>
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex min-h-12 items-center justify-between border-b border-black/[0.07] px-3 dark:border-white/10">
                    <span className="text-sm font-medium">Avatar</span>
                    <div className="flex items-center gap-2">
                      {avatarError && (
                        <p
                          className="font-medium px-3 py-2 text-xs text-red-600 dark:border-white/10 dark:text-red-400"
                          role="alert"
                        >
                          {avatarError}
                        </p>
                      )}
                      <input
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        aria-label="Upload a new avatar"
                        className="sr-only"
                        onChange={handleAvatarUpload}
                        ref={avatarInputRef}
                        type="file"
                      />
                      <button
                        aria-label="Change avatar"
                        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-black/[0.04] outline-offset-2 hover:ring-2 hover:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:bg-white/10"
                        disabled={isUploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        type="button"
                      >
                        <ProfileAvatar />
                      </button>
                    </div>
                  </div>

                  <label className="flex min-h-12 items-center justify-between gap-4 border-b border-black/[0.07] px-3 dark:border-white/10">
                    <span className="text-sm font-medium">Your name</span>
                    <input
                      className="w-30 min-w-0 font-medium rounded-lg border border-black/10 bg-transparent px-2.5 py-1 text-sm dark:border-white/10"
                      readOnly
                      value={userName || "Name unavailable"}
                    />
                  </label>
                  <label className="flex min-h-12 items-center justify-between gap-4 px-3">
                    <span className="text-sm font-medium">Email</span>
                    <p className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45">
                      {userEmail || "Email unavailable"}
                    </p>
                  </label>
                </div>
              </section>
              <section aria-labelledby="preferences-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="preferences-heading"
                >
                  Preferences
                </h2>
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex min-h-14 items-center justify-between  px-3 dark:border-white/10">
                    <div>
                      <p className="text-sm font-medium">Spelling check</p>
                      <p className={subtleClass}>Check spelling as you type</p>
                    </div>
                    <SegmentedToggle
                      defaultValue="On"
                      options={["Off", "On"]}
                    />
                  </div>
                </div>
              </section>
              <section aria-labelledby="devices-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="devices-heading"
                >
                  Devices
                </h2>
                <div className="flex  flex-col  rounded-xl border border-black/10 bg-white  dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex px-3 min-h-14 gap-2 items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-black/60 dark:bg-white/10 dark:text-white/70">
                      <Monitor
                        aria-hidden="true"
                        className="shrink-0 text-black/50 dark:text-white/50"
                        size={20}
                      />
                    </span>
                    <div className="min-w-0  flex-1">
                      <p className="truncate text-sm capitalize font-medium">
                        {device}
                      </p>

                      <p className="truncate font-medium text-sm text-[#999] dark:text-white/45">
                        Active now
                      </p>
                    </div>
                  </div>
                  <div className="flex px-3 min-h-14 items-center gap-3 border-t border-black/[0.07] dark:border-white/10">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-black/60 dark:bg-white/10 dark:text-white/70">
                      {signInMethod === "Google" ? (
                        <FaGoogle aria-hidden="true" size={16} />
                      ) : signInMethod === "GitHub" ? (
                        <FaGithub aria-hidden="true" size={16} />
                      ) : (
                        <Mail aria-hidden="true" size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Signed in with {signInMethod}
                      </p>
                      <p className="truncate text-sm font-medium text-[#999] dark:text-white/45">
                        {userEmail}
                      </p>
                    </div>
                    <SignOutButton
                      className="flex items-center rounded-lg border border-black/10 px-2 py-1 text-sm font-medium hover:bg-black/5 disabled:cursor-wait disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                      label="Sign out"
                    />
                  </div>
                </div>
              </section>
              <section aria-labelledby="danger-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="danger-heading"
                >
                  Danger zone
                </h2>
                <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-sm font-medium">Delete account</p>

                    <p className="truncate font-medium text-sm text-[#999] dark:text-white/45">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <button
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
                    onClick={() =>
                      setNotice(
                        "Account deletion is not available yet. No account data was changed.",
                      )
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </section>
            </div>
          ) : activeSection === "Security & Privacy" ? (
            <div className="space-y-7">
              <section aria-labelledby="privacy-data-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="privacy-data-heading"
                >
                  Privacy
                </h2>

                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  <button
                    className="flex min-h-14 w-full items-center justify-between gap-4 border-b border-black/[0.07] px-3 text-left hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.03]"
                    onClick={() => openBrowserSettings("site")}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        Site settings
                      </span>
                      <span className={`block ${subtleClass}`}>
                        Manage location, camera, pop-ups, and more
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="shrink-0 text-black/45 dark:text-white/45"
                      size={17}
                    />
                  </button>
                  <button
                    className="flex min-h-14 w-full items-center justify-between gap-4 px-3 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    onClick={() => openBrowserSettings("advanced")}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        Advanced
                      </span>
                      <span className={`block ${subtleClass}`}>
                        Manage DNS, certificates, and Safe Browsing
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="shrink-0 text-black/45 dark:text-white/45"
                      size={17}
                    />
                  </button>
                </div>
              </section>

              <section aria-labelledby="your-data-heading">
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex min-h-14 items-center justify-between gap-4 px-3">
                    <div>
                      <p className="text-sm font-medium">
                        Download profile details
                      </p>
                      <p className={subtleClass}>
                        Export your name, email, and sign-in method as JSON.
                      </p>
                    </div>
                    <button
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                      onClick={downloadProfileDetails}
                      type="button"
                    >
                      <Download aria-hidden="true" size={14} />
                      Download
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : activeSection === "Passkeys" ? (
            <div className="space-y-6">
              <section aria-labelledby="passkeys-heading">
                <div className="mb-3 flex items-center justify-between gap-4 px-3">
                  <div>
                    <h2
                      className="text-sm font-medium text-black/45 dark:text-white/45"
                      id="passkeys-heading"
                    >
                      Passkeys
                    </h2>
                  </div>

                  <button
                    className="flex h-8 items-center  items-center rounded-lg border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                    disabled={isAddingPasskey || !hasLoadedPasskeys}
                    onClick={() => void addPasskey()}
                    type="button"
                  >
                    <Plus size={16} />
                    {isAddingPasskey ? "Adding..." : "Add passkey"}
                  </button>
                </div>

                {passkeyError && (
                  <p
                    className="mb-2 rounded bg-red-500/10 p-1 font-medium px-2 text-sm text-red-700 dark:text-red-300"
                    role="alert"
                  >
                    {passkeyError} an error hass occurd
                  </p>
                )}
                {passkeyNotice && (
                  <p
                    className="mb-3 font-medium rounded bg-emerald-500/10 p-1 px-2 text-sm text-emerald-700 dark:text-emerald-300"
                    role="status"
                  >
                    {passkeyNotice}
                  </p>
                )}

                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  {!hasLoadedPasskeys ? (
                    <p className="px-3 py-5 text-sm text-black/45 dark:text-white/45">
                      Loading passkeys...
                    </p>
                  ) : passkeyError ? null : passkeys.length === 0 ? (
                    <div className="flex min-h-24 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
                      <Fingerprint
                        aria-hidden="true"
                        className="text-black/40 dark:text-white/40"
                        size={22}
                      />
                      <p className="text-sm font-medium">No passkeys yet</p>
                      <button
                        className="flex h-8 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                        disabled={isAddingPasskey || !hasLoadedPasskeys}
                        onClick={() => void addPasskey()}
                        type="button"
                      >
                        <div className="text-[#EC4899]"></div>
                        {isAddingPasskey ? "Adding..." : "Add passkey"}
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2 px-3 py-2">
                      {passkeys.map((passkey, index) => {
                        const busy =
                          isAddingPasskey || removingPasskeyId !== null;
                        const passkeyName =
                          passkey.friendly_name || `Passkey ${index + 1}`;
                        const normalizedPasskeyName = passkeyName.toLowerCase();
                        const PasskeyIcon =
                          normalizedPasskeyName.includes("apple") ||
                          normalizedPasskeyName.includes("icloud")
                            ? GrApple
                            : normalizedPasskeyName.includes("google")
                              ? GrGoogle
                              : normalizedPasskeyName.includes("chrome")
                                ? DiChrome
                                : Fingerprint;

                        return (
                          <li
                            className="flex items-center justify-between gap-3 text-xs"
                            key={passkey.id}
                          >
                            <button
                              disabled={busy}
                              onClick={() => void removePasskey(passkey)}
                              type="button"
                              className="flex text-left min-w-0 flex-1 items-center gap-2"
                            >
                              <span className="bg-black/10 rounded-md p-1.5">
                                <PasskeyIcon
                                  aria-hidden="true"
                                  className="shrink-0 text-black/60 dark:text-white/60"
                                  size={17}
                                />
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span className="geist mt- truncate text-sm font-medium leading-4 tracking-tight text-green-500">
                                  {passkeyName}
                                </span>
                                <span className="geist capitalize text-sm font-medium tracking-tight text-[#999]">
                                  Last used:{" "}
                                  {formatLastUsed(passkey.last_used_at)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              <section aria-labelledby="authenticator-heading">
                <div className="mb-3 flex items-center justify-between gap-4 px-3">
                  <div></div>
                </div>

                {!isTotpModalOpen && totpError && (
                  <p
                    className="mb-2 rounded bg-red-500/10 px-2 py-1 text-sm font-medium text-red-700 dark:text-red-300"
                    role="alert"
                  >
                    {totpError}
                  </p>
                )}

                {totpNotice && (
                  <p
                    className="mb-3 rounded bg-emerald-500/10 px-2 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300"
                    role="status"
                  >
                    {totpNotice}
                  </p>
                )}

                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  {!hasLoadedTotpFactors ? (
                    <p className="px-3 py-5 font-medium text-sm text-black/45 dark:text-white/45">
                      Loading authenticator settings...
                    </p>
                  ) : totpFactors.length > 0 ? (
                    <ul>
                      {totpFactors.map((factor) => (
                        <li
                          className="flex min-h-14 items-center justify-between gap-3 border-b border-black/[0.07] px-3 last:border-b-0 dark:border-white/10"
                          key={factor.id}
                        >
                          <div className="flex items-center gap-3">
                            <span className="bg-black/10 rounded-md p-1.5 text-black/60 dark:bg-white/10 dark:text-white/60">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                                />
                              </svg>
                            </span>

                            <div>
                              <p className="text-sm font-medium">
                                {factor.friendly_name || "Authenticator app"}
                              </p>
                              <p className={subtleClass}>
                                {factor.status === "verified"
                                  ? "Enabled"
                                  : "Setup incomplete — remove it to start again"}
                              </p>
                            </div>
                          </div>
                          <button
                            className="rounded-lg border border-black/10 px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 disabled:cursor-wait disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                            disabled={removingTotpId !== null}
                            onClick={() => void removeTotpFactor(factor)}
                            type="button"
                          >
                            {removingTotpId === factor.id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex  flex-col items-center justify-center gap-2 px-4 py-5 text-center">
                      <p className="px-3 font-medium  text-center text-sm text-black/45 dark:text-white/45">
                        No authenticator app is connected.
                      </p>
                      {!totpEnrollment && totpFactors.length === 0 && (
                        <button
                          className="flex h-8 shrink-0 items-center rounded-full border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                          disabled={!hasLoadedTotpFactors || isEnrollingTotp}
                          onClick={() => {
                            setIsTotpModalOpen(true);
                            void startTotpEnrollment();
                          }}
                          type="button"
                        >
                          <Plus aria-hidden="true" size={15} />
                          {isEnrollingTotp
                            ? "Setting up..."
                            : "Add Authenticator"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeSection === "Plan & Usage" ? (
            <div className="space-y-7">
              <section aria-labelledby="plan-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="plan-heading"
                >
                  Plan
                </h2>
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex min-h-14 items-center justify-between border-b border-black/[0.07] px-3 dark:border-white/10">
                    <div>
                      <p className="text-sm font-medium">Free</p>
                    </div>
                    <button
                      className="rounded-lg bg-black px-2 py-1 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
                      onClick={unavailablePlanAction}
                      type="button"
                    >
                      Go Pro
                    </button>
                  </div>
                  <div className="flex min-h-14 items-center justify-between gap-4 px-3">
                    <div>
                      <p className="text-sm font-medium">No payment method</p>
                    </div>
                    <button
                      aria-label="Add payment method"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                      onClick={unavailablePlanAction}
                      type="button"
                    >
                      Open <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                  </div>
                </div>
                <h2
                  className="mb-2 mt-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="plan-heading"
                >
                  Invite friends
                </h2>
                <div className="mt-2 flex min-h-14 items-center justify-between gap-4 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-sm font-medium">
                      Invite your friends to Synthetic
                    </p>
                    <p className={subtleClass}>
                      You both get 50 credits after signup
                    </p>
                  </div>
                  <button
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    onClick={() =>
                      setNotice(
                        "Invites aren't available yet. No invite was sent.",
                      )
                    }
                    type="button"
                  >
                    <Copy aria-hidden="true" size={14} /> Invite
                  </button>
                </div>
              </section>

              <section aria-labelledby="credits-heading">
                <h2
                  className="mb-2 px-3 text-sm font-medium text-black/45 dark:text-white/45"
                  id="credits-heading"
                >
                  Credits
                </h2>
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="border-b border-black/[0.07] px-3 py-3 dark:border-white/10">
                    <p className="text-sm font-medium">
                      100% monthly credits remaining
                    </p>
                  </div>
                  <div className="flex min-h-14 items-center justify-between gap-4 border-b border-black/[0.07] px-3 dark:border-white/10">
                    <div>
                      <p className="text-sm font-medium">
                        Add-on balance — unavailable
                      </p>
                    </div>
                    <button
                      className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                      onClick={unavailablePlanAction}
                      type="button"
                    >
                      Buy credits
                    </button>
                  </div>
                  <div className="flex min-h-14 items-center justify-between gap-4 px-3">
                    <div>
                      <p className="text-sm font-medium">Auto-reload</p>
                      <p className={subtleClass}>
                        Add a payment method before enabling auto-reload
                      </p>
                    </div>
                    <button
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                      onClick={unavailablePlanAction}
                      type="button"
                    >
                      Add payment method{" "}
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                  </div>
                </div>
              </section>

              <section aria-labelledby="usage-heading">
                <div className="mb-2 flex flex-col px-3">
                  <h2
                    className="text-sm font-medium text-black/45 dark:text-white/45"
                    id="usage-heading"
                  >
                    Credits usage
                  </h2>
                  <div className="flex mt-1 w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor="usage-month">
                        Usage month
                      </label>
                      <div className="relative">
                        <select
                          className="appearance-none rounded-lg border border-black/10 bg-white py-1 pl-2 pr-6 text-sm font-medium dark:border-white/10 dark:bg-zinc-900"
                          id="usage-month"
                          onChange={(event) =>
                            setUsageMonth(Number(event.target.value))
                          }
                          value={usageMonth}
                        >
                          {monthNames.map((month, index) => (
                            <option key={month} value={index}>
                              {month}
                            </option>
                          ))}
                        </select>
                        <ChevronsUpDown
                          aria-hidden="true"
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50"
                          size={14}
                        />
                      </div>
                      <label className="sr-only" htmlFor="usage-year">
                        Usage year
                      </label>
                      <div className="relative">
                        <select
                          className="appearance-none rounded-lg border border-black/10 bg-white py-1 pl-2 pr-6 text-sm font-medium dark:border-white/10 dark:bg-zinc-900"
                          id="usage-year"
                          onChange={(event) =>
                            setUsageYear(Number(event.target.value))
                          }
                          value={usageYear}
                        >
                          {Array.from(
                            { length: 7 },
                            (_, index) => new Date().getFullYear() - 3 + index,
                          ).map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        <ChevronsUpDown
                          aria-hidden="true"
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50"
                          size={14}
                        />
                      </div>
                    </div>
                    <button
                      aria-label="Download usage history"
                      className="rounded-md p-1.5 text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
                      onClick={() =>
                        setNotice(
                          "Usage history is unavailable until credit tracking is connected.",
                        )
                      }
                      type="button"
                    >
                      <Download aria-hidden="true" size={15} />
                    </button>
                  </div>
                </div>
                <div className="rounded-xl font-medium border border-black/10 bg-white px-3 py-5 text-center text-sm text-black/45 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/45">
                  No usage history available yet.
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-black/55 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
              Settings for {activeSection} are not available yet.
            </div>
          )}

          {notice && (
            <p
              className="mt-4 rounded-lg bg-black/[0.04] p-3 text-sm text-black/60 dark:bg-white/[0.06] dark:text-white/60"
              role="status"
            >
              {notice}
            </p>
          )}
        </div>
      </section>
      {isTotpModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm dark:bg-black/60"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                void cancelTotpEnrollment();
              }
            }}
          >
            <section
              aria-labelledby="totp-modal-heading"
              aria-modal="true"
              className="w-full max-w-lg overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
              role="dialog"
            >
              {totpError && (
                <p
                  className="mx-5 mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {totpError}
                </p>
              )}

              {isEnrollingTotp ? (
                <p className="p-8 min-h-[100px] font-medium text-center text-sm text-black/50 dark:text-white/50">
                  Preparing your authenticator setup...
                </p>
              ) : totpEnrollment ? (
                <div className="space-y-4 p-5">
                  <ol className="list-inside hiddn font-medium tracking-tight list-decimal space-y-1 text-sm text-black/70 dark:text-white/70">
                    <li>Install an authenticator app.</li>
                    <li>Scan the QR code or enter the setup key.</li>
                    <li>Enter the 6-digit code from your app.</li>
                  </ol>

                  <div className="rounded border border-black/10 p-3 dark:border-white/10">
                    <div className="mb-3 font-medium flex items-center justify-center gap-2">
                      <code className="max-w-[calc(100%-5rem)] break-all text-center text-xs text-black/60 dark:text-white/60">
                        {totpEnrollment.secret}
                      </code>
                      <button
                        aria-label={
                          isTotpSecretCopied
                            ? "Setup key copied"
                            : "Copy setup key"
                        }
                        className="flex shrink-0 items-center gap-1 rounded-md p-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                        onClick={() => void copyTotpSecret()}
                        type="button"
                      >
                        <Copy aria-hidden="true" size={14} />
                        {isTotpSecretCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <Image
                      alt="Authenticator setup QR code"
                      className="mx-auto h-52 w-52 rounded-lg bg-white"
                      height={208}
                      unoptimized
                      src={totpEnrollment.qrCode.trimEnd()}
                      width={208}
                    />
                  </div>

                  <form
                    className="space-y-4"
                    ref={totpCodeFormRef}
                    onSubmit={(event) => {
                      event.preventDefault();
                      lastAutoSubmittedTotpCodeRef.current = totpCodeValue;
                      setIsTotpAutoConfirmPending(false);
                      void verifyTotpCode();
                    }}
                  >
                    <div
                      aria-labelledby="totp-code-label"
                      className="text-center"
                      role="group"
                    >
                      <div className="flex justify-center gap-2">
                        {totpCode.map((digit, index) => (
                          <Fragment key={index}>
                            <input
                              aria-label={`Verification code digit ${index + 1}`}
                              autoComplete={
                                index === 0 ? "one-time-code" : "off"
                              }
                              className="h-10 w-10 rounded border border-black/10 bg-transparent text-center text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10"
                              inputMode="numeric"
                              maxLength={index === 0 ? 6 : 1}
                              onChange={(event) =>
                                updateTotpCode(index, event.target.value)
                              }
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) => {
                                if (
                                  (event.key === "Backspace" && !digit) ||
                                  event.key === "ArrowLeft"
                                ) {
                                  if (index > 0) {
                                    totpCodeInputRefs.current[
                                      index - 1
                                    ]?.focus();
                                  }
                                } else if (
                                  event.key === "ArrowRight" &&
                                  index < 5
                                ) {
                                  totpCodeInputRefs.current[index + 1]?.focus();
                                }
                              }}
                              onPaste={(event) => {
                                event.preventDefault();
                                const pastedDigits = event.clipboardData
                                  .getData("text")
                                  .replace(/\D/g, "")
                                  .slice(0, 6 - index);
                                if (pastedDigits) {
                                  updateTotpCode(index, pastedDigits);
                                }
                              }}
                              pattern="[0-9]*"
                              ref={(element) => {
                                totpCodeInputRefs.current[index] = element;
                              }}
                              required
                              type="text"
                              value={digit}
                            />
                            {index === 2 && (
                              <span
                                aria-hidden="true"
                                className="self-center w-5 bg-black/10 h-0.5 text-black/35 dark:text-white/35"
                              ></span>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <button
                      className="h-8 w-fit px-4 mx-auto items-center justify-center flex rounded-full bg-black  font-medium text-white hover:bg-black/80 disabled:cursor-wait disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80"
                      disabled={isVerifyingTotp || totpCodeValue.length !== 6}
                      type="submit"
                    >
                      {isVerifyingTotp ? "Verifying..." : "Confirm setup"}
                    </button>
                    {totpCodeValue.length === 6 &&
                      !isVerifyingTotp &&
                      isTotpAutoConfirmPending && (
                        <p className="text-center hidden text-xs text-black/45 dark:text-white/45">
                          Auto-confirming in 3 seconds
                        </p>
                      )}
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6">
                  {!totpError && (
                    <p className="text-sm text-black/50 dark:text-white/50">
                      Authenticator setup could not be started.
                    </p>
                  )}
                  <button
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    disabled={isEnrollingTotp}
                    onClick={() => void startTotpEnrollment()}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              )}
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}

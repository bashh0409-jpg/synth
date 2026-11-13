import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex tracking-tight min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Sign-in failed</h1>
      <p className="text-sm font-medium text-black/60">
        We couldn&apos;t complete sign-in. Please try again.
      </p>
      <Link className="font-medium underline" href="/">
        Back to sign in
      </Link>
    </main>
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { sendErrorToBetterStack } from "@/lib/monitoring/better-stack";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/error", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Check the public Supabase environment variables.");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    try {
      await sendErrorToBetterStack({
        context: "Supabase OAuth code exchange",
        errorName: "SupabaseAuthError",
        message: error.message,
        pathname: "/auth/callback",
        runtime: "nodejs",
      });
    } catch (reportingError) {
      console.error("Unable to report the OAuth callback failure.", reportingError);
    }

    return NextResponse.redirect(new URL("/auth/error", origin));
  }

  const signInProvider = searchParams.get("sign_in_provider");
  if (
    signInProvider &&
    ["google", "github", "email"].includes(signInProvider)
  ) {
    const { error: providerError } = await supabase.auth.updateUser({
      data: { last_sign_in_provider: signInProvider },
    });

    if (providerError) {
      try {
        await sendErrorToBetterStack({
          context: "Supabase sign-in provider update",
          errorName: "SupabaseAuthError",
          message: providerError.message,
          pathname: "/auth/callback",
          runtime: "nodejs",
        });
      } catch (reportingError) {
        console.error(
          "Unable to report the sign-in provider update failure.",
          reportingError,
        );
      }
    }
  }

  const next = searchParams.get("next") ?? "/workspace";
  const destination = new URL(next, origin);

  if (destination.origin !== origin) {
    return NextResponse.redirect(new URL("/workspace", origin));
  }

  if (
    destination.pathname === "/workspace" &&
    signInProvider &&
    ["google", "github", "email"].includes(signInProvider)
  ) {
    destination.searchParams.set("sign_in_provider", signInProvider);
  }

  return NextResponse.redirect(destination);
}

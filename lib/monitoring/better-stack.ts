import "server-only";
import type { ClientErrorReport } from "./types";

type BetterStackEvent = {
  dt: string;
  level: "error";
  service: string;
  environment: string;
  message: string;
  error_name: string;
  stack?: string;
  context: string;
  runtime: string;
  pathname?: string;
};

function redact(value: string) {
  return value
    .replace(
      /(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /((?:access_token|refresh_token|token|password|secret|api[_-]?key)\s*[=:]\s*["']?)[^&\s"'`,;]+/gi,
      "$1[REDACTED]",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(
      /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi,
      "[REDACTED_ID]",
    )
    .slice(0, 8000);
}

function getConfiguration() {
  const endpoint = process.env.BETTER_STACK_INGESTING_URL;
  const token = process.env.BETTER_STACK_SOURCE_TOKEN;

  if (!endpoint || !token) {
    throw new Error(
      "Set BETTER_STACK_INGESTING_URL and BETTER_STACK_SOURCE_TOKEN to enable Better Stack error reporting.",
    );
  }

  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new Error("BETTER_STACK_INGESTING_URL must use HTTPS.");
  }

  return { url, token };
}

export async function sendErrorToBetterStack(
  report: Pick<ClientErrorReport, "context" | "errorName" | "message" | "stack" | "pathname"> & {
    runtime: string;
  },
) {
  const { url, token } = getConfiguration();
  const event: BetterStackEvent = {
    dt: new Date().toISOString(),
    level: "error",
    service: "arcture",
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    message: redact(report.message),
    error_name: redact(report.errorName),
    context: redact(report.context),
    runtime: report.runtime,
    ...(report.stack ? { stack: redact(report.stack) } : {}),
    ...(report.pathname ? { pathname: redact(report.pathname) } : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Better Stack rejected the error report (HTTP ${response.status}).`);
  }
}

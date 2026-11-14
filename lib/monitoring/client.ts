"use client";

import type { ClientErrorReport } from "./types";

function getStringProperty(value: object, key: string) {
  if (!(key in value)) return undefined;
  const property: unknown = Reflect.get(value, key);
  return typeof property === "string" ? property : undefined;
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return {
      errorName: getStringProperty(error, "name") ?? "Error",
      message: getStringProperty(error, "message") ?? "Unknown error",
      stack: getStringProperty(error, "stack"),
    };
  }

  return {
    errorName: "Error",
    message: typeof error === "string" ? error : "Unknown error",
    stack: undefined,
  };
}

export function reportClientError(context: string, error: unknown) {
  console.error(context, error);

  const details = getErrorDetails(error);
  const report: ClientErrorReport = {
    context,
    ...details,
    pathname: window.location.pathname,
  };

  void fetch("/api/monitoring/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          "Unable to send an error report to Better Stack.",
          response.status,
        );
      }
    })
    .catch((reportingError: unknown) => {
      console.error("Unable to reach the error reporting endpoint.", reportingError);
    });
}

import type { Instrumentation } from "next";
import { sendErrorToBetterStack } from "@/lib/monitoring/better-stack";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const details =
    error instanceof Error
      ? {
          errorName: error.name,
          message: error.message,
          stack: error.stack,
        }
      : {
          errorName: "Error",
          message: typeof error === "string" ? error : "Unknown server error",
        };

  let pathname = request.path;
  try {
    pathname = new URL(request.path, "http://next.internal").pathname;
  } catch {
    console.error("Unable to parse the path for a server error report.");
  }

  try {
    await sendErrorToBetterStack({
      ...details,
      context: `${context.routeType} ${context.routePath}`,
      pathname,
      runtime: process.env.NEXT_RUNTIME ?? "server",
    });
  } catch (reportingError) {
    console.error("Unable to send a server error to Better Stack.", reportingError);
  }
};

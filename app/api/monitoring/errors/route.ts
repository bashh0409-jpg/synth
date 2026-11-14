import { NextResponse } from "next/server";
import { sendErrorToBetterStack } from "@/lib/monitoring/better-stack";
import type { ClientErrorReport } from "@/lib/monitoring/types";

const MAX_BODY_BYTES = 16_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(
  value: Record<string, unknown>,
  key: string,
  maxLength: number,
  required = false,
) {
  const field = value[key];
  if (typeof field !== "string" || field.length > maxLength) return undefined;
  if (required && !field.trim()) return undefined;
  return field;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json(
      { error: "Expected a JSON error report." },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Report is too large." }, { status: 413 });
  }

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Report is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON report." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid error report." }, { status: 400 });
  }

  const report: ClientErrorReport = {
    context: readText(body, "context", 200, true) ?? "",
    errorName: readText(body, "errorName", 120) ?? "Error",
    message: readText(body, "message", 4000, true) ?? "",
    pathname: readText(body, "pathname", 500) ?? "/",
    ...(readText(body, "stack", 8000)
      ? { stack: readText(body, "stack", 8000) }
      : {}),
  };

  if (!report.context || !report.message) {
    return NextResponse.json({ error: "Invalid error report." }, { status: 400 });
  }

  try {
    await sendErrorToBetterStack({ ...report, runtime: "browser" });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to forward a client error to Better Stack.", error);
    return NextResponse.json(
      { error: "Error reporting is temporarily unavailable." },
      { status: 502 },
    );
  }
}

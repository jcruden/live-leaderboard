import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

export function jsonZodError(err: ZodError, status = 400) {
  return jsonError("Invalid input", status, err.flatten());
}



import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPasscode } from "@/lib/security/passcodes";
import { setSession } from "@/lib/security/session";

const Body = z.object({ passcode: z.string().trim().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .schema("public")
    .from("secrets")
    .select("admin_passcode_hash,dictator_passcode_hash")
    .eq("id", 1)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const passcode = parsed.data.passcode;

  const isDictator = await verifyPasscode(passcode, data.dictator_passcode_hash);
  if (isDictator) {
    await setSession("dictator");
    return NextResponse.json({ role: "dictator" });
  }

  const isAdmin = await verifyPasscode(passcode, data.admin_passcode_hash);
  if (isAdmin) {
    await setSession("admin");
    return NextResponse.json({ role: "admin" });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

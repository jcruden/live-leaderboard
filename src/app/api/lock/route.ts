import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionRole } from "@/lib/security/session";
import { jsonError } from "@/lib/api/responses";

export async function POST() {
  const role = await getSessionRole();
  if (!role) return jsonError("Unauthorized", 401);
  if (role !== "dictator") return jsonError("Forbidden", 403);

  const sb = supabaseServer();
  const { data, error } = await sb
    .schema("public")
    .from("app_state")
    .update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: role,
    })
    .eq("id", 1)
    .select("is_locked,locked_at,locked_by")
    .single();

  if (error || !data) return jsonError("Server error", 500);

  return NextResponse.json(data);
}



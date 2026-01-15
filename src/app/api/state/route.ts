import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/responses";

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .schema("public")
    .from("app_state")
    .select("is_locked,locked_at,locked_by")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return jsonError("Server error", 500);
  }

  return NextResponse.json(data);
}



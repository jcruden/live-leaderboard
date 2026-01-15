import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = supabaseServer();

  const { data, error } = await sb
    .schema("public")
    .from("players")
    .select("id,display_name,score_total,updated_at")
    .order("score_total", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: data ?? [] });
}



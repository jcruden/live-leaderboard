import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionRole } from "@/lib/security/session";
import { jsonError, jsonZodError } from "@/lib/api/responses";

const Body = z.object({
  player_id: z.string().uuid(),
  delta: z.union([z.literal(-1), z.literal(1), z.literal(10)]),
});

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (!role) return jsonError("Unauthorized", 401);
  if (role !== "admin" && role !== "dictator") return jsonError("Forbidden", 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonZodError(parsed.error, 400);

  const { player_id, delta } = parsed.data;
  const sb = supabaseServer();

  const stateRes = await sb
    .schema("public")
    .from("app_state")
    .select("is_locked")
    .eq("id", 1)
    .single();

  if (stateRes.error || !stateRes.data) return jsonError("Server error", 500);

  if (stateRes.data.is_locked) {
    await sb
      .schema("public")
      .from("score_events")
      .insert({ player_id, delta, result: "blocked_locked" });

    return jsonError("Locked", 423);
  }

  const currentRes = await sb
    .schema("public")
    .from("players")
    .select("score_total")
    .eq("id", player_id)
    .single();

  if (currentRes.error || !currentRes.data) {
    await sb
      .schema("public")
      .from("score_events")
      .insert({ player_id, delta, result: "invalid" });
    return jsonError("Player not found", 404);
  }

  const nextTotal = (currentRes.data.score_total ?? 0) + delta;
  const updateRes = await sb
    .schema("public")
    .from("players")
    .update({ score_total: nextTotal, updated_at: new Date().toISOString() })
    .eq("id", player_id)
    .select("id,display_name,score_total,updated_at")
    .single();

  if (updateRes.error || !updateRes.data) return jsonError("Server error", 500);

  await sb
    .schema("public")
    .from("score_events")
    .insert({ player_id, delta, result: "applied" });

  return Response.json({ ok: true, player: updateRes.data });
}



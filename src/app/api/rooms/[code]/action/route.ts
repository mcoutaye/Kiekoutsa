import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { applyAction, sanitizeRoom } from "@/lib/room-utils";
import type { RoomDB } from "@/lib/room-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { action, playerId, payload } = await req.json();

  if (!action || !playerId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Salon introuvable" }, { status: 404 });
  }

  const room = data as RoomDB;

  // Handle join-room: may need to add player first
  if (action === "join-room") {
    const result = applyAction(room, "join-room", playerId, payload);
    if ("error" in result && !("update" in result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const upd = (result as { update: Partial<RoomDB> }).update;
    if (Object.keys(upd).length > 0) {
      await sb.from("rooms").update(upd).eq("code", code.toUpperCase());
    }
    const { data: updated } = await sb.from("rooms").select("*").eq("code", code.toUpperCase()).single();
    return NextResponse.json({ room: sanitizeRoom(updated as RoomDB, playerId) });
  }

  const result = applyAction(room, action, playerId, payload ?? {});

  if ("error" in result && !("update" in result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const upd = (result as { update: Partial<RoomDB>; error?: string }).update;

  if (Object.keys(upd).length > 0) {
    const { error: updateError } = await sb
      .from("rooms")
      .update(upd)
      .eq("code", code.toUpperCase());
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Return updated room so client can apply it immediately (no waiting for Realtime)
  const { data: updated } = await sb
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  return NextResponse.json({
    ok: true,
    room: updated ? sanitizeRoom(updated as RoomDB, playerId) : null,
  });
}

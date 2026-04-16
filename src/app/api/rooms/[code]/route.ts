import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { sanitizeRoom } from "@/lib/room-utils";
import type { RoomDB } from "@/lib/room-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const playerId = req.nextUrl.searchParams.get("playerId");
  if (!playerId) return NextResponse.json({ error: "playerId requis" }, { status: 400 });

  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) return NextResponse.json({ error: "Salon introuvable" }, { status: 404 });

  return NextResponse.json({ room: sanitizeRoom(data as RoomDB, playerId) });
}

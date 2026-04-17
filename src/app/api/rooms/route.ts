import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { DEFAULT_SETTINGS } from "@/types/game";
import { sanitizeRoom } from "@/lib/room-utils";
import type { RoomDB } from "@/lib/room-utils";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: NextRequest) {
  const { playerName, avatar, playerId } = await req.json();
  if (!playerName || !playerId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: `Variables manquantes: URL=${!!supabaseUrl} KEY=${!!serviceKey}` },
      { status: 500 }
    );
  }

  const sb = createServerSupabase();

  // Generate unique code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data } = await sb.from("rooms").select("code").eq("code", code).single();
    if (!data) break;
    code = generateCode();
    attempts++;
  }

  const roomData: Omit<RoomDB, "updated_at"> = {
    code,
    phase: "lobby",
    playback_mode: null,
    settings: { ...DEFAULT_SETTINGS },
    players: [
      {
        id: playerId,
        name: String(playerName).trim().slice(0, 20),
        avatar: avatar ?? "",
        is_host: true,
        is_ready: false,
        score: 0,
        tracks: [],
      },
    ],
    track_queue: [],
    current_track_index: -1,
    current_track: null,
    votes: {},
    round_results: [],
    chat_messages: [],
    playing_started_at: null,
  };

  const { error } = await sb.from("rooms").insert(roomData);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: created } = await sb.from("rooms").select("*").eq("code", code).single();
  return NextResponse.json({
    roomCode: code,
    room: sanitizeRoom(created as RoomDB, playerId),
  });
}

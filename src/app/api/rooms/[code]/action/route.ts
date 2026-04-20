import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { applyAction, sanitizeRoom, shuffleArray } from "@/lib/room-utils";
import type { RoomDB } from "@/lib/room-utils";
import type { Track } from "@/types/game";

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

  let finalUpd = { ...upd };

  // Taupe mode post-processing after start-game
  if (action === "start-game" && room.settings?.taupeMode) {
    try {
      const queue = (finalUpd.track_queue ?? []) as Track[];
      const firstArtist = queue[0]?.artists ?? "";

      const deezerRes = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(firstArtist)}&limit=10`
      );
      const deezerData = await deezerRes.json();
      const existingIds = new Set(queue.map((t) => t.id));
      const taupeTrackCandidates: Track[] = (deezerData.data ?? [])
        .filter((d: any) => !existingIds.has(String(d.id)))
        .slice(0, 2)
        .map((d: any): Track => ({
          id: String(d.id),
          name: d.title ?? d.title_short ?? "Inconnu",
          artists: d.artist?.name ?? "Inconnu",
          albumCover: (d.album?.cover_medium ?? d.album?.cover ?? "").replace("http://", "https://"),
          previewUrl: d.preview ? d.preview.replace("http://", "https://") : null,
          addedBy: "__taupe__",
        }));

      if (taupeTrackCandidates.length > 0) {
        const taupePlayer = {
          id: "__taupe__",
          name: "La Taupe",
          avatar: "/assets/role-taupe.svg",
          is_host: false,
          is_ready: true,
          score: 0,
          tracks: taupeTrackCandidates,
        };

        const existingPlayers = (finalUpd.players ?? room.players) as any[];
        const newPlayers = [...existingPlayers, taupePlayer];
        const newQueue = shuffleArray([...queue, ...taupeTrackCandidates]);
        const firstTrack = newQueue[0] ?? null;

        finalUpd = {
          ...finalUpd,
          players: newPlayers,
          track_queue: newQueue,
          current_track: firstTrack,
          taupe_player_id: "__taupe__",
        };
      }
    } catch {
      // Deezer failed — continue without Taupe
    }
  }

  if (Object.keys(finalUpd).length > 0) {
    const { error: updateError } = await sb
      .from("rooms")
      .update(finalUpd)
      .eq("code", code.toUpperCase());
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

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

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServerSupabase();
  const now = new Date();

  // Rooms abandoned in lobby or end phase for > 30 min
  const lobbyThreshold = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  // Rooms stuck mid-game for > 2h (truly abandoned)
  const gameThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  // Rooms stuck in selection phases with < 3 real players (game can't start without 3)
  const { data: selectionRooms } = await sb
    .from("rooms")
    .select("code, players")
    .in("phase", ["selection", "mode-selection", "role-reveal"]);

  const underfilledCodes = (selectionRooms ?? [])
    .filter((r) => {
      const players = Array.isArray(r.players) ? r.players : [];
      const realPlayers = players.filter((p: { id: string }) => p.id !== "__taupe__");
      return realPlayers.length < 3;
    })
    .map((r) => r.code);

  const [lobbyResult, gameResult, underfilledResult] = await Promise.all([
    sb
      .from("rooms")
      .delete()
      .in("phase", ["lobby", "end"])
      .lt("updated_at", lobbyThreshold)
      .select("code"),
    sb
      .from("rooms")
      .delete()
      .lt("updated_at", gameThreshold)
      .select("code"),
    underfilledCodes.length > 0
      ? sb.from("rooms").delete().in("code", underfilledCodes).select("code")
      : Promise.resolve({ data: [] }),
  ]);

  const deletedLobby      = lobbyResult.data?.map((r) => r.code) ?? [];
  const deletedGame       = gameResult.data?.map((r) => r.code) ?? [];
  const deletedUnderfilled = (underfilledResult as { data: { code: string }[] | null }).data?.map((r) => r.code) ?? [];
  const total = deletedLobby.length + deletedGame.length + deletedUnderfilled.length;

  console.log(`[cleanup] Deleted ${total} rooms (${deletedLobby.length} idle lobby/end, ${deletedGame.length} abandoned mid-game, ${deletedUnderfilled.length} selection with <3 players)`);

  return NextResponse.json({
    deleted: total,
    lobby: deletedLobby,
    game: deletedGame,
    underfilled: deletedUnderfilled,
  });
}

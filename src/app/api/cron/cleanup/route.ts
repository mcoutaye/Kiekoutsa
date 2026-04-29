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

  const [lobbyResult, gameResult] = await Promise.all([
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
  ]);

  const deletedLobby = lobbyResult.data?.map((r) => r.code) ?? [];
  const deletedGame = gameResult.data?.map((r) => r.code) ?? [];
  const total = deletedLobby.length + deletedGame.length;

  console.log(`[cleanup] Deleted ${total} rooms (${deletedLobby.length} idle lobby/end, ${deletedGame.length} abandoned mid-game)`);

  return NextResponse.json({
    deleted: total,
    lobby: deletedLobby,
    game: deletedGame,
  });
}

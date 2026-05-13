import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode") ?? "";
  const playerId = req.nextUrl.searchParams.get("playerId") ?? "";

  const state = Buffer.from(`${roomCode}|${playerId}`).toString("base64url");
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/deezer/callback`;

  const params = new URLSearchParams({
    app_id: process.env.DEEZER_APP_ID!,
    redirect_uri: redirectUri,
    perms: "basic_access,listening_history",
    state,
  });

  return NextResponse.redirect(`https://connect.deezer.com/oauth/auth.php?${params}`);
}

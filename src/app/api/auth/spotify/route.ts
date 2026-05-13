import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode") ?? "";
  const playerId = req.nextUrl.searchParams.get("playerId") ?? "";

  const state = Buffer.from(`${roomCode}|${playerId}`).toString("base64url");
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`;

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: "user-library-read",
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code) {
    return NextResponse.redirect(`${appUrl}?error=spotify_denied`);
  }

  const decoded = Buffer.from(state, "base64url").toString();
  const [roomCode] = decoded.split("|");

  const redirectUri = `${appUrl}/api/auth/spotify/callback`;
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/room?playlist_error=spotify_token`);
  }

  const { access_token } = await tokenRes.json();
  return NextResponse.redirect(
    `${appUrl}/room?pt=${access_token}&pp=spotify`
  );
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code) {
    return NextResponse.redirect(`${appUrl}?error=deezer_denied`);
  }

  const decoded = Buffer.from(state, "base64url").toString();
  const [roomCode] = decoded.split("|");

  const tokenRes = await fetch(
    `https://connect.deezer.com/oauth/access_token.php?app_id=${process.env.DEEZER_APP_ID}&secret=${process.env.DEEZER_APP_SECRET}&code=${code}&output=json`
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/room/${roomCode}?playlist_error=deezer_token`);
  }

  const data = await tokenRes.json();
  const token = data.access_token;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/room/${roomCode}?playlist_error=deezer_token`);
  }

  return NextResponse.redirect(`${appUrl}/room/${roomCode}?pt=${token}&pp=deezer`);
}

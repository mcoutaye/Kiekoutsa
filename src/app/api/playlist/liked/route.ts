import { NextRequest, NextResponse } from "next/server";
import type { SpotifyTrack } from "@/types/game";

async function fetchSpotifyLiked(token: string, count: number): Promise<{ name: string; artist: string }[]> {
  const headers = { Authorization: `Bearer ${token}` };

  // Get total count first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRes: any = await fetch("https://api.spotify.com/v1/me/tracks?limit=1", { headers });
  if (!totalRes.ok) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalData: any = await totalRes.json();
  const total: number = totalData.total ?? 0;
  if (total === 0) return [];

  // Pick a random offset so we sample from the entire library, not just recent tracks
  const need = count * 3;
  const maxOffset = Math.max(0, total - need);
  const offset = Math.floor(Math.random() * (maxOffset + 1));

  const tracks: { name: string; artist: string }[] = [];
  let url: string | null = `https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`;

  while (url && tracks.length < need) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await fetch(url, { headers });
    if (!res.ok) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    for (const item of data.items ?? []) {
      const t = item.track;
      if (t) tracks.push({ name: t.name, artist: t.artists?.[0]?.name ?? "" });
    }
    url = data.next ?? null;
  }

  return tracks;
}

async function fetchDeezerLiked(token: string, count: number): Promise<{ name: string; artist: string }[]> {
  const tracks: { name: string; artist: string }[] = [];
  let index = 0;

  while (tracks.length < count * 3) {
    const res = await fetch(
      `https://api.deezer.com/user/me/tracks?access_token=${token}&limit=50&index=${index}`
    );
    if (!res.ok) break;
    const data = await res.json();
    const items = data.data ?? [];
    if (items.length === 0) break;
    for (const t of items) {
      tracks.push({ name: t.title, artist: t.artist?.name ?? "" });
    }
    index += 50;
  }

  return tracks;
}

function normalize(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function looseMatch(a: string, b: string) {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function matchOnDeezer(name: string, artist: string): Promise<SpotifyTrack | null> {
  // Use Deezer's track/artist operators for precise search
  const q = encodeURIComponent(`track:"${name}" artist:"${artist}"`);
  const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=10`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = data.data ?? [];

  // Find first result where title AND artist loosely match AND has a preview
  const item = items.find((r) =>
    r.preview &&
    looseMatch(r.title, name) &&
    looseMatch(r.artist?.name ?? "", artist)
  );

  if (!item) return null;

  return {
    id: String(item.id),
    name: item.title,
    artists: item.artist?.name ?? artist,
    albumCover: item.album?.cover_medium ?? item.album?.cover ?? "",
    previewUrl: item.preview.replace(/^http:\/\//, "https://"),
    durationMs: (item.duration ?? 30) * 1000,
  };
}

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const token = req.nextUrl.searchParams.get("token");
  const count = Math.min(Number(req.nextUrl.searchParams.get("count") ?? "5"), 20);

  if (!provider || !token) {
    return NextResponse.json({ error: "Missing provider or token" }, { status: 400 });
  }

  let rawTracks: { name: string; artist: string }[] = [];
  if (provider === "spotify") {
    rawTracks = await fetchSpotifyLiked(token, count);
  } else if (provider === "deezer") {
    rawTracks = await fetchDeezerLiked(token, count);
  } else {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (rawTracks.length === 0) {
    return NextResponse.json({ error: "no_liked_tracks" }, { status: 200 });
  }

  // Shuffle so every call returns a different set
  for (let i = rawTracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawTracks[i], rawTracks[j]] = [rawTracks[j], rawTracks[i]];
  }

  // Match on Deezer until we have `count` tracks with previews
  const matched: SpotifyTrack[] = [];
  for (const raw of rawTracks) {
    if (matched.length >= count) break;
    const track = await matchOnDeezer(raw.name, raw.artist);
    if (track && !matched.some((t) => t.id === track.id)) {
      matched.push(track);
    }
  }

  return NextResponse.json({ tracks: matched });
}

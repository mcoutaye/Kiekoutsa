import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const key = process.env.GIPHY_API_KEY;

  if (!key) return NextResponse.json({ results: [] });

  const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=20&rating=pg-13&lang=fr`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return NextResponse.json({ results: [] });

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (data.data ?? []).map((r: any) => ({
    id: r.id,
    preview: r.images?.fixed_height_small?.url ?? r.images?.downsized_small?.mp4 ?? "",
    url: r.images?.original?.url ?? r.images?.downsized?.url ?? "",
  }));

  return NextResponse.json({ results });
}

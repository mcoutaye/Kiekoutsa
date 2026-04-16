// Utilise l'API Deezer (pas de clé requise, extraits 30s disponibles sur ~95% des titres)
import type { SpotifyTrack } from "@/types/game";

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error(`Deezer search error: ${res.status}`);

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data ?? []).map((item: any): SpotifyTrack => ({
    id: String(item.id),
    name: item.title,
    artists: item.artist?.name ?? "Inconnu",
    albumCover: item.album?.cover_medium ?? item.album?.cover ?? "",
    previewUrl: item.preview ?? null,
    durationMs: (item.duration ?? 30) * 1000,
  }));
}

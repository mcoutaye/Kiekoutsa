import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/contexts/GameContext";

export const metadata: Metadata = {
  title: "Kiekoutsa — Qui a mis ce son ?",
  description:
    "Le jeu multijoueur en ligne où tu dois deviner qui a choisi la musique. Joue avec tes amis, découvre leurs goûts musicaux et marque des points !",
  keywords: ["jeu musical", "multijoueur", "deviner musique", "quiz musical", "jeu entre amis", "kiekoutsa"],
  authors: [{ name: "Kiekoutsa" }],
  metadataBase: new URL("https://www.kiekoutsa.me"),
  openGraph: {
    title: "Kiekoutsa — Qui a mis ce son ?",
    description: "Le jeu multijoueur en ligne où tu dois deviner qui a choisi la musique.",
    url: "https://www.kiekoutsa.me",
    siteName: "Kiekoutsa",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Kiekoutsa — Qui a mis ce son ?",
    description: "Le jeu multijoueur en ligne où tu dois deviner qui a choisi la musique.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "TH5-lyUi6C4_izQh1Z80xVORwEk9rrZ3fHae3V14jW0",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/contexts/GameContext";

export const metadata: Metadata = {
  title: "Kiekoutsa — Qui a mis ce son ?",
  description:
    "Le jeu multijoueur où tu dois deviner qui a choisi la musique.",
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

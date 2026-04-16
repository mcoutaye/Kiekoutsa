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
        <a
          href="https://ko-fi.com/mathcou"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 left-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 z-50"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted, #9ca3af)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400 flex-shrink-0">
            <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.37-1.502 3.505-.585 1.723.754 2.097 2.54.686 3.933zm6.325.048c-.744.313-1.834.313-1.834.313l.061-3.999s1.725.063 2.374 1.173c.549.964.143 2.18-.601 2.513z"/>
          </svg>
          <span>Achète-moi un café</span>
        </a>
      </body>
    </html>
  );
}

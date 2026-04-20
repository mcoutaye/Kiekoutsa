-- Kiekoutsa — Schéma Supabase
-- À exécuter dans l'éditeur SQL de ton projet Supabase

CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'lobby',
  playback_mode TEXT,
  settings JSONB NOT NULL DEFAULT '{"minTracks":3,"maxTracks":5,"autoReveal":false,"autoPlay":true,"allowSelfVote":true,"anonymousVotes":false}',
  players JSONB NOT NULL DEFAULT '[]',
  track_queue JSONB NOT NULL DEFAULT '[]',
  current_track_index INTEGER NOT NULL DEFAULT -1,
  current_track JSONB,
  votes JSONB NOT NULL DEFAULT '{}',
  round_results JSONB NOT NULL DEFAULT '[]',
  chat_messages JSONB NOT NULL DEFAULT '[]',
  playing_started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If the table already exists, ensure the columns exist as well
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS chat_messages JSONB NOT NULL DEFAULT '[]';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS taupe_player_id TEXT DEFAULT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS guesser_pick JSONB DEFAULT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS police_blocked_id TEXT DEFAULT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS fou_activated BOOLEAN DEFAULT FALSE;

-- Désactiver RLS pour le prototype (activer + policies pour la prod)
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Activer Realtime sur la table rooms
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

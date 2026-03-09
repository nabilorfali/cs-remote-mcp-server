import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { TokenSet } from './oauth';

const SESSIONS_FILE = join(process.cwd(), '.sessions.json');

export function loadSessions(): Map<string, TokenSet> {
  if (existsSync(SESSIONS_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8'));
      return new Map(Object.entries(raw));
    } catch { /* ignore corrupt file */ }
  }
  return new Map();
}

export function saveSessions(map: Map<string, TokenSet>) {
  writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(map), null, 2));
}

// In-process singleton (survives across requests in the same Node process)
export const sessions: Map<string, TokenSet> = loadSessions();

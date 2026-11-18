import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRecord } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'games.json');

// Ensure data directory exists
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function saveGameRecord(record: GameRecord): Promise<void> {
  try {
    ensureStorage();
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    let records: GameRecord[] = [];
    try {
      records = JSON.parse(data);
    } catch {
      records = [];
    }

    // Check if record for this room / game already exists to prevent duplicates
    const exists = records.some(r => r.id === record.id || (r.roomId === record.roomId && r.fen === record.fen));
    if (exists) {
      console.log(`[DB] Game record ${record.id} already exists, skipping duplicate save.`);
      return;
    }

    // Prepend new record so newest is first
    records.unshift(record);

    // Keep up to 500 recent games
    if (records.length > 500) {
      records = records.slice(0, 500);
    }

    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    console.log(`[DB] Successfully saved game record ${record.id} (${record.whiteName} vs ${record.blackName})`);
  } catch (err) {
    console.error('[DB] Failed to save game record:', err);
  }
}

export async function getGameRecords(limit = 50): Promise<GameRecord[]> {
  try {
    ensureStorage();
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const records: GameRecord[] = JSON.parse(data);
    return records.slice(0, limit);
  } catch (err) {
    console.error('[DB] Failed to read game records:', err);
    return [];
  }
}

export async function getGameRecordById(id: string): Promise<GameRecord | null> {
  try {
    ensureStorage();
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const records: GameRecord[] = JSON.parse(data);
    return records.find(r => r.id === id) || null;
  } catch (err) {
    console.error('[DB] Failed to get game record by ID:', err);
    return null;
  }
}

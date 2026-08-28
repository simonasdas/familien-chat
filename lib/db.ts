import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { ChatMessage, Poll, PollOption, ReactionRef, User } from "./types";

export interface UserRow {
  id: number;
  name: string;
  birthday: string;
  device_id: string | null;
  profile_image: string | null;
  status: string;
  vacation: string;
  custom_status: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: number;
  author: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  title: string | null;
  description: string | null;
  poll_id: number | null;
  created_at: string;
}

interface PollRow {
  id: number;
  author: string;
  question: string;
  anonymous: number;
  single_choice: number;
  created_at: string;
}

interface PollOptionRow {
  id: number;
  poll_id: number;
  text: string;
}

interface PollVoteRow {
  option_id: number;
  voter: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    birthday: row.birthday,
    profileImage: row.profile_image ?? null,
    status: row.status ?? "",
    vacation: row.vacation ?? "",
    customStatus: row.custom_status ?? "",
    createdAt: row.created_at,
  };
}

function rowToChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    author: row.author,
    content: row.content,
    imageUrl: row.image_url,
    audioUrl: row.audio_url,
    videoUrl: row.video_url,
    title: row.title ?? null,
    description: row.description ?? null,
    pollId: row.poll_id ?? null,
    poll: row.poll_id != null ? loadPoll(row.poll_id) : null,
    reactions: getReactions(row.id),
    createdAt: row.created_at,
  };
}

const globalForDb = globalThis as unknown as {
  __familienChatDb?: Database.Database;
};

function initDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "familie.db"));
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birthday TEXT NOT NULL,
      device_id TEXT,
      profile_image TEXT,
      status TEXT NOT NULL DEFAULT '',
      vacation TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      audio_url TEXT,
      video_url TEXT,
      title TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      question TEXT NOT NULL,
      anonymous INTEGER NOT NULL DEFAULT 0,
      single_choice INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      voter TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(poll_id, voter)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      voter TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(message_id, voter)
    )
  `);


  const userCols = db
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];
  if (!userCols.some((c) => c.name === "profile_image")) {
    db.exec("ALTER TABLE users ADD COLUMN profile_image TEXT");
  }
  if (!userCols.some((c) => c.name === "status")) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT ''");
  }
  if (!userCols.some((c) => c.name === "vacation")) {
    db.exec("ALTER TABLE users ADD COLUMN vacation TEXT NOT NULL DEFAULT ''");
  }
  if (!userCols.some((c) => c.name === "custom_status")) {
    db.exec("ALTER TABLE users ADD COLUMN custom_status TEXT NOT NULL DEFAULT ''");
  }

  const msgCols = db
    .prepare("PRAGMA table_info(chat_messages)")
    .all() as { name: string }[];
  if (!msgCols.some((c) => c.name === "image_url")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN image_url TEXT");
  }
  if (!msgCols.some((c) => c.name === "audio_url")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN audio_url TEXT");
  }
  if (!msgCols.some((c) => c.name === "video_url")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN video_url TEXT");
  }
  if (!msgCols.some((c) => c.name === "poll_id")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN poll_id INTEGER");
  }
  if (!msgCols.some((c) => c.name === "title")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN title TEXT");
  }
  if (!msgCols.some((c) => c.name === "description")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN description TEXT");
  }

  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__familienChatDb) {
    globalForDb.__familienChatDb = initDb();
  }
  return globalForDb.__familienChatDb;
}

export function createUser(
  name: string,
  birthday: string,
  deviceId: string | null
): User {
  const db = getDb();
  const existing = deviceId
    ? (db
        .prepare("SELECT * FROM users WHERE device_id = ?")
        .get(deviceId) as UserRow | undefined)
    : undefined;
  if (existing) {
    db.prepare("UPDATE users SET name = ?, birthday = ? WHERE id = ?").run(
      name,
      birthday,
      existing.id
    );
    return rowToUser({ ...existing, name, birthday });
  }
  const result = db
    .prepare("INSERT INTO users (name, birthday, device_id) VALUES (?, ?, ?)")
    .run(name, birthday, deviceId);
  return rowToUser(
    db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid) as UserRow
  );
}

export function getUserById(id: number): User | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function getUserByName(name: string): User | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE name = ?")
    .get(name) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function updateUserProfile(
  id: number,
  data: { name?: string; profileImage?: string | null; status?: string; vacation?: string; customStatus?: string }
): User | null {
  const db = getDb();
  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!current) return null;

  const updates: string[] = [];
  const vals: (string | null)[] = [];

  if (data.name !== undefined) { updates.push("name = ?"); vals.push(data.name); }
  if (data.profileImage !== undefined) { updates.push("profile_image = ?"); vals.push(data.profileImage); }
  if (data.status !== undefined) { updates.push("status = ?"); vals.push(data.status); }
  if (data.vacation !== undefined) { updates.push("vacation = ?"); vals.push(data.vacation); }
  if (data.customStatus !== undefined) { updates.push("custom_status = ?"); vals.push(data.customStatus); }

  if (updates.length === 0) return rowToUser(current);

  vals.push(String(id));
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...vals);

  return getUserById(id);
}

export function getAllUsers(): User[] {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY id ASC")
    .all() as UserRow[];
  return rows.map(rowToUser);
}

export function addChatMessage(
  author: string,
  content: string,
  imageUrl: string | null,
  audioUrl?: string | null,
  videoUrl?: string | null,
  pollId?: number | null,
  title?: string | null,
  description?: string | null
): ChatMessage {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO chat_messages (author, content, image_url, audio_url, video_url, poll_id, title, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(author, content, imageUrl, audioUrl ?? null, videoUrl ?? null, pollId ?? null, title ?? null, description ?? null);
  const row = db
    .prepare("SELECT * FROM chat_messages WHERE id = ?")
    .get(result.lastInsertRowid) as ChatMessageRow;
  return rowToChatMessage(row);
}

export function getRecentChatMessages(limit = 100): ChatMessage[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?"
    )
    .all(limit) as ChatMessageRow[];
  return rows.reverse().map(rowToChatMessage);
}

export function getOnlineMemberCount(): number {
  const { n } = getDb()
    .prepare("SELECT COUNT(DISTINCT device_id) AS n FROM users WHERE device_id IS NOT NULL")
    .get() as { n: number };
  return n;
}

function loadPoll(pollId: number, voter?: string): Poll {
  const db = getDb();
  const pr = db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId) as PollRow | undefined;
  if (!pr) return null as unknown as Poll;
  const optionRows = db
    .prepare("SELECT * FROM poll_options WHERE poll_id = ? ORDER BY sort_order ASC, id ASC")
    .all(pollId) as PollOptionRow[];
  const voteRows = db
    .prepare("SELECT option_id, voter FROM poll_votes WHERE poll_id = ?")
    .all(pollId) as PollVoteRow[];

  const myVotes = voter
    ? new Set(
        voteRows
          .filter((v) => v.voter === voter)
          .map((v) => v.option_id)
      )
    : new Set<number>();

  const options: PollOption[] = optionRows.map((o) => ({
    id: o.id,
    text: o.text,
    votes: voteRows.filter((v) => v.option_id === o.id).length,
    picked: myVotes.has(o.id),
  }));

  const voters =
    pr.anonymous === 1
      ? []
      : voteRows.map((v) => ({ voter: v.voter, optionId: v.option_id }));

  return {
    id: pr.id,
    author: pr.author,
    question: pr.question,
    anonymous: pr.anonymous === 1,
    singleChoice: pr.single_choice === 1,
    createdAt: pr.created_at,
    totalVotes: new Set(voteRows.map((v) => v.voter)).size,
    options,
    voters,
  };
}

export function createPoll(
  author: string,
  question: string,
  rawOptions: string[],
  anonymous: boolean,
  singleChoice: boolean
): Poll {
  const db = getDb();
  const tx = db.transaction(() => {
    const p = db
      .prepare("INSERT INTO polls (author, question, anonymous, single_choice) VALUES (?, ?, ?, ?)")
      .run(author, question, anonymous ? 1 : 0, singleChoice ? 1 : 0);
    const pollId = Number(p.lastInsertRowid);
    const insOpt = db.prepare("INSERT INTO poll_options (poll_id, text, sort_order) VALUES (?, ?, ?)");
    rawOptions.forEach((text, i) => insOpt.run(pollId, text, i));
    return pollId;
  });
  const id = tx();
  return loadPoll(id);
}

export function voteOnPoll(
  pollId: number,
  optionId: number,
  voter: string
): Poll {
  const db = getDb();
  const tx = db.transaction(() => {
    const poll = db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId) as PollRow | undefined;
    if (!poll) throw new Error("Umfrage nicht gefunden.");
    const opt = db
      .prepare("SELECT id FROM poll_options WHERE id = ? AND poll_id = ?")
      .get(optionId, pollId);
    if (!opt) throw new Error("Antwort nicht gefunden.");

    if (poll.single_choice === 1) {
      db.prepare("DELETE FROM poll_votes WHERE poll_id = ? AND voter = ?").run(pollId, voter);
    }
    db.prepare(
      "INSERT INTO poll_votes (poll_id, option_id, voter) VALUES (?, ?, ?) ON CONFLICT(poll_id, voter) DO NOTHING"
    ).run(pollId, optionId, voter);
  });
  tx();
  return loadPoll(pollId, voter);
}

interface ReactionRow {
  voter: string;
  emoji: string;
}

function getReactions(messageId: number): ReactionRef[] {
  const rows = getDb()
    .prepare("SELECT voter, emoji FROM message_reactions WHERE message_id = ? ORDER BY id ASC")
    .all(messageId) as ReactionRow[];
  return rows.map((r) => ({ voter: r.voter, emoji: r.emoji }));
}

export function getReactionsForMessage(messageId: number): ReactionRef[] {
  return getReactions(messageId);
}

export function toggleReaction(messageId: number, voter: string, emoji: string): ChatMessage {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM message_reactions WHERE message_id = ? AND voter = ?")
    .get(messageId, voter) as (ReactionRow & { id: number }) | undefined;
  if (existing) {
    if (existing.emoji === emoji) {
      db.prepare("DELETE FROM message_reactions WHERE message_id = ? AND voter = ?").run(messageId, voter);
    } else {
      db.prepare("UPDATE message_reactions SET emoji = ? WHERE message_id = ? AND voter = ?").run(emoji, messageId, voter);
    }
  } else {
    db.prepare(
      "INSERT INTO message_reactions (message_id, voter, emoji) VALUES (?, ?, ?) ON CONFLICT(message_id, voter) DO NOTHING"
    ).run(messageId, voter, emoji);
  }
  const row = db
    .prepare("SELECT * FROM chat_messages WHERE id = ?")
    .get(messageId) as ChatMessageRow;
  return rowToChatMessage(row);
}

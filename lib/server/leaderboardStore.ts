import { randomUUID } from "crypto";
import { formatMcap, getUtcWeekId } from "./gameConfig";
import { getRedis } from "./redis";

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  wallet: string;
  score: number;
  formattedMcap: string;
  selectedSkin: string;
  zone: string;
  bobrosCount: number;
  submittedAt: string;
  weekId: string;
};

export type StoredLeaderboardEntry = Omit<LeaderboardEntry, "rank"> & {
  entryId: string;
  createdAt: string;
  runId: string;
  runDurationMs: number;
  validationStatus: "accepted";
  validationReason?: string;
};

const leaderboardPrefix = "bobros:leaderboard";

export const leaderboardKeys = {
  entry: (entryId: string) => `${leaderboardPrefix}:entry:${entryId}`,
  weekly: (weekId: string) => `${leaderboardPrefix}:weekly:${weekId}`,
  allTime: () => `${leaderboardPrefix}:all-time`,
  weeklyBest: (weekId: string, wallet: string) => `${leaderboardPrefix}:best:weekly:${weekId}:${wallet}`,
  allTimeBest: (wallet: string) => `${leaderboardPrefix}:best:all-time:${wallet}`,
};

const currentWeekId = getUtcWeekId();

const mockEntries: StoredLeaderboardEntry[] = [
  {
    entryId: "mock-cartel-ace",
    displayName: "CARTEL ACE",
    wallet: "CARTEL_8Q2M...MOON",
    score: 72_400_000,
    formattedMcap: formatMcap(72_400_000),
    selectedSkin: "diamondbobo",
    zone: "STORM MARKET",
    bobrosCount: 3,
    submittedAt: `${new Date().toISOString().slice(0, 10)}T09:12:00.000Z`,
    createdAt: `${new Date().toISOString().slice(0, 10)}T09:12:00.000Z`,
    weekId: currentWeekId,
    runId: "mock-cartel-ace",
    runDurationMs: 248_000,
    validationStatus: "accepted",
  },
  {
    entryId: "mock-honey-maxx",
    displayName: "HONEY MAXX",
    wallet: "BOBRO_2X7K...HNY",
    score: 28_900_000,
    formattedMcap: formatMcap(28_900_000),
    selectedSkin: "luchador",
    zone: "CLOUDS",
    bobrosCount: 2,
    submittedAt: `${new Date().toISOString().slice(0, 10)}T10:38:00.000Z`,
    createdAt: `${new Date().toISOString().slice(0, 10)}T10:38:00.000Z`,
    weekId: currentWeekId,
    runId: "mock-honey-maxx",
    runDurationMs: 194_000,
    validationStatus: "accepted",
  },
  {
    entryId: "mock-wagmi-pilot",
    displayName: "WAGMI PILOT",
    wallet: "WAGMI_9L1P...CRT",
    score: 8_400_000,
    formattedMcap: formatMcap(8_400_000),
    selectedSkin: "high-bobo",
    zone: "SKY ASCENT",
    bobrosCount: 1,
    submittedAt: `${new Date().toISOString().slice(0, 10)}T11:05:00.000Z`,
    createdAt: `${new Date().toISOString().slice(0, 10)}T11:05:00.000Z`,
    weekId: currentWeekId,
    runId: "mock-wagmi-pilot",
    runDurationMs: 128_000,
    validationStatus: "accepted",
  },
  {
    entryId: "mock-green-bobro",
    displayName: "GREEN BOBRO",
    wallet: "GREEN_4CND...LFG",
    score: 1_200_000,
    formattedMcap: formatMcap(1_200_000),
    selectedSkin: "bobohazard",
    zone: "ROOFTOPS",
    bobrosCount: 4,
    submittedAt: `${new Date().toISOString().slice(0, 10)}T12:22:00.000Z`,
    createdAt: `${new Date().toISOString().slice(0, 10)}T12:22:00.000Z`,
    weekId: currentWeekId,
    runId: "mock-green-bobro",
    runDurationMs: 81_000,
    validationStatus: "accepted",
  },
  {
    entryId: "mock-paper-hands",
    displayName: "PAPER HANDS",
    wallet: "PAPER_0HND...NGMI",
    score: 420_000,
    formattedMcap: formatMcap(420_000),
    selectedSkin: "bobro-head",
    zone: "BACKALLEY",
    bobrosCount: 1,
    submittedAt: `${new Date().toISOString().slice(0, 10)}T13:01:00.000Z`,
    createdAt: `${new Date().toISOString().slice(0, 10)}T13:01:00.000Z`,
    weekId: currentWeekId,
    runId: "mock-paper-hands",
    runDurationMs: 49_000,
    validationStatus: "accepted",
  },
];

const globalWithLeaderboard = globalThis as typeof globalThis & {
  bobrosLeaderboard?: StoredLeaderboardEntry[];
};

if (!globalWithLeaderboard.bobrosLeaderboard) {
  globalWithLeaderboard.bobrosLeaderboard = mockEntries;
}

function sanitizeDisplayName(value: unknown) {
  if (typeof value !== "string") return "ANON BOBRO";
  if (/https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|gg|xyz|lol|app)\b/i.test(value)) return "ANON BOBRO";

  const normalized = value.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 16).trim().replace(/\s+/g, " ");
  return normalized || "ANON BOBRO";
}

function toPublicEntry(entry: StoredLeaderboardEntry, index: number): LeaderboardEntry {
  const {
    entryId: _entryId,
    createdAt: _createdAt,
    runId: _runId,
    runDurationMs: _runDurationMs,
    validationStatus: _validationStatus,
    validationReason: _validationReason,
    ...publicEntry
  } = entry;

  return { ...publicEntry, rank: index + 1 };
}

function rankedEntries(entries: StoredLeaderboardEntry[], limit = 25) {
  return [...entries]
    .sort((left, right) => right.score - left.score || left.submittedAt.localeCompare(right.submittedAt))
    .slice(0, limit)
    .map(toPublicEntry);
}

function getMemoryEntries() {
  return globalWithLeaderboard.bobrosLeaderboard ?? mockEntries;
}

function getMemoryPlayerBest(wallet: string | undefined, weekId?: string) {
  if (!wallet) return 0;

  return getMemoryEntries().reduce((bestScore, entry) => {
    if (entry.wallet !== wallet) return bestScore;
    if (weekId && entry.weekId !== weekId) return bestScore;
    return Math.max(bestScore, entry.score);
  }, 0);
}

async function getRedisEntriesFromSet(key: string, limit: number) {
  const redis = getRedis();

  if (!redis) return null;

  const entryIds = await redis.zrange<string[]>(key, 0, limit - 1, { rev: true });
  const entries = await Promise.all(entryIds.map((entryId) => redis.get<StoredLeaderboardEntry>(leaderboardKeys.entry(entryId))));

  return entries.filter((entry): entry is StoredLeaderboardEntry => Boolean(entry));
}

async function getRedisBestScore(key: string) {
  const redis = getRedis();

  if (!redis) return 0;

  const value = await redis.get<number>(key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function setRedisBestScore(key: string, score: number) {
  const redis = getRedis();

  if (!redis) return;

  const currentBest = await getRedisBestScore(key);

  if (score > currentBest) {
    await redis.set(key, score);
  }
}

export async function getLeaderboard(wallet?: string, scope: "weekly" | "all-time" = "weekly") {
  const weekId = getUtcWeekId();
  const redis = getRedis();

  if (!redis) {
    const entries = getMemoryEntries();
    const scopedEntries = scope === "weekly" ? entries.filter((entry) => entry.weekId === weekId) : entries;

    return {
      weekId,
      scope,
      playerBestToday: getMemoryPlayerBest(wallet, scope === "weekly" ? weekId : undefined),
      playerBestWeekly: getMemoryPlayerBest(wallet, weekId),
      entries: rankedEntries(scopedEntries),
    };
  }

  const scopedEntries = await getRedisEntriesFromSet(scope === "weekly" ? leaderboardKeys.weekly(weekId) : leaderboardKeys.allTime(), 25);

  return {
    weekId,
    scope,
    playerBestToday: wallet ? await getRedisBestScore(scope === "weekly" ? leaderboardKeys.weeklyBest(weekId, wallet) : leaderboardKeys.allTimeBest(wallet)) : 0,
    playerBestWeekly: wallet ? await getRedisBestScore(leaderboardKeys.weeklyBest(weekId, wallet)) : 0,
    entries: rankedEntries(scopedEntries ?? []),
  };
}

export async function addScore(payload: {
  score: number;
  wallet: string;
  displayName?: string;
  selectedSkin: string;
  zone: string;
  bobrosCount: number;
  weekId: string;
  runId: string;
  runDurationMs: number;
  validationReason?: string;
}) {
  const normalizedScore = Math.max(0, Math.floor(payload.score));
  const now = new Date().toISOString();
  const entry: StoredLeaderboardEntry = {
    entryId: randomUUID(),
    displayName: sanitizeDisplayName(payload.displayName),
    wallet: payload.wallet,
    score: normalizedScore,
    formattedMcap: formatMcap(normalizedScore),
    selectedSkin: payload.selectedSkin,
    zone: payload.zone,
    bobrosCount: payload.bobrosCount,
    submittedAt: now,
    createdAt: now,
    weekId: payload.weekId,
    runId: payload.runId,
    runDurationMs: payload.runDurationMs,
    validationStatus: "accepted",
    validationReason: payload.validationReason,
  };
  const redis = getRedis();

  if (!redis) {
    const currentEntries = getMemoryEntries();
    currentEntries.push(entry);

    globalWithLeaderboard.bobrosLeaderboard = currentEntries
      .sort((left, right) => right.score - left.score || left.submittedAt.localeCompare(right.submittedAt))
      .slice(0, 250);

    return getLeaderboard(payload.wallet, "weekly");
  }

  await redis
    .pipeline()
    .set(leaderboardKeys.entry(entry.entryId), entry)
    .zadd(leaderboardKeys.weekly(payload.weekId), { score: normalizedScore, member: entry.entryId })
    .zadd(leaderboardKeys.allTime(), { score: normalizedScore, member: entry.entryId })
    .exec();

  await Promise.all([
    setRedisBestScore(leaderboardKeys.weeklyBest(payload.weekId, payload.wallet), normalizedScore),
    setRedisBestScore(leaderboardKeys.allTimeBest(payload.wallet), normalizedScore),
  ]);

  return getLeaderboard(payload.wallet, "weekly");
}

export async function getAdminLeaderboard(weekId = getUtcWeekId(), limit = 100) {
  const redis = getRedis();

  if (!redis) {
    return rankedAdminEntries(getMemoryEntries().filter((entry) => entry.weekId === weekId), limit);
  }

  const entries = await getRedisEntriesFromSet(leaderboardKeys.weekly(weekId), limit);

  return rankedAdminEntries(entries ?? [], limit);
}

function rankedAdminEntries(entries: StoredLeaderboardEntry[], limit: number) {
  return [...entries]
    .sort((left, right) => right.score - left.score || left.submittedAt.localeCompare(right.submittedAt))
    .slice(0, limit);
}

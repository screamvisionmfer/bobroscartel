import { randomUUID } from "crypto";
import { formatMcap, getUtcWeekEndsAt, getUtcWeekId } from "./gameConfig";
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
  xHandle?: string;
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
  weeklyEntry: (weekId: string, wallet: string) => `${leaderboardPrefix}:entry:weekly:${weekId}:${wallet}`,
  allTimeEntry: (wallet: string) => `${leaderboardPrefix}:entry:all-time:${wallet}`,
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

async function getRedisEntriesFromSet(key: string, limit: number, scope: "weekly" | "all-time", weekId?: string) {
  const redis = getRedis();

  if (!redis) return null;

  const members = await redis.zrange<string[]>(key, 0, limit - 1, { rev: true });
  const entries = await Promise.all(
    members.map(async (member) => {
      if (scope === "weekly" && weekId) {
        return (await redis.get<StoredLeaderboardEntry>(leaderboardKeys.weeklyEntry(weekId, member))) ?? (await redis.get<StoredLeaderboardEntry>(leaderboardKeys.entry(member)));
      }

      return (await redis.get<StoredLeaderboardEntry>(leaderboardKeys.allTimeEntry(member))) ?? (await redis.get<StoredLeaderboardEntry>(leaderboardKeys.entry(member)));
    }),
  );

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
  const now = new Date();
  const weekId = getUtcWeekId(now);
  const weekEndsAt = getUtcWeekEndsAt(now);
  const serverTime = now.toISOString();
  const redis = getRedis();

  if (!redis) {
    const entries = getMemoryEntries();
    const scopedEntries = scope === "weekly" ? entries.filter((entry) => entry.weekId === weekId) : entries;

    return {
      weekId,
      weekEndsAt,
      serverTime,
      scope,
      playerBestToday: getMemoryPlayerBest(wallet, scope === "weekly" ? weekId : undefined),
      playerBestWeekly: getMemoryPlayerBest(wallet, weekId),
      entries: rankedEntries(scopedEntries),
    };
  }

  const scopedEntries = await getRedisEntriesFromSet(scope === "weekly" ? leaderboardKeys.weekly(weekId) : leaderboardKeys.allTime(), 25, scope, weekId);

  return {
    weekId,
    weekEndsAt,
    serverTime,
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
  xHandle?: string;
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
  const displayName = sanitizeDisplayName(payload.displayName);
  const xHandle = sanitizeXHandle(payload.xHandle);
  const redis = getRedis();

  const makeEntry = (existing?: StoredLeaderboardEntry | null): StoredLeaderboardEntry => ({
    entryId: existing?.entryId ?? `${payload.weekId}:${payload.wallet}`,
    displayName,
    xHandle,
    wallet: payload.wallet,
    score: normalizedScore,
    formattedMcap: formatMcap(normalizedScore),
    selectedSkin: payload.selectedSkin,
    zone: payload.zone,
    bobrosCount: payload.bobrosCount,
    submittedAt: now,
    createdAt: existing?.createdAt ?? now,
    weekId: payload.weekId,
    runId: payload.runId,
    runDurationMs: payload.runDurationMs,
    validationStatus: "accepted",
    validationReason: payload.validationReason,
  });

  if (!redis) {
    const currentEntries = getMemoryEntries();
    const existingIndex = currentEntries.findIndex((entry) => entry.weekId === payload.weekId && entry.wallet === payload.wallet);
    const existingEntry = existingIndex >= 0 ? currentEntries[existingIndex] : undefined;

    if (existingEntry && normalizedScore <= existingEntry.score) {
      return getLeaderboard(payload.wallet, "weekly");
    }

    const entry = makeEntry(existingEntry);

    if (existingIndex >= 0) {
      currentEntries[existingIndex] = entry;
    } else {
      currentEntries.push(entry);
    }

    globalWithLeaderboard.bobrosLeaderboard = currentEntries
      .sort((left, right) => right.score - left.score || left.submittedAt.localeCompare(right.submittedAt))
      .slice(0, 250);

    return getLeaderboard(payload.wallet, "weekly");
  }

  const weeklyEntryKey = leaderboardKeys.weeklyEntry(payload.weekId, payload.wallet);
  const allTimeEntryKey = leaderboardKeys.allTimeEntry(payload.wallet);
  const [existingWeeklyEntry, existingAllTimeEntry] = await Promise.all([
    redis.get<StoredLeaderboardEntry>(weeklyEntryKey),
    redis.get<StoredLeaderboardEntry>(allTimeEntryKey),
  ]);

  if (existingWeeklyEntry && normalizedScore <= existingWeeklyEntry.score) {
    return getLeaderboard(payload.wallet, "weekly");
  }

  const weeklyEntry = makeEntry(existingWeeklyEntry);
  const pipeline = redis.pipeline()
    .set(weeklyEntryKey, weeklyEntry)
    .zadd(leaderboardKeys.weekly(payload.weekId), { score: normalizedScore, member: payload.wallet })
    .set(leaderboardKeys.weeklyBest(payload.weekId, payload.wallet), normalizedScore);

  if (!existingAllTimeEntry || normalizedScore > existingAllTimeEntry.score) {
    pipeline
      .set(allTimeEntryKey, { ...weeklyEntry, entryId: `all-time:${payload.wallet}` })
      .zadd(leaderboardKeys.allTime(), { score: normalizedScore, member: payload.wallet })
      .set(leaderboardKeys.allTimeBest(payload.wallet), normalizedScore);
  }

  await pipeline.exec();

  return getLeaderboard(payload.wallet, "weekly");
}

export async function getAdminLeaderboard(weekId = getUtcWeekId(), limit = 100) {
  const redis = getRedis();

  if (!redis) {
    return rankedAdminEntries(getMemoryEntries().filter((entry) => entry.weekId === weekId), limit);
  }

  const entries = await getRedisEntriesFromSet(leaderboardKeys.weekly(weekId), limit, "weekly", weekId);

  return rankedAdminEntries(entries ?? [], limit);
}

function rankedAdminEntries(entries: StoredLeaderboardEntry[], limit: number) {
  return [...entries]
    .sort((left, right) => right.score - left.score || left.submittedAt.localeCompare(right.submittedAt))
    .slice(0, limit);
}

export type LeaderboardResetScope = "weekly" | "all-time" | "all";

export type LeaderboardResetResult = {
  scope: LeaderboardResetScope;
  weekId: string;
  dryRun: boolean;
  storage: "redis" | "memory";
  entriesFound: number;
  keysPlanned: string[];
  deletedKeys: string[];
};

export async function resetLeaderboard(options: {
  scope?: LeaderboardResetScope;
  weekId?: string;
  dryRun?: boolean;
} = {}): Promise<LeaderboardResetResult> {
  const scope = options.scope ?? "weekly";
  const weekId = options.weekId ?? getUtcWeekId();
  const dryRun = options.dryRun ?? false;
  const redis = getRedis();

  if (!redis) {
    const currentEntries = getMemoryEntries();
    const entriesToRemove = currentEntries.filter((entry) => scope === "all" || scope === "all-time" || entry.weekId === weekId);

    if (!dryRun) {
      if (scope === "weekly") {
        globalWithLeaderboard.bobrosLeaderboard = currentEntries.filter((entry) => entry.weekId !== weekId);
      } else {
        globalWithLeaderboard.bobrosLeaderboard = [];
      }
    }

    return {
      scope,
      weekId,
      dryRun,
      storage: "memory",
      entriesFound: entriesToRemove.length,
      keysPlanned: [],
      deletedKeys: [],
    };
  }

  const weeklyKey = leaderboardKeys.weekly(weekId);
  const weeklyMembers = await redis.zrange<string[]>(weeklyKey, 0, -1);
  const weeklyEntries = await Promise.all(
    weeklyMembers.map(async (member) => {
      return (await redis.get<StoredLeaderboardEntry>(leaderboardKeys.weeklyEntry(weekId, member))) ?? (await redis.get<StoredLeaderboardEntry>(leaderboardKeys.entry(member)));
    }),
  );
  const existingWeeklyEntries = weeklyEntries.filter((entry): entry is StoredLeaderboardEntry => Boolean(entry));
  const weeklyWallets = Array.from(new Set(existingWeeklyEntries.map((entry) => entry.wallet)));

  const keysPlanned = new Set<string>();

  if (scope === "weekly" || scope === "all") {
    keysPlanned.add(weeklyKey);
    weeklyMembers.forEach((member) => keysPlanned.add(leaderboardKeys.weeklyEntry(weekId, member)));
    weeklyMembers.forEach((member) => keysPlanned.add(leaderboardKeys.entry(member)));
    weeklyWallets.forEach((wallet) => keysPlanned.add(leaderboardKeys.weeklyBest(weekId, wallet)));
  }

  if (scope === "all-time" || scope === "all") {
    keysPlanned.add(leaderboardKeys.allTime());
    weeklyWallets.forEach((wallet) => {
      keysPlanned.add(leaderboardKeys.allTimeEntry(wallet));
      keysPlanned.add(leaderboardKeys.allTimeBest(wallet));
    });
  }

  const planned = Array.from(keysPlanned);

  if (!dryRun && planned.length > 0) {
    await redis.del(...planned);
  }

  return {
    scope,
    weekId,
    dryRun,
    storage: "redis",
    entriesFound: existingWeeklyEntries.length,
    keysPlanned: planned,
    deletedKeys: dryRun ? [] : planned,
  };
}


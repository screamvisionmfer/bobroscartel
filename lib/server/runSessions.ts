import { randomUUID } from "crypto";
import { allowedSkins, allowedZones, getUtcWeekId, maxScore, zoneMinimumScores } from "./gameConfig";
import { getRedis } from "./redis";

export type RunSession = {
  runId: string;
  wallet: string;
  selectedSkin: string;
  zone: string;
  startedAt: string;
  expiresAt: string;
  weekId: string;
  used: boolean;
};

type ConsumedRunSession =
  | {
      session: RunSession;
      runDurationMs: number;
      validationReason: string;
    }
  | {
      error: string;
    };

const runSessionTtlMs = 30 * 60_000;
const runSessionTtlSeconds = Math.ceil(runSessionTtlMs / 1000);
const minRunDurationMs = 3_000;
const maxScoreBase = 100_000_000;
const maxScorePerSecond = 3_000_000_000;
const runSessionPrefix = "bobros:run";

const runSessionKeys = {
  session: (runId: string) => `${runSessionPrefix}:session:${runId}`,
  used: (runId: string) => `${runSessionPrefix}:used:${runId}`,
};

const globalWithRunSessions = globalThis as typeof globalThis & {
  bobrosRunSessions?: Map<string, RunSession>;
};

if (!globalWithRunSessions.bobrosRunSessions) {
  globalWithRunSessions.bobrosRunSessions = new Map();
}

const runSessions = globalWithRunSessions.bobrosRunSessions;

export async function createRunSession({
  wallet = "",
  selectedSkin,
  zone,
}: {
  wallet?: string;
  selectedSkin: string;
  zone: string;
}) {
  const now = Date.now();
  const runId = randomUUID();
  const session: RunSession = {
    runId,
    wallet,
    selectedSkin,
    zone,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + runSessionTtlMs).toISOString(),
    weekId: getUtcWeekId(new Date(now)),
    used: false,
  };
  const redis = getRedis();

  if (!redis) {
    runSessions.set(runId, session);
    cleanupExpiredRunSessions(now);

    return session;
  }

  // Production run sessions are durable across serverless instances, but still
  // short-lived. If this grows beyond the game, move to a real review DB.
  await redis.set(runSessionKeys.session(runId), session, { ex: runSessionTtlSeconds });

  return session;
}

export async function consumeRunSession({
  runId,
  wallet,
  selectedSkin,
  score,
  zone,
}: {
  runId: string;
  wallet: string;
  selectedSkin: string;
  score: number;
  zone: string;
}): Promise<ConsumedRunSession> {
  const redis = getRedis();

  if (!redis) {
    return consumeMemoryRunSession({ runId, wallet, selectedSkin, score, zone });
  }

  const session = await redis.get<RunSession>(runSessionKeys.session(runId));

  if (!session) {
    return { error: "Invalid run session" as const };
  }

  const reserve = await redis.set(runSessionKeys.used(runId), "1", { nx: true, ex: runSessionTtlSeconds });

  if (reserve !== "OK") {
    return { error: "Run session already used" as const };
  }

  const validation = validateRunSession({ session, wallet, selectedSkin, score, zone });

  if ("error" in validation) {
    return validation;
  }

  return validation;
}

function consumeMemoryRunSession({
  runId,
  wallet,
  selectedSkin,
  score,
  zone,
}: {
  runId: string;
  wallet: string;
  selectedSkin: string;
  score: number;
  zone: string;
}): ConsumedRunSession {
  const session = runSessions.get(runId);

  if (!session) {
    return { error: "Invalid run session" as const };
  }

  if (session.used) {
    return { error: "Run session already used" as const };
  }

  const validation = validateRunSession({ session, wallet, selectedSkin, score, zone });

  if ("error" in validation) {
    runSessions.delete(runId);
    return validation;
  }

  session.used = true;
  runSessions.set(runId, session);

  return validation;
}

function validateRunSession({
  session,
  wallet,
  selectedSkin,
  score,
  zone,
}: {
  session: RunSession;
  wallet: string;
  selectedSkin: string;
  score: number;
  zone: string;
}): ConsumedRunSession {
  const now = Date.now();
  const startedAtMs = Date.parse(session.startedAt);
  const expiresAtMs = Date.parse(session.expiresAt);

  if (!Number.isFinite(startedAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
    return { error: "Run session expired" as const };
  }

  if (session.wallet !== wallet || session.selectedSkin !== selectedSkin) {
    return { error: "Run session mismatch" as const };
  }

  if (!allowedSkins.has(selectedSkin)) {
    return { error: "Invalid skin" as const };
  }

  if (!allowedZones.has(session.zone)) {
    return { error: "Invalid start zone" as const };
  }

  if (!allowedZones.has(zone) || score < (zoneMinimumScores[zone] ?? 0)) {
    return { error: "Zone failed validation" as const };
  }

  const runDurationMs = now - startedAtMs;

  if (runDurationMs < minRunDurationMs) {
    return { error: "Run duration too short" as const };
  }

  if (score < 0 || score > maxScore || score > getMaxScoreForDuration(runDurationMs)) {
    return { error: "Score failed validation" as const };
  }

  return {
    session,
    runDurationMs,
    validationReason: `duration=${runDurationMs}ms`,
  };
}

export function getMaxScoreForDuration(runDurationMs: number) {
  return Math.min(maxScore, maxScoreBase + (runDurationMs / 1000) * maxScorePerSecond);
}

function cleanupExpiredRunSessions(now: number) {
  if (runSessions.size < 500) return;

  runSessions.forEach((session, runId) => {
    if (Date.parse(session.expiresAt) <= now || session.used) {
      runSessions.delete(runId);
    }
  });
}

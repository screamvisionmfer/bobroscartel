import { randomUUID } from "crypto";
import type { ChallengeRunData, GhostPoint } from "../../components/game/challengeTypes";
import { allowedSkins, allowedZones, formatMcap, maxScore } from "./gameConfig";
import { getRedis, withRedisTimeout } from "./redis";

const challengePrefix = "bobros:challenge";
const challengeTtlSeconds = 60 * 60 * 24 * 30;
const maxGhostPoints = 2200;

const challengeKeys = {
  challenge: (challengeId: string) => `${challengePrefix}:${challengeId}`,
};

const globalWithChallenges = globalThis as typeof globalThis & {
  bobrosChallenges?: Map<string, ChallengeRunData>;
};

if (!globalWithChallenges.bobrosChallenges) {
  globalWithChallenges.bobrosChallenges = new Map();
}

const memoryChallenges = globalWithChallenges.bobrosChallenges;

type ValidatedChallengePayload =
  | {
      value: Omit<ChallengeRunData, "challengeId" | "createdAt">;
    }
  | {
      error: string;
    };

function sanitizeName(value: unknown) {
  if (typeof value !== "string") return "ANON BOBRO";

  const cleaned = value
    .trim()
    .replace(/https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|gg|xyz|lol|app)\b/gi, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 16)
    .trim();

  return cleaned || "ANON BOBRO";
}

function sanitizeX(value: unknown) {
  if (typeof value !== "string") return undefined;

  const cleaned = value
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 15);

  return cleaned || undefined;
}

function sanitizeWallet(value: unknown) {
  if (typeof value !== "string") return undefined;

  const cleaned = value.trim();
  return cleaned.length >= 32 && cleaned.length <= 44 ? cleaned : undefined;
}

function sanitizeGhostData(value: unknown): GhostPoint[] {
  if (!Array.isArray(value)) return [];

  const points: GhostPoint[] = [];

  for (const point of value.slice(0, maxGhostPoints)) {
    if (typeof point !== "object" || point === null) continue;
    const candidate = point as Partial<GhostPoint>;
    const t = Number(candidate.t);
    const x = Number(candidate.x);
    const y = Number(candidate.y);

    if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (t < 0 || t > 60 * 30) continue;

    points.push({
      t: Math.round(t * 1000) / 1000,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  }

  return points;
}

function createChallengeId() {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

export function validateChallengePayload(payload: {
  displayName?: unknown;
  xHandle?: unknown;
  wallet?: unknown;
  selectedSkin?: unknown;
  score?: unknown;
  formattedMcap?: unknown;
  zone?: unknown;
  duration?: unknown;
  ghostData?: unknown;
}): ValidatedChallengePayload {
  const selectedSkin = typeof payload.selectedSkin === "string" ? payload.selectedSkin.trim() : "";
  const zone = typeof payload.zone === "string" ? payload.zone.trim() : "";
  const score = Number(payload.score);
  const duration = Number(payload.duration);

  if (!allowedSkins.has(selectedSkin)) {
    return { error: "Invalid skin" as const };
  }

  if (!allowedZones.has(zone)) {
    return { error: "Invalid zone" as const };
  }

  if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > maxScore) {
    return { error: "Invalid score" as const };
  }

  if (!Number.isFinite(duration) || duration < 0 || duration > 60 * 30) {
    return { error: "Invalid duration" as const };
  }

  return {
    value: {
      creatorName: sanitizeName(payload.displayName),
      creatorX: sanitizeX(payload.xHandle),
      creatorWallet: sanitizeWallet(payload.wallet),
      selectedSkin,
      score,
      formattedMcap: typeof payload.formattedMcap === "string" ? payload.formattedMcap.slice(0, 24) : formatMcap(score),
      zone,
      duration: Math.round(duration * 1000) / 1000,
      ghostData: sanitizeGhostData(payload.ghostData),
    },
  };
}

export async function createChallenge(payload: Omit<ChallengeRunData, "challengeId" | "createdAt">) {
  const challenge: ChallengeRunData = {
    ...payload,
    challengeId: createChallengeId(),
    createdAt: new Date().toISOString(),
  };
  const redis = getRedis();

  if (!redis) {
    memoryChallenges.set(challenge.challengeId, challenge);
    return challenge;
  }

  await withRedisTimeout(redis.set(challengeKeys.challenge(challenge.challengeId), challenge, { ex: challengeTtlSeconds }));

  return challenge;
}

export async function getChallenge(challengeId: string) {
  const safeId = challengeId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  if (!safeId) return null;

  const redis = getRedis();

  if (!redis) {
    return memoryChallenges.get(safeId) ?? null;
  }

  return await withRedisTimeout(redis.get<ChallengeRunData>(challengeKeys.challenge(safeId)));
}

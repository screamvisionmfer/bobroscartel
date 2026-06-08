import { NextResponse } from "next/server";
import { addScore, updateLeaderboardProfile } from "../../../lib/server/leaderboardStore";
import { checkBobrosHolder, isValidSolanaAddress } from "../../../lib/server/checkBobrosHolder";
import { allowedSkins, allowedZones, maxScore } from "../../../lib/server/gameConfig";
import { checkRateLimit, getClientIp } from "../../../lib/server/rateLimit";
import { consumeRunSession } from "../../../lib/server/runSessions";

const maxPostBodyBytes = 4096;

type ScorePayload = {
  displayName?: unknown;
  wallet?: unknown;
  score?: unknown;
  formattedMcap?: unknown;
  xHandle?: unknown;
  selectedSkin?: unknown;
  zone?: unknown;
  bobrosCount?: unknown;
  runId?: unknown;
};

type ScoreProfilePayload = {
  displayName?: unknown;
  wallet?: unknown;
  xHandle?: unknown;
};

type ValidatedScorePayload =
  | {
      value: {
        wallet: string;
        score: number;
        selectedSkin: string;
        zone: string;
        displayName?: string;
        xHandle?: string;
        runId: string;
      };
    }
  | {
      error: string;
    };

type ValidatedScoreProfilePayload =
  | {
      value: {
        wallet: string;
        displayName?: string;
        xHandle?: string;
      };
    }
  | {
      error: string;
    };

function jsonError(message: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
    },
  );
}

function isOversized(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > maxPostBodyBytes;
}

function validateScorePayload(payload: ScorePayload): ValidatedScorePayload {
  const wallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";
  const score = payload.score;
  const selectedSkin = typeof payload.selectedSkin === "string" ? payload.selectedSkin.trim() : "";
  const zone = typeof payload.zone === "string" ? payload.zone.trim() : "";
  const displayName = typeof payload.displayName === "string" ? payload.displayName : undefined;
  const xHandle = typeof payload.xHandle === "string" ? payload.xHandle.trim().replace(/^@+/, "") : undefined;
  const runId = typeof payload.runId === "string" ? payload.runId.trim() : "";

  if (!runId || runId.length > 80) {
    return { error: "Invalid run session" as const };
  }

  if (!isValidSolanaAddress(wallet)) {
    return { error: "Invalid wallet" as const };
  }

  if (typeof score !== "number" || !Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > maxScore) {
    return { error: "Invalid score" as const };
  }

  if (payload.bobrosCount !== undefined) {
    if (typeof payload.bobrosCount !== "number" || !Number.isFinite(payload.bobrosCount) || !Number.isInteger(payload.bobrosCount) || payload.bobrosCount < 0) {
      return { error: "Invalid holder count" as const };
    }
  }

  if (!allowedSkins.has(selectedSkin)) {
    return { error: "Invalid skin" as const };
  }

  if (!allowedZones.has(zone)) {
    return { error: "Invalid zone" as const };
  }

  if (displayName !== undefined && displayName.length > 64) {
    return { error: "Invalid display name" as const };
  }

  if (xHandle !== undefined && (!/^[a-zA-Z0-9_]{1,15}$/.test(xHandle))) {
    return { error: "Invalid X handle" as const };
  }

  return {
    value: {
      wallet,
      score,
      selectedSkin,
      zone,
      displayName,
      xHandle,
      runId,
    },
  };
}

function validateScoreProfilePayload(payload: ScoreProfilePayload): ValidatedScoreProfilePayload {
  const wallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";
  const displayName = typeof payload.displayName === "string" ? payload.displayName : undefined;
  const xHandle = typeof payload.xHandle === "string" ? payload.xHandle.trim().replace(/^@+/, "") : undefined;

  if (!isValidSolanaAddress(wallet)) {
    return { error: "Invalid wallet" as const };
  }

  if (displayName !== undefined && displayName.length > 64) {
    return { error: "Invalid display name" as const };
  }

  if (xHandle !== undefined && xHandle.length > 0 && !/^[a-zA-Z0-9_]{1,15}$/.test(xHandle)) {
    return { error: "Invalid X handle" as const };
  }

  return {
    value: {
      wallet,
      displayName,
      xHandle: xHandle || undefined,
    },
  };
}

export async function POST(request: Request) {
  if (isOversized(request)) {
    return jsonError("Request body too large", 413);
  }

  const clientIp = getClientIp(request);
  let ipLimit;

  try {
    ipLimit = await checkRateLimit({ namespace: "score-ip", key: clientIp, limit: 20, windowMs: 5 * 60_000 });
  } catch {
    return jsonError("Score service unavailable", 503);
  }

  if (ipLimit.limited) {
    return jsonError("Too many requests", 429, ipLimit.retryAfterSeconds);
  }

  let payload: ScorePayload;

  try {
    payload = (await request.json()) as ScorePayload;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const validated = validateScorePayload(payload);

  if ("error" in validated) {
    return jsonError(validated.error, 400);
  }

  let walletLimit;

  try {
    walletLimit = await checkRateLimit({
      namespace: "score-wallet",
      key: `${clientIp}:${validated.value.wallet}`,
      limit: 6,
      windowMs: 5 * 60_000,
    });
  } catch {
    return jsonError("Score service unavailable", 503);
  }

  if (walletLimit.limited) {
    return jsonError("Too many requests", 429, walletLimit.retryAfterSeconds);
  }

  let runValidation;

  try {
    runValidation = await consumeRunSession({
      runId: validated.value.runId,
      wallet: validated.value.wallet,
      selectedSkin: validated.value.selectedSkin,
      score: validated.value.score,
      zone: validated.value.zone,
    });
  } catch {
    return jsonError("Run session unavailable", 503);
  }

  if ("error" in runValidation) {
    return jsonError(runValidation.error, 400);
  }

  let holder;

  try {
    holder = await checkBobrosHolder(validated.value.wallet);
  } catch {
    return jsonError("Holder verification unavailable", 502);
  }

  if (!holder.isHolder) {
    return jsonError("Holder wallet required", 403);
  }

  // This confirms the submitted public key currently holds Bobros, but it does
  // not prove the browser user controls that wallet. Add explicit signMessage
  // verification later if the bounty board needs anti-impersonation guarantees.
  let leaderboard;

  try {
    leaderboard = await addScore({
      score: validated.value.score,
      wallet: holder.wallet,
      bobrosCount: holder.bobrosCount,
      displayName: validated.value.displayName,
      xHandle: validated.value.xHandle,
      selectedSkin: validated.value.selectedSkin,
      zone: validated.value.zone,
      weekId: runValidation.session.weekId,
      runId: runValidation.session.runId,
      runDurationMs: runValidation.runDurationMs,
      validationReason: runValidation.validationReason,
    });
  } catch {
    return jsonError("Leaderboard unavailable", 503);
  }

  return NextResponse.json(leaderboard);
}

export async function PATCH(request: Request) {
  if (isOversized(request)) {
    return jsonError("Request body too large", 413);
  }

  const clientIp = getClientIp(request);
  let ipLimit;

  try {
    ipLimit = await checkRateLimit({ namespace: "score-profile-ip", key: clientIp, limit: 30, windowMs: 5 * 60_000 });
  } catch {
    return jsonError("Score service unavailable", 503);
  }

  if (ipLimit.limited) {
    return jsonError("Too many requests", 429, ipLimit.retryAfterSeconds);
  }

  let payload: ScoreProfilePayload;

  try {
    payload = (await request.json()) as ScoreProfilePayload;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const validated = validateScoreProfilePayload(payload);

  if ("error" in validated) {
    return jsonError(validated.error, 400);
  }

  let walletLimit;

  try {
    walletLimit = await checkRateLimit({
      namespace: "score-profile-wallet",
      key: `${clientIp}:${validated.value.wallet}`,
      limit: 12,
      windowMs: 5 * 60_000,
    });
  } catch {
    return jsonError("Score service unavailable", 503);
  }

  if (walletLimit.limited) {
    return jsonError("Too many requests", 429, walletLimit.retryAfterSeconds);
  }

  let holder;

  try {
    holder = await checkBobrosHolder(validated.value.wallet);
  } catch {
    return jsonError("Holder verification unavailable", 502);
  }

  if (!holder.isHolder) {
    return jsonError("Holder wallet required", 403);
  }

  // Profile updates deliberately do not change score or consume a run session.
  // This keeps already accepted no-sign scores from being lost while still
  // preserving the existing no-sign impersonation limitation.
  try {
    const leaderboard = await updateLeaderboardProfile({
      wallet: holder.wallet,
      displayName: validated.value.displayName,
      xHandle: validated.value.xHandle,
    });

    return NextResponse.json(leaderboard);
  } catch {
    return jsonError("Leaderboard unavailable", 503);
  }
}

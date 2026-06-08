import { NextResponse } from "next/server";
import { isValidSolanaAddress } from "../../../../lib/server/checkBobrosHolder";
import { allowedSkins, allowedZones } from "../../../../lib/server/gameConfig";
import { checkRateLimit, getClientIp } from "../../../../lib/server/rateLimit";
import { createRunSession } from "../../../../lib/server/runSessions";

const maxPostBodyBytes = 1024;

type RunStartPayload = {
  wallet?: unknown;
  selectedSkin?: unknown;
  zone?: unknown;
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

export async function POST(request: Request) {
  if (isOversized(request)) {
    return jsonError("Request body too large", 413);
  }

  const clientIp = getClientIp(request);
  let ipLimit;

  try {
    ipLimit = await checkRateLimit({ namespace: "run-start-ip", key: clientIp, limit: 120, windowMs: 5 * 60_000 });
  } catch {
    return jsonError("Run sessions unavailable", 503);
  }

  if (ipLimit.limited) {
    return jsonError("Too many requests", 429, ipLimit.retryAfterSeconds);
  }

  let payload: RunStartPayload;

  try {
    payload = (await request.json()) as RunStartPayload;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const wallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";
  const selectedSkin = typeof payload.selectedSkin === "string" ? payload.selectedSkin.trim() : "";
  const zone = typeof payload.zone === "string" ? payload.zone.trim() : "";

  if (wallet && !isValidSolanaAddress(wallet)) {
    return jsonError("Invalid wallet", 400);
  }

  if (!allowedSkins.has(selectedSkin)) {
    return jsonError("Invalid skin", 400);
  }

  if (!allowedZones.has(zone)) {
    return jsonError("Invalid zone", 400);
  }

  if (wallet) {
    let walletLimit;

    try {
      walletLimit = await checkRateLimit({
        namespace: "run-start-wallet",
        key: `${clientIp}:${wallet}`,
        limit: 60,
        windowMs: 5 * 60_000,
      });
    } catch {
      return jsonError("Run sessions unavailable", 503);
    }

    if (walletLimit.limited) {
      return jsonError("Too many requests", 429, walletLimit.retryAfterSeconds);
    }
  }

  let session;

  try {
    session = await createRunSession({ wallet, selectedSkin, zone });
  } catch {
    return jsonError("Run sessions unavailable", 503);
  }

  return NextResponse.json({
    runId: session.runId,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    weekId: session.weekId,
  });
}

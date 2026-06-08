import { NextResponse } from "next/server";
import { createChallenge, validateChallengePayload } from "../../../lib/server/challengeStore";
import { checkRateLimit, getClientIp } from "../../../lib/server/rateLimit";

const maxPostBodyBytes = 300_000;

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
  let limit;

  try {
    limit = await checkRateLimit({ namespace: "challenge-create-ip", key: clientIp, limit: 30, windowMs: 5 * 60_000 });
  } catch {
    return jsonError("Challenge service unavailable", 503);
  }

  if (limit.limited) {
    return jsonError("Too many requests", 429, limit.retryAfterSeconds);
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const validated = validateChallengePayload(payload);

  if ("error" in validated) {
    return jsonError(validated.error, 400);
  }

  try {
    const challenge = await createChallenge(validated.value);

    return NextResponse.json({
      challengeId: challenge.challengeId,
      challengeUrl: `/game/challenge/${challenge.challengeId}`,
    });
  } catch {
    return jsonError("Challenge service unavailable", 503);
  }
}

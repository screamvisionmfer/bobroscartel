import { NextResponse } from "next/server";
import { checkBobrosHolder, isValidSolanaAddress } from "../../../lib/server/checkBobrosHolder";
import { checkRateLimit, getClientIp } from "../../../lib/server/rateLimit";

const maxPostBodyBytes = 512;

type HolderPayload = {
  wallet?: unknown;
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

async function checkHolderWallet(request: Request, wallet: string) {
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ isHolder: false, bobrosCount: 0, wallet }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  let ipLimit;

  try {
    ipLimit = await checkRateLimit({ namespace: "check-holder-ip", key: clientIp, limit: 60, windowMs: 60_000 });
  } catch {
    return jsonError("Holder check unavailable", 503);
  }

  if (ipLimit.limited) {
    return jsonError("Too many requests", 429, ipLimit.retryAfterSeconds);
  }

  let walletLimit;

  try {
    walletLimit = await checkRateLimit({
      namespace: "check-holder-wallet",
      key: `${clientIp}:${wallet}`,
      limit: 20,
      windowMs: 60_000,
    });
  } catch {
    return jsonError("Holder check unavailable", 503);
  }

  if (walletLimit.limited) {
    return jsonError("Too many requests", 429, walletLimit.retryAfterSeconds);
  }

  try {
    const result = await checkBobrosHolder(wallet);

    return NextResponse.json({
      isHolder: result.isHolder,
      bobrosCount: result.bobrosCount,
      wallet: result.wallet,
    });
  } catch {
    return NextResponse.json({ isHolder: false, bobrosCount: 0, wallet }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet")?.trim() ?? "";

  return checkHolderWallet(request, wallet);
}

export async function POST(request: Request) {
  if (isOversized(request)) {
    return jsonError("Request body too large", 413);
  }

  let payload: HolderPayload;

  try {
    payload = (await request.json()) as HolderPayload;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const wallet = typeof payload.wallet === "string" ? payload.wallet.trim() : "";

  return checkHolderWallet(request, wallet);
}

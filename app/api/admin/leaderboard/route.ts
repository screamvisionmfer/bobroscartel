import { NextResponse } from "next/server";
import { getUtcWeekId } from "../../../../../lib/server/gameConfig";
import { resetLeaderboard, type LeaderboardResetScope } from "../../../../../lib/server/leaderboardStore";

const weekIdPattern = /^\d{4}-W\d{2}$/;
const allowedScopes = new Set<LeaderboardResetScope>(["weekly", "all-time", "all"]);

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}

function parseBoolean(value: unknown) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

async function readBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > 5_000) {
    throw new Error("Body too large");
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {} as Record<string, unknown>;
  }

  return (await request.json()) as Record<string, unknown>;
}

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_REVIEW_SECRET;

  if (!adminSecret) {
    return jsonError("Not found", process.env.NODE_ENV === "production" ? 404 : 403);
  }

  if (request.headers.get("x-admin-secret") !== adminSecret) {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(request.url);
  let body: Record<string, unknown>;

  try {
    body = await readBody(request);
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const rawWeekId = (body.weekId ?? url.searchParams.get("weekId") ?? getUtcWeekId()) as string;
  const weekId = typeof rawWeekId === "string" ? rawWeekId.trim() : getUtcWeekId();
  const rawScope = (body.scope ?? url.searchParams.get("scope") ?? "weekly") as string;
  const scope = typeof rawScope === "string" ? rawScope.trim() : "weekly";
  const dryRun = parseBoolean(body.dryRun ?? url.searchParams.get("dryRun"));

  if (!weekIdPattern.test(weekId)) {
    return jsonError("Invalid weekId", 400);
  }

  if (!allowedScopes.has(scope as LeaderboardResetScope)) {
    return jsonError("Invalid scope", 400);
  }

  try {
    const result = await resetLeaderboard({
      weekId,
      scope: scope as LeaderboardResetScope,
      dryRun,
    });

    return NextResponse.json(
      {
        ok: true,
        warning: "Manual admin reset endpoint. Use dryRun=true before deleting real leaderboard data.",
        ...result,
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    return jsonError("Reset unavailable", 503);
  }
}

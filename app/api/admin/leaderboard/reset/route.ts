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

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_REVIEW_SECRET;

  if (!adminSecret) {
    return jsonError("Not found", process.env.NODE_ENV === "production" ? 404 : 403);
  }

  if (request.headers.get("x-admin-secret") !== adminSecret) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const body = await parseJsonBody(request);
  const requestedWeekId = typeof body.weekId === "string" ? body.weekId.trim() : searchParams.get("weekId")?.trim();
  const requestedScope = typeof body.scope === "string" ? body.scope.trim() : searchParams.get("scope")?.trim();
  const dryRunParam = searchParams.get("dryRun");
  const dryRun = dryRunParam === "true" || body.dryRun === true;
  const scope = (requestedScope || "weekly") as LeaderboardResetScope;

  if (!allowedScopes.has(scope)) {
    return jsonError("Invalid scope", 400);
  }

  if (requestedWeekId && !weekIdPattern.test(requestedWeekId)) {
    return jsonError("Invalid weekId", 400);
  }

  const weekId = requestedWeekId || getUtcWeekId();

  try {
    const result = await resetLeaderboard({ scope, weekId, dryRun });

    return NextResponse.json(
      {
        ok: true,
        ...result,
        warning: dryRun ? "Dry run only. Nothing was deleted." : "Leaderboard reset completed.",
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    return jsonError("Reset failed", 503);
  }
}

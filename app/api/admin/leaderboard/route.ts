import { NextResponse } from "next/server";
import { getAdminLeaderboard } from "../../../../lib/server/leaderboardStore";
import { getUtcWeekId } from "../../../../lib/server/gameConfig";

const weekIdPattern = /^\d{4}-W\d{2}$/;
const defaultLimit = 100;
const maxLimit = 250;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}

export async function GET(request: Request) {
  const adminSecret = process.env.ADMIN_REVIEW_SECRET;

  if (!adminSecret) {
    return jsonError("Not found", process.env.NODE_ENV === "production" ? 404 : 403);
  }

  if (request.headers.get("x-admin-secret") !== adminSecret) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const requestedWeekId = searchParams.get("weekId")?.trim();
  const limit = parseLimit(searchParams.get("limit"));

  if (requestedWeekId && !weekIdPattern.test(requestedWeekId)) {
    return jsonError("Invalid weekId", 400);
  }

  const weekId = requestedWeekId || getUtcWeekId();

  try {
    const entries = await getAdminLeaderboard(weekId, limit);

    return NextResponse.json(
      {
        weekId,
        limit,
        reviewNote: "Weekly rewards are manually reviewed. No-sign runs are not cryptographic proof of wallet control.",
        entries: entries.map((entry, index) => ({
          rank: index + 1,
          displayName: entry.displayName,
          xHandle: entry.xHandle,
          wallet: entry.wallet,
          score: entry.score,
          formattedMcap: entry.formattedMcap,
          bobrosCount: entry.bobrosCount,
          selectedSkin: entry.selectedSkin,
          zone: entry.zone,
          weekId: entry.weekId,
          createdAt: entry.createdAt,
          submittedAt: entry.submittedAt,
          runDurationMs: entry.runDurationMs,
          runId: entry.runId,
          flags: getReviewFlags(entry.score, entry.runDurationMs, entry.zone),
        })),
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    return jsonError("Leaderboard unavailable", 503);
  }
}

function parseLimit(value: string | null) {
  const parsed = Number(value ?? defaultLimit);

  if (!Number.isFinite(parsed)) return defaultLimit;

  return Math.max(1, Math.min(maxLimit, Math.floor(parsed)));
}

function getReviewFlags(score: number, runDurationMs: number, zone: string) {
  const flags: string[] = [];
  const seconds = Math.max(1, runDurationMs / 1000);
  const scorePerSecond = score / seconds;

  if (runDurationMs < 10_000) flags.push("short-run");
  if (scorePerSecond > 1_500_000_000) flags.push("high-score-rate");
  if (zone === "BILLIONAIRE CLUB" || zone === "BOBO HEAVEN") flags.push("late-zone");

  return flags;
}

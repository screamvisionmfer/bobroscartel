import { NextResponse } from "next/server";
import { getUtcWeekEndsAt, getUtcWeekId } from "../../../lib/server/gameConfig";
import { getLeaderboard } from "../../../lib/server/leaderboardStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet") ?? undefined;
  const scope = searchParams.get("scope") === "all-time" ? "all-time" : "weekly";

  try {
    return NextResponse.json(await getLeaderboard(wallet, scope));
  } catch {
    const now = new Date();

    return NextResponse.json(
      {
        error: "Leaderboard unavailable",
        weekId: getUtcWeekId(now),
        weekEndsAt: getUtcWeekEndsAt(now),
        serverTime: now.toISOString(),
        scope,
        playerBestToday: 0,
        playerBestWeekly: 0,
        entries: [],
      },
      { status: 503 },
    );
  }
}

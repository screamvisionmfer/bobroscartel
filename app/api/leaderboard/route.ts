import { NextResponse } from "next/server";
import { getLeaderboard } from "../../../lib/server/leaderboardStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet") ?? undefined;
  const scope = searchParams.get("scope") === "all-time" ? "all-time" : "weekly";

  try {
    return NextResponse.json(await getLeaderboard(wallet, scope));
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 503 });
  }
}

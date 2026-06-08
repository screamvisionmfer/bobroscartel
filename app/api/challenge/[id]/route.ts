import { NextResponse } from "next/server";
import { getChallenge } from "../../../../lib/server/challengeStore";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const challenge = await getChallenge(id);

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    return NextResponse.json(challenge);
  } catch {
    return NextResponse.json({ error: "Challenge unavailable" }, { status: 503 });
  }
}

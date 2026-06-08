import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameShell from "../../../../components/game/GameShell";
import { getChallenge } from "../../../../lib/server/challengeStore";

export const metadata: Metadata = {
  title: "Ghost Challenge | BOBRO TO THE MOON",
  description: "Race a BOBROS ghost run and try to beat the target MCAP.",
};

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = await getChallenge(id);

  if (!challenge) {
    notFound();
  }

  return <GameShell challengeRun={challenge} />;
}

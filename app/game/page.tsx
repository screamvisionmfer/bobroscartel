import type { Metadata } from "next";
import GameShell from "../../components/game/GameShell";

export const metadata: Metadata = {
  title: "BOBRO TO THE MOON | BOBROS Cartel",
  description: "A holder-gated BOBROS vertical jumper mini game.",
};

export default function GamePage() {
  return <GameShell />;
}

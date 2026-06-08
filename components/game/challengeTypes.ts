export type GhostPoint = {
  t: number;
  x: number;
  y: number;
};

export type ChallengeRunData = {
  challengeId: string;
  creatorName: string;
  creatorX?: string;
  creatorWallet?: string;
  selectedSkin: string;
  score: number;
  formattedMcap: string;
  zone: string;
  duration: number;
  ghostData: GhostPoint[];
  createdAt: string;
};

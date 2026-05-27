"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./Game.module.css";
import { useGameAudio, type GameAudioCue, type GameMusicMode } from "./useGameAudio";

const playerWallet = "DEMO_BOBRO...PLAY";
const defaultPlayerName = "ANON BOBRO";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
const fallbackGameShareUrl = "https://www.bobroscartel.lol/game";
const canvasDprCapDesktop = 1.5;
const canvasDprCapMobile = 1.15;
const canvasFrameMsDesktop = 1000 / 60;
const canvasFrameMsMobile = 1000 / 45;
const canvasIdleFrameMsDesktop = 1000 / 30;
const canvasIdleFrameMsMobile = 1000 / 24;

function getCanvasPerformanceProfile(width: number) {
  const isCoarsePointer =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false;
  const isMobileSized = width <= 760 || isCoarsePointer;

  return {
    dprCap: isMobileSized ? canvasDprCapMobile : canvasDprCapDesktop,
    activeFrameMs: isMobileSized ? canvasFrameMsMobile : canvasFrameMsDesktop,
    idleFrameMs: isMobileSized ? canvasIdleFrameMsMobile : canvasIdleFrameMsDesktop,
  };
}

const legacyPlayerAssetPath = "/game/bobro-head.png";
const headAssetPaths = {
  "bobro-head": "/game/heads/bobro-head.png",
  bobohazard: "/game/heads/bobohazard.png",
  "high-bobo": "/game/heads/high-bobo.png",
  luchador: "/game/heads/luchador.png",
  skelebobo: "/game/heads/skelebobo.png",
  diamondbobo: "/game/heads/diamondbobo.png",
  "og-rekt": "/game/heads/og-rekt.png",
  theoneape: "/game/heads/theoneape.png",
} as const;
const backgroundAssetPaths = {
  backalley: "/game/backgrounds/bg-01-backalley.webp",
  rooftops: "/game/backgrounds/bg-02-rooftops.webp",
  "sky-ascent": "/game/backgrounds/bg-03-sky-ascent.webp",
  clouds: "/game/backgrounds/bg-04-clouds.webp",
  "storm-market": "/game/backgrounds/bg-05-storm-market.webp",
  moon: "/game/backgrounds/bg-06-moon.webp",
  "crypto-orbit": "/game/backgrounds/bg-07-crypto-orbit.webp",
  ascension: "/game/backgrounds/bg-08-ascension.webp",
  "billionaire-club": "/game/backgrounds/bg-09-billionaire-club.webp",
  "bobo-heaven": "/game/backgrounds/bg-10-bobo-heaven.webp",
} as const;
const platformAssetPaths = {
  "green-candle": "/game/assets/green-candle.png",
  "red-candle": "/game/assets/red-candle.png",
  rug: "/game/assets/rug.png",
  "honey-jar": "/game/assets/honey-spot.png",
  "cash-stack": "/game/assets/cashprinter.png",
  solana: "/game/assets/solana.png",
} as const;
const mumuAssetPath = "/game/assets/mumu.png";
const evilMumuAssetPath = "/game/assets/evil-mumu.png";
const honeyLifeAssetPath = "/game/assets/honey.png";
const jetpackAssetPath = "/game/assets/jetpack.png";

const deathMessages = [
  "HE BOUGHT THE TOP.",
  "LIQUIDATED.",
  "PAPER HANDS DETECTED.",
  "BOBRO FELL OFF.",
  "MOON MISSION CANCELLED.",
  "CARTEL LOST SIGNAL.",
] as const;

const emergencySaveMessages = [
  "BONUS GREEN CANDLE",
  "TOO HARD?",
  "BOBO SAVED YOU",
  "FREE PLATFORM",
  "LUCKY SAVE",
  "SKILL ISSUE PROTECTION",
  "EMERGENCY PUMP",
  "DON'T FALL YET",
  "BOBO MERCY",
  "RUG GOT YOU?",
  "NICE TRY",
  "WE GOT U",
  "PANIC PLATFORM",
  "CRASH INSURANCE",
] as const;

const platformKinds = ["green-candle", "red-candle", "rug", "honey-jar", "cash-stack", "solana"] as const;
const stageLabels = [
  "BACKALLEY",
  "ROOFTOPS",
  "SKY ASCENT",
  "CLOUDS",
  "STORM MARKET",
  "MOON",
  "JUNGLE BAY ABYSS",
  "ASCENSION",
  "BILLIONAIRE CLUB",
  "BOBO HEAVEN",
] as const;
const headOptions = [
  { key: "bobro-head", label: "BOBRO", unlockAt: 0, src: headAssetPaths["bobro-head"] },
  { key: "bobohazard", label: "HAZARD", unlockAt: 50_000_000, src: headAssetPaths.bobohazard },
  { key: "high-bobo", label: "HIGH BOBO", unlockAt: 100_000_000, src: headAssetPaths["high-bobo"] },
  { key: "luchador", label: "LUCHADOR", unlockAt: 500_000_000, src: headAssetPaths.luchador },
  { key: "skelebobo", label: "SKELEBOBO", unlockAt: 4_000_000_000, src: headAssetPaths.skelebobo },
  { key: "diamondbobo", label: "DIAMOND", unlockAt: 8_000_000_000, src: headAssetPaths.diamondbobo },
  { key: "og-rekt", label: "OG REKT", unlockAt: 69_000_000_000, src: headAssetPaths["og-rekt"] },
  { key: "theoneape", label: "The JB Ape", unlockAt: 420_000_000_000, src: headAssetPaths["theoneape"] },
] as const;
function getWalletStorageId(wallet = "") {
  return wallet ? wallet.replace(/[^a-zA-Z0-9]/g, "").slice(0, 44) : "unknown-wallet";
}

function getHolderStorageKey(wallet: string, suffix: string) {
  return `bobro-to-the-moon:${getWalletStorageId(wallet)}:${suffix}`;
}

function getHeadStorageKey(wallet: string) {
  return getHolderStorageKey(wallet, "selected-head");
}

function getBestUnlockScoreKey(wallet: string) {
  return getHolderStorageKey(wallet, "best-all-time");
}
const transitionRatio = 0.24;
const backgroundParallax: Record<keyof typeof backgroundAssetPaths, number> = {
  backalley: 0.014,
  rooftops: 0.013,
  "sky-ascent": 0.012,
  clouds: 0.011,
  "storm-market": 0.01,
  moon: 0.009,
  "crypto-orbit": 0.01,
  ascension: 0.007,
  "billionaire-club": 0.006,
  "bobo-heaven": 0.005,
};

type PlatformKind = (typeof platformKinds)[number];
type PlatformState = "solid" | "breaking";
type PlatformMovementKind = "static" | "patrol" | "sine" | "vertical" | "diagonal" | "orbit" | "switch";
type WorldStatus = "ready" | "countdown" | "playing" | "paused" | "dead";
type GameMode = "guest" | "holder";
type StageLabel = (typeof stageLabels)[number];
type BackgroundKey = keyof typeof backgroundAssetPaths;
type HeadKey = keyof typeof headAssetPaths;
type ImageMap<T extends string> = Partial<Record<T, HTMLImageElement>>;

type LoadedAssets = {
  heads: ImageMap<HeadKey>;
  fallbackHead: HTMLImageElement | null;
  backgrounds: ImageMap<BackgroundKey>;
  platforms: ImageMap<PlatformKind>;
  honeyLife: HTMLImageElement | null;
  jetpack: HTMLImageElement | null;
  mumu: HTMLImageElement | null;
  evilMumu: HTMLImageElement | null;
};

type FloatingText = {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
};

type GameParticle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  createdAt: number;
  lifetime: number;
};

type Platform = {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  width: number;
  height: number;
  kind: PlatformKind;
  state: PlatformState;
  phase: number;
  vx: number;
  movementKind: PlatformMovementKind;
  moveAmpX: number;
  moveAmpY: number;
  moveSpeed: number;
  moveStartedAt: number;
  breakStartedAt?: number;
  hasMoneyPrinter: boolean;
  redHits: number;
  cracked: boolean;
  isPath: boolean;
  panicRed: boolean;
  reactUntil: number;
  reactPower: number;
};

type Collectible = {
  id: number;
  kind: "jetpack" | "red-pill";
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  collected: boolean;
};

type HoneyLifePickup = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  collected: boolean;
  milestone: number;
};

type MumuObstacle = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  side: "left" | "right";
  state: "warning" | "active";
  mode: "pass" | "patrol" | "ricochet";
  variant: "normal" | "red";
  warningStartedAt: number;
  activeStartedAt?: number;
  patrolDuration: number;
  exiting: boolean;
  warningLabel: string;
  warningDuration: number;
  hit: boolean;
  phase: number;
};

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
};

type World = {
  status: WorldStatus;
  width: number;
  height: number;
  cameraY: number;
  maxAltitude: number;
  lastScoredAltitude: number;
  biomeProgress: number;
  score: number;
  scoreFloat: number;
  time: number;
  platforms: Platform[];
  collectibles: Collectible[];
  honeyLife: HoneyLifePickup | null;
  mumu: MumuObstacle | null;
  mumu2: MumuObstacle | null;
  nextPlatformY: number;
  nextPlatformId: number;
  nextCollectibleId: number;
  nextHoneyLifeId: number;
  nextMumuId: number;
  jetpackSpawnStreak: number;
  lastPlatformCenter: number;
  player: Player;
  deathMessage: string;
  bonusLabel: string;
  noticeUntil: number;
  scoreMultiplierUntil: number;
  scoreSubmitted: boolean;
  backgroundSeed: number;
  shakePower: number;
  flashPower: number;
  countdownStartedAt: number;
  jetpackBoostUntil: number;
  jetpackBoostStartedAt: number;
  pausedFrom?: "countdown" | "playing";
  lastTransitionMessage: string;
  feedbackTexts: FloatingText[];
  nextFeedbackId: number;
  particles: GameParticle[];
  nextParticleId: number;
  lives: number;
  honeyLivesCollected: number;
  livesUsed: number;
  nextHoneyLifeScore: number;
  honeyLifeCooldownUntil: number;
  mumuCooldownUntil: number;
  savedUntil: number;
  hitStunUntil: number;
  pathBandIndex: number;
  lastOptionalBandIndex: number;
  emergencyPlatformCooldownUntil: number;
  introOptionalQueue: PlatformKind[];
  introChaosBands: number;
  platformLandings: number;
  nextOnFireLandingTarget: number;
  onFireUntil: number;
  marketCrashUntil: number;
  redPillCooldownUntil: number;
  intoxicatedUntil: number;
  playerSquashUntil: number;
  playerSquashPower: number;
  cameraKick: number;
  hitStopRemaining: number;
  milestonePulseUntil: number;
  nextMilestoneIndex: number;
};

type InputState = {
  left: boolean;
  right: boolean;
};

type HudState = {
  status: WorldStatus;
  score: number;
  bonusLabel: string;
  deathMessage: string;
  bestToday: number;
  lives: number;
  multiplier: number;
  stage: StageLabel;
  countdownText: string;
  statusLabels: string[];
  milestoneActive: boolean;
};

const initialHudState: HudState = {
  status: "ready",
  score: 0,
  bonusLabel: "",
  deathMessage: "",
  bestToday: 0,
  lives: 1,
  multiplier: 1,
  stage: "BACKALLEY",
  countdownText: "",
  statusLabels: [],
  milestoneActive: false,
};

function areHudStatesEqual(left: HudState, right: HudState) {
  return (
    left.status === right.status &&
    left.score === right.score &&
    left.bonusLabel === right.bonusLabel &&
    left.deathMessage === right.deathMessage &&
    left.bestToday === right.bestToday &&
    left.lives === right.lives &&
    left.multiplier === right.multiplier &&
    left.stage === right.stage &&
    left.countdownText === right.countdownText &&
    left.milestoneActive === right.milestoneActive &&
    left.statusLabels.length === right.statusLabels.length &&
    left.statusLabels.every((label, index) => label === right.statusLabels[index])
  );
}

type RunResult = {
  score: number;
  stage: StageLabel;
  skinKey: HeadKey;
  skinLabel: string;
  mode: GameMode;
  deathMessage: string;
  previousBestToday: number;
  bestToday: number;
  honeyLivesCollected: number;
  livesUsed: number;
  unlockedSkinLabel?: string;
  saved: boolean;
  runId?: string;
  weekId?: string;
  leaderboardEligible: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type RunSessionResponse = {
  runId: string;
  startedAt: string;
  expiresAt: string;
  weekId: string;
};

type ActiveRunSession = RunSessionResponse & {
  leaderboardEligible: boolean;
};

const defaultWidth = 390;
const defaultHeight = 640;
const jumpVelocity = 820;
const moneyPrinterVelocity = 1160;
const jetpackVelocity = 1620;
const jetpackBoostDuration = 0.62;
const onFireDuration = 5;
const marketCrashDuration = 10;
const mumuUnlockScore = 300000;
const mumuWarningDuration = 0.58;
const honeyLifeMilestoneInterval = 1_000_000;
const honeyLifeMax = 3;
const honeyLifeMinCooldown = 45;
const honeyLifeMaxCooldown = 60;
const intoxicationDuration = 10;
const futurePlatformTarget = 2;
const futurePathPlatformTarget = 2;
const countdownDuration = 2.8;
const feedbackLifetime = 1.1;
const particleLimit = 70;
const majorMcapMilestones = [1_000_000, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000, 69_000_000_000] as const;

function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function shuffleItems<T>(items: readonly T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const biomeDefinitions: Array<{ key: BackgroundKey; label: StageLabel; min: number; fallback: string }> = [
  { key: "backalley", label: "BACKALLEY", min: 0, fallback: "#213141" },
  { key: "rooftops", label: "ROOFTOPS", min: 350_000, fallback: "#415d7a" },
  { key: "sky-ascent", label: "SKY ASCENT", min: 1_000_000, fallback: "#72b8e6" },
  { key: "clouds", label: "CLOUDS", min: 5_000_000, fallback: "#9ed4ef" },
  { key: "storm-market", label: "STORM MARKET", min: 25_000_000, fallback: "#576270" },
  { key: "moon", label: "MOON", min: 100_000_000, fallback: "#29303e" },
  { key: "crypto-orbit", label: "JUNGLE BAY ABYSS", min: 500_000_000, fallback: "#151b35" },
  { key: "ascension", label: "ASCENSION", min: 2_000_000_000, fallback: "#d6c076" },
  { key: "billionaire-club", label: "BILLIONAIRE CLUB", min: 10_000_000_000, fallback: "#6f4f2f" },
  { key: "bobo-heaven", label: "BOBO HEAVEN", min: 69_000_000_000, fallback: "#eac85e" },
];

function formatMcap(score: number) {
  const value = Math.max(0, Math.floor(score));
  const units = [
    { suffix: "B", amount: 1_000_000_000 },
    { suffix: "M", amount: 1_000_000 },
    { suffix: "K", amount: 1_000 },
  ];

  for (const unit of units) {
    if (value < unit.amount) continue;

    const scaled = value / unit.amount;
    const decimals = scaled < 10 ? 1 : 0;

    return `$${scaled.toFixed(decimals).replace(/\.0$/, "")}${unit.suffix}`;
  }

  return `$${value.toLocaleString()}`;
}

function formatMarketCap(score: number) {
  return formatMcap(score);
}

function normalizePlayerName(value: string) {
  return value.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 16);
}

function hasUrlLikeText(value: string) {
  return /https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|gg|xyz|lol|app)\b/i.test(value);
}

function getValidPlayerName(value: string) {
  if (hasUrlLikeText(value)) return null;

  const trimmed = normalizePlayerName(value).trim().replace(/\s+/g, " ");
  return trimmed || defaultPlayerName;
}

function getDisplayMcap(world: World) {
  return Math.max(0, Math.floor(world.scoreFloat));
}

function getDisplayScore(world: World) {
  return getDisplayMcap(world);
}

function getBiomeProgress(world: World) {
  return Math.max(0, Math.floor(world.biomeProgress));
}

function getBiomeRangeForMcap(mcap: number) {
  const index = getBiomeIndex(mcap);
  const current = biomeDefinitions[index] ?? biomeDefinitions[0];
  const next = biomeDefinitions[index + 1];

  return {
    index,
    min: current.min,
    max: next?.min ?? Number.POSITIVE_INFINITY,
  };
}

function syncDisplayScore(world: World) {
  world.scoreFloat = Math.max(world.scoreFloat, world.biomeProgress);
  world.score = getDisplayMcap(world);
}

function formatMarkerScore(score: number) {
  return formatMcap(score);
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function isHeadKey(value: string | null): value is HeadKey {
  return typeof value === "string" && value in headAssetPaths;
}

function getHeadOption(head: HeadKey) {
  return headOptions.find((option) => option.key === head) ?? headOptions[0];
}

function isHeadUnlocked(head: HeadKey, bestScore: number) {
  return bestScore >= getHeadOption(head).unlockAt;
}

function shortenWallet(wallet: string) {
  if (wallet.includes("...")) return wallet;
  if (wallet.length <= 12) return wallet;

  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function normalizeWalletInput(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function isLikelySolanaWalletAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function localDateKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function getBestScoreKey(mode: GameMode, wallet = "") {
  if (mode === "guest") return `bobro-to-the-moon-guest-best-${localDateKey()}`;

  const walletKey = wallet ? wallet.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) : "holder";
  return `bobro-to-the-moon-holder-best-${walletKey}-${localDateKey()}`;
}

function getCountdownText(world: World) {
  const elapsed = world.time - world.countdownStartedAt;

  if (elapsed < 0.7) return "3";
  if (elapsed < 1.4) return "2";
  if (elapsed < 2.1) return "1";
  if (elapsed < countdownDuration) return "PUMP";
  return "";
}

function pushFloatingText(world: World, text: string, x: number, y: number, color = "#f4e4b2") {
  world.feedbackTexts.push({
    id: world.nextFeedbackId,
    text,
    x,
    y,
    color,
    createdAt: world.time,
  });
  world.nextFeedbackId += 1;
}

function getDifficulty(altitude: number) {
  return clamp(altitude / 22000, 0, 1);
}

function isMobileWorldWidth(width: number) {
  return width <= 430;
}

function isMobileWorld(world: Pick<World, "width">) {
  return isMobileWorldWidth(world.width);
}

function getStage(score: number): StageLabel {
  return biomeDefinitions[getBiomeIndex(score)]?.label ?? "BACKALLEY";
}

function getMusicModeForStage(stage: StageLabel): GameMusicMode {
  return stageLabels.indexOf(stage) >= stageLabels.indexOf("STORM MARKET") ? "high" : "normal";
}

function getBackgroundMix(score: number): { current: BackgroundKey; next?: BackgroundKey; alpha: number; message?: string } {
  const index = getBiomeIndex(score);
  const current = biomeDefinitions[index] ?? biomeDefinitions[0];
  const next = biomeDefinitions[index + 1];

  if (!next) return { current: current.key, alpha: 0 };

  const range = next.min - current.min;
  const transitionStart = Math.max(current.min, next.min - range * transitionRatio);

  if (score < transitionStart) return { current: current.key, alpha: 0 };

  return {
    current: current.key,
    next: next.key,
    alpha: clamp((score - transitionStart) / Math.max(1, next.min - transitionStart), 0, 1),
    message: `ENTERING ${next.label}`,
  };
}

function getBiomeIndex(score: number) {
  let index = 0;

  for (let candidate = 0; candidate < biomeDefinitions.length; candidate += 1) {
    if (score >= biomeDefinitions[candidate].min) {
      index = candidate;
    }
  }

  return index;
}

function getBiomeLocalProgress(score: number, background: BackgroundKey) {
  const index = biomeDefinitions.findIndex((biome) => biome.key === background);
  const current = biomeDefinitions[index] ?? biomeDefinitions[0];
  const next = biomeDefinitions[index + 1];

  if (!next) return 0.5;

  return clamp((score - current.min) / Math.max(1, next.min - current.min), 0, 1);
}

function getBiomeProgressGainRate(progress: number) {
  if (progress < 250_000) return 24;
  if (progress < 1_000_000) return 72;
  if (progress < 5_000_000) return 330;
  if (progress < 25_000_000) return 1_550;
  if (progress < 100_000_000) return 5_600;
  if (progress < 500_000_000) return 22_000;
  if (progress < 2_000_000_000) return 80_000;
  if (progress < 10_000_000_000) return 300_000;
  if (progress < 69_000_000_000) return 1_500_000;
  return 2_500_000;
}

function getMarkerScoresForMcap(mcap: number) {
  const index = getBiomeIndex(mcap);

  if (index === 0) return [250_000, 500_000];
  if (index === 1) return [250_000, 500_000, 1_000_000];
  if (index === 2) return [1_000_000, 5_000_000];
  if (index === 3) return [5_000_000, 25_000_000];
  if (index === 4) return [25_000_000, 100_000_000];
  if (index === 5) return [100_000_000, 500_000_000];
  if (index === 6) return [500_000_000, 1_000_000_000, 2_000_000_000];
  if (index === 7) return [2_000_000_000, 10_000_000_000];
  if (index === 8) return [10_000_000_000, 69_000_000_000];
  return [69_000_000_000, 100_000_000_000, 250_000_000_000];
}

function platformLabel(kind: PlatformKind) {
  const labels: Record<PlatformKind, string> = {
    "green-candle": "GREEN",
    "red-candle": "RED",
    rug: "RUG",
    "honey-jar": "HNY",
    "cash-stack": "PRINT",
    solana: "SOL",
  };

  return labels[kind];
}

function isPathPlatform(platform: Platform) {
  return platform.state === "solid" && (platform.kind === "green-candle" || platform.kind === "solana");
}

function isRoutePlatform(platform: Platform) {
  return platform.state === "solid" && platform.isPath;
}

function isOnFire(world: World) {
  return world.onFireUntil > world.time;
}

function isMarketCrashActive(world: World) {
  return world.marketCrashUntil > world.time;
}

function getScoreMultiplier(world: World) {
  if (isOnFire(world)) return 3;
  if (world.scoreMultiplierUntil > world.time) return 2;
  return 1;
}

function getScoreGainDamping(displayScore: number) {
  if (displayScore >= 69_000_000_000) return 0.42;
  if (displayScore >= 10_000_000_000) return 0.52;
  if (displayScore >= 2_000_000_000) return 0.66;
  if (displayScore >= 100_000_000) return 0.82;
  return 1;
}

function pathPlatformKind(altitude: number, forceEasy: boolean): PlatformKind {
  if (forceEasy) return "green-candle";

  const difficulty = getDifficulty(altitude);

  const solanaChance = altitude < 10000 ? 0.04 : 0.026 + difficulty * 0.018;

  return Math.random() < solanaChance ? "solana" : "green-candle";
}

function weightedPlatformKind(difficulty: number, forceSafe: boolean, altitude = 0): PlatformKind {
  if (forceSafe) {
    return pathPlatformKind(altitude, false);
  }

  const roll = Math.random();
  const honeyChance = altitude < 10000 ? 0.28 : altitude < 25000 ? 0.2 : 0.14;
  const cashChance = honeyChance + (altitude < 10000 ? 0.16 : altitude < 25000 ? 0.13 : 0.09);
  const redChance = cashChance + (altitude < 10000 ? 0.36 : altitude < 25000 ? 0.42 : 0.48 + difficulty * 0.08);

  if (roll < honeyChance) return "honey-jar";
  if (roll < cashChance) return "cash-stack";
  if (roll < redChance) return "red-candle";
  return "rug";
}

function createIntroOptionalQueue() {
  return shuffleItems<PlatformKind>(["honey-jar", "honey-jar", "cash-stack", "red-candle", "red-candle", "rug"]);
}

function optionalPlatformChance(altitude: number) {
  if (altitude < 10000) return 0.92;
  if (altitude < 25000) return 0.66;
  if (altitude < 50000) return 0.58;
  return 0.48;
}

function nextRedPillCooldown() {
  return randomBetween(25, 40);
}

function routePlatformKind(world: World, forceEasy: boolean): PlatformKind {
  if (!forceEasy && isMarketCrashActive(world)) {
    if (getBiomeProgress(world) >= 100_000_000) {
      return world.pathBandIndex % 4 === 1 || Math.random() < 0.14 ? "solana" : "green-candle";
    }

    return world.pathBandIndex % 3 === 1 || Math.random() < 0.18 ? "solana" : "red-candle";
  }

  return pathPlatformKind(world.nextPlatformY, forceEasy);
}

function platformGapRange(altitude: number, mobile = false) {
  const mobileBump = mobile ? 12 : 0;

  if (altitude < 10000) return { min: 110 + mobileBump, max: 150 + mobileBump };
  if (altitude < 25000) return { min: 130 + mobileBump, max: 175 + mobileBump };
  if (altitude < 50000) return { min: 150 + mobileBump, max: 200 + mobileBump };
  return { min: 170 + mobileBump, max: 225 + mobileBump };
}

function nextPlatformGap(world: World, altitude: number, forceSafe = false) {
  const mobile = isMobileWorld(world);

  if (forceSafe) {
    return mobile ? randomBetween(116, 142) : randomBetween(106, 132);
  }

  const range = platformGapRange(altitude, mobile);

  return randomBetween(range.min, range.max);
}

function normalPathReachLimits(world: World, y: number) {
  const isMoonOrLater = getBiomeProgress(world) >= 100_000_000;
  const difficulty = getDifficulty(y);

  return {
    minVertical: isMoonOrLater ? 138 : 108,
    maxVertical: isMoonOrLater ? 178 : 190,
    maxHorizontal: clamp(world.width * (isMoonOrLater ? 0.38 : 0.42), isMoonOrLater ? 128 : 140, isMoonOrLater ? 154 : 176 - difficulty * 8),
  };
}

function getBiomeTier(world: World) {
  return getBiomeIndex(getBiomeProgress(world));
}

function chooseRouteCenter(world: World, previousPath: Platform | undefined, platformWidth: number, forceEasy: boolean) {
  const previousCenter = previousPath ? previousPath.x + previousPath.width / 2 : world.lastPlatformCenter;
  const limits = normalPathReachLimits(world, world.nextPlatformY);

  if (forceEasy) {
    return clamp(previousCenter + randomBetween(-42, 42), platformWidth / 2 + 16, world.width - platformWidth / 2 - 16);
  }

  const tier = getBiomeTier(world);
  const lanePatterns = [
    [0.42, 0.58, 0.34, 0.66],
    [0.3, 0.7, 0.44, 0.56],
    [0.24, 0.76, 0.38, 0.62],
    [0.2, 0.78, 0.32, 0.68],
    [0.18, 0.82, 0.28, 0.72],
    [0.16, 0.84, 0.34, 0.66, 0.22, 0.78],
    [0.14, 0.86, 0.31, 0.69, 0.2, 0.8],
  ];
  const pattern = lanePatterns[Math.min(lanePatterns.length - 1, Math.max(0, tier - 1))] ?? lanePatterns[0];
  const lane = pattern[world.pathBandIndex % pattern.length];
  const jitter = randomBetween(-world.width * (tier >= 5 ? 0.035 : 0.055), world.width * (tier >= 5 ? 0.035 : 0.055));
  let desiredCenter = world.width * lane + jitter;

  if (tier >= 3 && Math.abs(desiredCenter - previousCenter) < limits.maxHorizontal * 0.58) {
    const direction = world.pathBandIndex % 2 === 0 ? 1 : -1;
    desiredCenter = previousCenter + direction * randomBetween(limits.maxHorizontal * 0.62, limits.maxHorizontal * 0.92);
  }

  if (tier >= 5 && desiredCenter > world.width * 0.43 && desiredCenter < world.width * 0.57) {
    desiredCenter += world.pathBandIndex % 2 === 0 ? world.width * 0.22 : -world.width * 0.22;
  }

  return clampPathCenter(world, previousCenter, desiredCenter, limits.maxHorizontal, platformWidth);
}

function movementChanceForPlatform(world: World, platform: Platform, isRoutePath: boolean, forceEasy: boolean) {
  if (forceEasy || platform.y < 700) return 0;

  const tier = getBiomeTier(world);
  const baseRouteChance = [0.02, 0.12, 0.18, 0.3, 0.42, 0.5, 0.58, 0.66, 0.74, 0.82][tier] ?? 0.82;
  const baseOptionalChance = [0.04, 0.18, 0.28, 0.42, 0.56, 0.64, 0.72, 0.82, 0.88, 0.92][tier] ?? 0.92;
  let chance = isRoutePath ? baseRouteChance : baseOptionalChance;

  if (platform.kind === "solana") chance *= 0.58;
  if (platform.kind === "rug" || platform.kind === "red-candle") chance += tier >= 3 ? 0.1 : 0.04;
  if (isMarketCrashActive(world)) chance += 0.08;

  return clamp(chance, 0, 0.94);
}

function pickPlatformMovementKind(tier: number, platform: Platform, isRoutePath: boolean): PlatformMovementKind {
  if (tier <= 0) return "static";
  if (tier <= 2) return "patrol";
  if (tier === 3) return platform.kind === "rug" ? "sine" : "patrol";
  if (tier === 4) return platform.kind === "red-candle" ? "switch" : Math.random() < 0.55 ? "patrol" : "sine";
  if (tier === 5) return Math.random() < (isRoutePath ? 0.72 : 0.44) ? "patrol" : Math.random() < 0.5 ? "vertical" : "diagonal";
  if (tier === 6) return Math.random() < 0.58 ? "orbit" : Math.random() < 0.5 ? "sine" : "diagonal";
  if (tier === 7) return Math.random() < 0.46 ? "switch" : Math.random() < 0.5 ? "diagonal" : "orbit";
  if (tier === 8) return Math.random() < 0.38 ? "switch" : Math.random() < 0.5 ? "orbit" : "diagonal";
  return Math.random() < 0.32 ? "switch" : Math.random() < 0.5 ? "orbit" : "diagonal";
}

function configurePlatformMovement(world: World, platform: Platform, isRoutePath: boolean, forceEasy: boolean) {
  platform.baseX = platform.x;
  platform.baseY = platform.y;
  platform.moveStartedAt = world.time;

  if (Math.random() > movementChanceForPlatform(world, platform, isRoutePath, forceEasy)) {
    platform.movementKind = "static";
    platform.moveAmpX = 0;
    platform.moveAmpY = 0;
    platform.moveSpeed = 0;
    platform.vx = 0;
    return platform;
  }

  const tier = getBiomeTier(world);
  const movementKind = pickPlatformMovementKind(tier, platform, isRoutePath);
  const routeCapX = Math.max(28, Math.min(72, normalPathReachLimits(world, platform.y).maxHorizontal * 0.42));
  const optionalCapX = Math.min(118, world.width * 0.28);
  const maxAmpX = isRoutePath ? routeCapX : optionalCapX;
  const speedBase = 0.9 + tier * 0.18 + (isRoutePath ? 0 : 0.22);

  platform.movementKind = movementKind;
  platform.moveAmpX = randomBetween(maxAmpX * 0.45, maxAmpX);
  platform.moveAmpY = isRoutePath ? randomBetween(6, 18 + tier * 2) : randomBetween(10, 26 + tier * 4);
  platform.moveSpeed = randomBetween(speedBase, speedBase + 0.72);
  platform.vx = 0;

  if (movementKind === "patrol" || movementKind === "sine") {
    platform.moveAmpY = 0;
  }

  if (movementKind === "vertical") {
    platform.moveAmpX = 0;
    platform.moveAmpY = isRoutePath ? randomBetween(12, 24) : randomBetween(18, 42);
  }

  if (movementKind === "switch") {
    platform.moveAmpY = isRoutePath ? 0 : randomBetween(6, 18);
    platform.moveSpeed += tier >= 7 ? 0.55 : 0.28;
  }

  return platform;
}

function wrappedCenterDelta(width: number, from: number, to: number) {
  let delta = to - from;

  if (delta > width / 2) {
    delta -= width;
  } else if (delta < -width / 2) {
    delta += width;
  }

  return delta;
}

function clampPathCenter(world: World, previousCenter: number, desiredCenter: number, maxHorizontal: number, platformWidth: number) {
  const delta = clamp(wrappedCenterDelta(world.width, previousCenter, desiredCenter), -maxHorizontal, maxHorizontal);
  const wrappedCenter = (previousCenter + delta + world.width) % world.width;

  return clamp(wrappedCenter, platformWidth / 2 + 16, world.width - platformWidth / 2 - 16);
}

function isReachableWithNormalJump(world: World, previousPlatform: Platform, nextPlatform: Platform) {
  const previousCenter = previousPlatform.x + previousPlatform.width / 2;
  const nextCenter = nextPlatform.x + nextPlatform.width / 2;
  const verticalGap = nextPlatform.y - previousPlatform.y;
  const limits = normalPathReachLimits(world, nextPlatform.y);

  if (verticalGap < limits.minVertical || verticalGap > limits.maxVertical) return false;

  return wrappedHorizontalDistance(world, previousCenter, nextCenter) <= limits.maxHorizontal;
}

function createPlatform(
  y: number,
  worldWidth: number,
  id: number,
  previousCenter: number,
  forceSafe = false,
  kindOverride?: PlatformKind,
  centerOverride?: number,
  forceEasyPath = false,
  isPath = forceSafe,
  panicRed = false,
): Platform {
  const difficulty = getDifficulty(y);
  const mobile = isMobileWorldWidth(worldWidth);
  const kind = kindOverride ?? (forceSafe ? pathPlatformKind(y, forceEasyPath) : weightedPlatformKind(difficulty, forceSafe, y));
  const safeWidthBase = y >= 50000 ? randomBetween(88, 104) : y >= 25000 ? randomBetween(96, 112) : randomBetween(112, 132);
  const safeWidth = mobile ? Math.max(70, safeWidthBase - 22) : safeWidthBase;
  const baseWidthRaw = forceSafe ? safeWidth : clamp(116 - difficulty * 24 + Math.random() * 16, 82, 126);
  const baseWidth = mobile ? Math.max(66, baseWidthRaw - 18) : baseWidthRaw;
  const width =
    kind === "cash-stack"
      ? baseWidth + (mobile ? 8 : 12)
      : kind === "solana"
        ? Math.max(mobile ? 96 : 112, baseWidth + (mobile ? 12 : 18))
        : baseWidth;
  const maxHorizontalStep = forceSafe ? Math.min(worldWidth * 0.44, 72 + difficulty * 92) : Math.min(worldWidth * 0.46, 86 + difficulty * 56);
  const minHorizontalStep = forceSafe ? 24 + difficulty * 30 : 0;
  const rawStep = (Math.random() * 2 - 1) * maxHorizontalStep;
  const step =
    forceSafe && Math.abs(rawStep) < minHorizontalStep
      ? (rawStep >= 0 ? 1 : -1) * minHorizontalStep
      : rawStep;
  const center = clamp(centerOverride ?? previousCenter + step, width / 2 + 16, worldWidth - width / 2 - 16);
  const x = center - width / 2;

  return {
    id,
    x,
    y,
    baseX: x,
    baseY: y,
    width,
    height: kind === "honey-jar" || kind === "cash-stack" ? 22 : kind === "solana" ? 20 : 18,
    kind,
    state: "solid",
    phase: Math.random() * Math.PI * 2,
    vx: 0,
    movementKind: "static",
    moveAmpX: 0,
    moveAmpY: 0,
    moveSpeed: 0,
    moveStartedAt: 0,
    breakStartedAt: undefined,
    hasMoneyPrinter: kind === "cash-stack",
    redHits: 0,
    cracked: false,
    isPath,
    panicRed,
    reactUntil: 0,
    reactPower: 0,
  };
}

function validateGeneratedPathPlatform(world: World, previousPath: Platform | undefined, platform: Platform) {
  if (!previousPath) return platform;
  if (isReachableWithNormalJump(world, previousPath, platform)) return platform;

  const previousCenter = previousPath.x + previousPath.width / 2;
  const limits = normalPathReachLimits(world, platform.y);
  const verticalGap = clamp(platform.y - previousPath.y, limits.minVertical, limits.maxVertical);
  const candidateYValues = [
    previousPath.y + verticalGap,
    previousPath.y + limits.maxVertical - 8,
    previousPath.y + (limits.minVertical + limits.maxVertical) / 2,
  ];
  const desiredCenter = platform.x + platform.width / 2;
  const candidateCenters = [
    clampPathCenter(world, previousCenter, desiredCenter, limits.maxHorizontal, platform.width),
    clampPathCenter(world, previousCenter, previousCenter + limits.maxHorizontal * 0.72, limits.maxHorizontal, platform.width),
    clampPathCenter(world, previousCenter, previousCenter - limits.maxHorizontal * 0.72, limits.maxHorizontal, platform.width),
    clamp(previousCenter, platform.width / 2 + 16, world.width - platform.width / 2 - 16),
  ];

  for (const y of candidateYValues) {
    for (const center of candidateCenters) {
      const candidate = {
        ...platform,
        x: center - platform.width / 2,
        y,
        baseX: center - platform.width / 2,
        baseY: y,
        vx: 0,
      };

      if (platformOverlapsExisting(world, candidate)) continue;
      if (!isReachableWithNormalJump(world, previousPath, candidate)) continue;

      return candidate;
    }
  }

  const fallbackKind: PlatformKind = isMarketCrashActive(world) && getBiomeProgress(world) < 100_000_000 ? "solana" : "green-candle";
  const fallbackY = previousPath.y + Math.min(limits.maxVertical - 10, Math.max(limits.minVertical, 152));
  const fallbackCenter = clampPathCenter(world, previousCenter, previousCenter, limits.maxHorizontal * 0.7, platform.width);

  return createPlatform(fallbackY, world.width, platform.id, previousCenter, true, fallbackKind, fallbackCenter, false, true, false);
}

function futurePlatformCount(world: World) {
  const topOfCamera = world.cameraY + world.height;

  return world.platforms.filter((platform) => platform.y > topOfCamera).length;
}

function futurePathPlatformCount(world: World) {
  const topOfCamera = world.cameraY + world.height;

  return world.platforms.filter((platform) => isRoutePlatform(platform) && platform.y > topOfCamera).length;
}

function platformOverlapsExisting(world: World, platform: Platform) {
  return world.platforms.some((existing) => {
    if (Math.abs(existing.y - platform.y) > 30) return false;

    return platform.x < existing.x + existing.width + 14 && platform.x + platform.width + 14 > existing.x;
  });
}

function maybeAddJetpack(world: World, previousPlatform: Platform | undefined, nextPlatform: Platform, forceSafe: boolean) {
  if (!previousPlatform || forceSafe || nextPlatform.y < 720) return;

  const chance = isMarketCrashActive(world) ? 0.014 : 0.034;
  const shouldSpawn = world.jetpackSpawnStreak < 3 && Math.random() < chance;

  if (!shouldSpawn) {
    world.jetpackSpawnStreak = 0;
    return;
  }

  const previousCenter = previousPlatform.x + previousPlatform.width / 2;
  const nextCenter = nextPlatform.x + nextPlatform.width / 2;
  const x = clamp(previousCenter * 0.45 + nextCenter * 0.55 + (Math.random() * 2 - 1) * 18, 34, world.width - 34);
  const y = previousPlatform.y + (nextPlatform.y - previousPlatform.y) * (0.48 + Math.random() * 0.14);

  world.collectibles.push({
    id: world.nextCollectibleId,
    kind: "jetpack",
    x,
    y,
    width: 34,
    height: 42,
    phase: Math.random() * Math.PI * 2,
    collected: false,
  });
  world.nextCollectibleId += 1;
  world.jetpackSpawnStreak += 1;
}

function maybeAddSupplementalPlatforms(world: World, previousPath: Platform | undefined, nextPath: Platform, forceEasy: boolean) {
  if (forceEasy || !previousPath) return;

  const bandIndex = world.pathBandIndex;
  const mobile = isMobileWorld(world);
  const minOptionalBandGap = mobile ? 3 : 2;
  if (bandIndex - world.lastOptionalBandIndex < minOptionalBandGap) return;

  const difficulty = getDifficulty(nextPath.y);
  const tier = getBiomeTier(world);
  const introActive = bandIndex < world.introChaosBands && world.introOptionalQueue.length > 0;
  const lateChaosChance = tier >= 5 ? 0.12 + tier * 0.018 : 0;
  const chance = isMarketCrashActive(world)
    ? optionalPlatformChance(nextPath.y) * (mobile ? 0.34 : 0.48)
    : clamp((optionalPlatformChance(nextPath.y) + lateChaosChance) * (mobile ? 0.72 : 1), 0, mobile ? 0.58 : 0.72);
  if (!introActive && Math.random() > chance) return;

  const bandStart = previousPath.y + 36;
  const bandEnd = nextPath.y - 38;
  if (bandEnd <= bandStart) return;

  const introKind = introActive ? world.introOptionalQueue[0] : undefined;
  let kind = introKind ?? weightedPlatformKind(difficulty, false, nextPath.y);
  if (!introActive && tier >= 4 && Math.random() < 0.2 + tier * 0.025) {
    kind = Math.random() < (tier >= 6 ? 0.62 : 0.5) ? "red-candle" : "rug";
  }
  if (isMarketCrashActive(world) && (kind === "honey-jar" || kind === "cash-stack") && Math.random() < 0.68) {
    kind = Math.random() < 0.64 ? "red-candle" : "rug";
  }
  const progress = randomBetween(0.44, 0.68);
  const y = previousPath.y + (nextPath.y - previousPath.y) * progress;
  const previousCenter = previousPath.x + previousPath.width / 2;
  const nextCenter = nextPath.x + nextPath.width / 2;
  const pathCenter = previousCenter + (nextCenter - previousCenter) * progress;
  const spread = tier >= 5 ? world.width * 0.34 : world.width * 0.26;
  const center = clamp(pathCenter + randomBetween(-spread, spread), 46, world.width - 46);
  const platform = configurePlatformMovement(
    world,
    createPlatform(y, world.width, world.nextPlatformId, center, false, kind, center, false, false, isMarketCrashActive(world) && kind === "red-candle"),
    false,
    false,
  );
  const isBonus = kind === "honey-jar" || kind === "cash-stack";
  const hasNearbyBonus = world.platforms.some((existing) => {
    if (existing.kind !== "honey-jar" && existing.kind !== "cash-stack" && existing.kind !== "solana") return false;

    return Math.abs(existing.y - platform.y) < world.height * 0.55;
  });

  if (platformOverlapsExisting(world, platform)) return;
  if (!introActive && isBonus && hasNearbyBonus && Math.random() < 0.82) return;

  world.platforms.push(platform);
  world.nextPlatformId += 1;
  world.lastOptionalBandIndex = bandIndex;

  if (introKind) {
    world.introOptionalQueue.shift();
  }
}

function nextMumuCooldown(score: number) {
  if (score < 50000) return randomBetween(10.5, 15.5);
  if (score < 100000) return randomBetween(5.6, 8.2);
  if (score < 1_000_000_000) return randomBetween(3.9, 6.2);
  return randomBetween(2.8, 4.8);
}

function scheduleNextMumu(world: World) {
  world.mumuCooldownUntil = world.time + nextMumuCooldown(getDisplayScore(world));
}

function mumuSpawnPressure(score: number) {
  if (score < 50000) return 0.08;
  if (score < 100000) return 0.2;
  if (score < 1_000_000_000) return 0.34;
  return 0.5;
}

function activeMumuCount(world: World) {
  return Number(Boolean(world.mumu)) + Number(Boolean(world.mumu2));
}

function maxMumuCount(score: number) {
  return score >= 1_000_000_000 ? 2 : 1;
}

function redMumuChance(world: World) {
  const tier = getBiomeTier(world);

  if (tier < 6) return 0;
  if (tier === 6) return 0.14;
  if (tier === 7) return 0.24;
  if (tier === 8) return 0.34;
  return 0.46;
}

function placeMumu(world: World, mumu: MumuObstacle) {
  if (!world.mumu) {
    world.mumu = mumu;
  } else if (!world.mumu2) {
    world.mumu2 = mumu;
  }
}

function createMumuObstacle(
  world: World,
  options: { side?: "left" | "right"; verticalBias?: number; forceMode?: MumuObstacle["mode"]; variant?: MumuObstacle["variant"] } = {},
): MumuObstacle {
  const displayScore = getDisplayScore(world);
  const side = options.side ?? (Math.random() < 0.5 ? "left" : "right");
  const variant = options.variant ?? (Math.random() < redMumuChance(world) ? "red" : "normal");
  const width = variant === "red" ? 84 : 78;
  const height = variant === "red" ? 60 : 56;
  const playerScreenY = screenY(world, world.player.y);
  const patrolChance =
    displayScore < 100000
      ? 0
      : displayScore < 1_000_000_000
        ? 0.34 + clamp((displayScore - 100000) / 999_900_000, 0, 1) * 0.2
        : 0.56;
  const mode: MumuObstacle["mode"] =
    options.forceMode ?? (variant === "red" ? "ricochet" : Math.random() < patrolChance ? "patrol" : "pass");
  const targetOffset =
    displayScore < 50000
      ? randomBetween(-92, 76)
      : displayScore < 100000
        ? randomBetween(-56, 52)
        : randomBetween(-44, 44);
  const targetScreenY = clamp(playerScreenY + targetOffset, 118, world.height - 120);
  const baseSpeed = displayScore < 50000 ? 640 : displayScore < 100000 ? 820 : displayScore < 1_000_000_000 ? 980 : 1120;
  const speed =
    (baseSpeed + clamp((displayScore - mumuUnlockScore) / 1_000_000_000, 0, 1) * (mode === "patrol" ? 280 : 230)) *
    (variant === "red" ? 1.1 : 1);
  const startY = world.cameraY + world.height - targetScreenY + (options.verticalBias ?? 0);
  const targetingStrength = displayScore < 50000 ? 0.18 : displayScore < 100000 ? 0.44 : 0.58;
  const verticalTargeting = clamp((world.player.y - startY) * targetingStrength, -190, 190);

  return {
    id: world.nextMumuId,
    x: side === "left" ? -width - 34 : world.width + 34,
    y: startY,
    width,
    height,
    vx: side === "left" ? speed : -speed,
    vy: verticalTargeting + (mode === "patrol" ? randomBetween(-22, 22) : 0),
    side,
    state: "warning",
    mode,
    variant,
    warningStartedAt: world.time,
    activeStartedAt: undefined,
    patrolDuration:
      mode === "ricochet"
        ? randomBetween(3.4, displayScore >= 1_000_000_000 ? 5.1 : 4.4)
        : mode === "patrol"
          ? randomBetween(2.6, displayScore >= 1_000_000_000 ? 4.8 : 4)
          : 0,
    exiting: false,
    warningLabel: variant === "red" ? "RED MUMU" : mode === "patrol" ? "MUMU PATROL" : "MUMU INCOMING",
    warningDuration: randomBetween(Math.max(0.34, mumuWarningDuration - 0.2), Math.min(0.72, mumuWarningDuration + 0.1)),
    hit: false,
    phase: Math.random() * Math.PI * 2,
  };
}

function spawnMumu(
  world: World,
  options: { side?: "left" | "right"; verticalBias?: number; forceMode?: MumuObstacle["mode"]; variant?: MumuObstacle["variant"] } = {},
) {
  placeMumu(world, createMumuObstacle(world, options));
  world.nextMumuId += 1;
}

function maybeSpawnMumu(world: World, deltaSeconds: number) {
  const displayScore = getDisplayScore(world);

  if (activeMumuCount(world) >= maxMumuCount(displayScore)) return;
  if (displayScore < mumuUnlockScore) return;
  if (world.time < world.mumuCooldownUntil) return;
  if (world.time < world.savedUntil) return;
  if (world.jetpackBoostUntil > world.time) return;
  if (Math.random() > deltaSeconds * mumuSpawnPressure(displayScore)) return;

  if (displayScore >= 1_000_000_000 && activeMumuCount(world) === 0 && Math.random() < 0.46) {
    const side = Math.random() < 0.5 ? "left" : "right";
    const oppositeSide = side === "left" ? "right" : "left";
    const redVariant = Math.random() < redMumuChance(world) ? "red" : "normal";

    spawnMumu(world, {
      side,
      verticalBias: -92,
      forceMode: redVariant === "red" ? "ricochet" : Math.random() < 0.48 ? "patrol" : "pass",
      variant: redVariant,
    });
    spawnMumu(world, {
      side: oppositeSide,
      verticalBias: 104,
      forceMode: Math.random() < 0.62 ? "patrol" : "pass",
      variant: "normal",
    });
    return;
  }

  spawnMumu(world);
}

function spawnHoneyLife(world: World) {
  const stablePlatforms = world.platforms
    .filter((platform) => isPathPlatform(platform) && platform.y > world.player.y + 80)
    .sort((left, right) => left.y - right.y);
  const anchor = stablePlatforms[0] ?? world.platforms[world.platforms.length - 1];
  const anchorX = anchor ? anchor.x + anchor.width / 2 : world.width / 2;
  const anchorY = anchor ? anchor.y : world.cameraY + world.height * 0.7;

  world.honeyLife = {
    id: world.nextHoneyLifeId,
    x: clamp(anchorX + randomBetween(-42, 42), 36, world.width - 36),
    y: anchorY + randomBetween(58, 92),
    width: 30,
    height: 28,
    phase: Math.random() * Math.PI * 2,
    collected: false,
    milestone: world.nextHoneyLifeScore,
  };
  world.nextHoneyLifeId += 1;
  world.nextHoneyLifeScore += honeyLifeMilestoneInterval;
  world.honeyLifeCooldownUntil = world.time + randomBetween(honeyLifeMinCooldown, honeyLifeMaxCooldown);
}

function maybeSpawnHoneyLife(world: World) {
  if (world.honeyLife && !world.honeyLife.collected) return;
  if (world.time < world.honeyLifeCooldownUntil) return;
  if (getDisplayScore(world) < world.nextHoneyLifeScore) return;
  if (isMarketCrashActive(world) && Math.random() < 0.5) return;

  spawnHoneyLife(world);
}

function spawnRedPill(world: World) {
  const routePlatforms = world.platforms
    .filter((platform) => isRoutePlatform(platform) && platform.y > world.player.y + 70)
    .sort((left, right) => left.y - right.y);
  const anchor = routePlatforms[0] ?? world.platforms[world.platforms.length - 1];
  const anchorX = anchor ? anchor.x + anchor.width / 2 : world.width / 2;
  const anchorY = anchor ? anchor.y : world.cameraY + world.height * 0.7;

  world.collectibles.push({
    id: world.nextCollectibleId,
    kind: "red-pill",
    x: clamp(anchorX + randomBetween(-54, 54), 34, world.width - 34),
    y: anchorY + randomBetween(56, 94),
    width: 32,
    height: 20,
    phase: Math.random() * Math.PI * 2,
    collected: false,
  });
  world.nextCollectibleId += 1;
  world.redPillCooldownUntil = world.time + nextRedPillCooldown();
}

function maybeSpawnRedPill(world: World, deltaSeconds: number) {
  if (getDisplayScore(world) < 10000) return;
  if (isMarketCrashActive(world)) return;
  if (world.time < world.redPillCooldownUntil) return;
  if (world.collectibles.some((collectible) => collectible.kind === "red-pill" && !collectible.collected)) return;
  if (Math.random() > deltaSeconds * 0.12) return;

  spawnRedPill(world);
}

function addNextPlatform(world: World, forceEasy = false) {
  const previousPath = world.platforms.filter(isRoutePlatform).sort((left, right) => right.y - left.y)[0];
  const kind = routePlatformKind(world, forceEasy);
  const seedPlatform = createPlatform(
    world.nextPlatformY,
    world.width,
    world.nextPlatformId,
    world.lastPlatformCenter,
    true,
    kind,
    undefined,
    forceEasy,
    true,
    isMarketCrashActive(world) && kind === "red-candle",
  );
  const routeCenter = chooseRouteCenter(world, previousPath, seedPlatform.width, forceEasy);
  const generatedPlatform = createPlatform(
    world.nextPlatformY,
    world.width,
    world.nextPlatformId,
    world.lastPlatformCenter,
    true,
    kind,
    routeCenter,
    forceEasy,
    true,
    isMarketCrashActive(world) && kind === "red-candle",
  );
  const platform = configurePlatformMovement(world, validateGeneratedPathPlatform(world, previousPath, generatedPlatform), true, forceEasy);

  world.platforms.push(platform);
  maybeAddJetpack(world, previousPath, platform, forceEasy);
  world.lastPlatformCenter = platform.x + platform.width / 2;
  world.nextPlatformId += 1;
  maybeAddSupplementalPlatforms(world, previousPath, platform, forceEasy);
  world.pathBandIndex += 1;
  world.nextPlatformY = platform.y + nextPlatformGap(world, platform.y, forceEasy);
}

function ensurePlatformBuffer(world: World) {
  let guard = 0;

  while (
    (futurePlatformCount(world) < futurePlatformTarget ||
      futurePathPlatformCount(world) < futurePathPlatformTarget ||
      world.nextPlatformY < world.cameraY + world.height + 260) &&
    guard < 10
  ) {
    addNextPlatform(world, world.pathBandIndex < 2);
    guard += 1;
  }
}

function createWorld(width = defaultWidth, height = defaultHeight, status: WorldStatus = "ready"): World {
  const firstPlatformCenter = width / 2;
  const mobile = isMobileWorldWidth(width);
  const firstPlatformWidth = mobile ? 112 : 136;
  const platforms: Platform[] = [
    {
      id: 0,
      x: firstPlatformCenter - firstPlatformWidth / 2,
      y: 74,
      baseX: firstPlatformCenter - firstPlatformWidth / 2,
      baseY: 74,
      width: firstPlatformWidth,
      height: 20,
      kind: "cash-stack",
      state: "solid",
      phase: 0,
      vx: 0,
      movementKind: "static",
      moveAmpX: 0,
      moveAmpY: 0,
      moveSpeed: 0,
      moveStartedAt: 0,
      breakStartedAt: undefined,
      hasMoneyPrinter: false,
      redHits: 0,
      cracked: false,
      isPath: true,
      panicRed: false,
      reactUntil: 0,
      reactPower: 0,
    },
  ];

  const world: World = {
    status,
    width,
    height,
    cameraY: 0,
    maxAltitude: 0,
    lastScoredAltitude: 0,
    biomeProgress: 0,
    score: 0,
    scoreFloat: 0,
    time: 0,
    platforms,
    collectibles: [],
    honeyLife: null,
    mumu: null,
    mumu2: null,
    nextPlatformY: mobile ? 202 : 190,
    nextPlatformId: 1,
    nextCollectibleId: 1,
    nextHoneyLifeId: 1,
    nextMumuId: 1,
    jetpackSpawnStreak: 0,
    lastPlatformCenter: firstPlatformCenter,
    player: {
      x: width / 2,
      y: 136,
      width: 46,
      height: 48,
      vx: 0,
      vy: status === "playing" ? 850 : 0,
    },
    deathMessage: "",
    bonusLabel: "",
    noticeUntil: 0,
    scoreMultiplierUntil: 0,
    scoreSubmitted: false,
    backgroundSeed: Math.random() * 1000,
    shakePower: 0,
    flashPower: 0,
    countdownStartedAt: 0,
    jetpackBoostUntil: 0,
    jetpackBoostStartedAt: 0,
    pausedFrom: undefined,
    lastTransitionMessage: "",
    feedbackTexts: [],
    nextFeedbackId: 0,
    particles: [],
    nextParticleId: 0,
    lives: 1,
    honeyLivesCollected: 0,
    livesUsed: 0,
    nextHoneyLifeScore: honeyLifeMilestoneInterval,
    honeyLifeCooldownUntil: randomBetween(honeyLifeMinCooldown, honeyLifeMaxCooldown),
    mumuCooldownUntil: nextMumuCooldown(0),
    savedUntil: 0,
    hitStunUntil: 0,
    pathBandIndex: 0,
    lastOptionalBandIndex: -2,
    emergencyPlatformCooldownUntil: 0,
    introOptionalQueue: createIntroOptionalQueue(),
    introChaosBands: mobile ? 12 : 16,
    platformLandings: 0,
    nextOnFireLandingTarget: 50,
    onFireUntil: 0,
    marketCrashUntil: 0,
    redPillCooldownUntil: randomBetween(12, 22),
    intoxicatedUntil: 0,
    playerSquashUntil: 0,
    playerSquashPower: 0,
    cameraKick: 0,
    hitStopRemaining: 0,
    milestonePulseUntil: 0,
    nextMilestoneIndex: 0,
  };

  while (world.nextPlatformY < height + 220 || futurePathPlatformCount(world) < futurePathPlatformTarget) {
    addNextPlatform(world, world.pathBandIndex < 2);
  }

  return world;
}

function resizeWorld(world: World, width: number, height: number) {
  const widthRatio = width / Math.max(1, world.width);

  world.width = width;
  world.height = height;
  world.player.x = clamp(world.player.x * widthRatio, world.player.width / 2, width - world.player.width / 2);
  world.lastPlatformCenter = clamp(world.lastPlatformCenter * widthRatio, 16, width - 16);

  for (const platform of world.platforms) {
    platform.x = clamp(platform.x * widthRatio, 8, width - platform.width - 8);
    platform.baseX = clamp(platform.baseX * widthRatio, 8, width - platform.width - 8);
  }

  for (const collectible of world.collectibles) {
    collectible.x = clamp(collectible.x * widthRatio, 20, width - 20);
  }

  if (world.honeyLife) {
    world.honeyLife.x = clamp(world.honeyLife.x * widthRatio, 24, width - 24);
  }

  if (world.mumu) {
    world.mumu.x *= widthRatio;
  }
  if (world.mumu2) {
    world.mumu2.x *= widthRatio;
  }

  ensurePlatformBuffer(world);
}

function screenY(world: World, worldY: number) {
  return world.height - (worldY - world.cameraY);
}

function triggerNotice(world: World, label: string, duration = 1.45) {
  world.bonusLabel = label;
  world.noticeUntil = world.time + duration;
}

function triggerHitStop(world: World, durationSeconds: number) {
  world.hitStopRemaining = Math.max(world.hitStopRemaining, clamp(durationSeconds, 0, 0.08));
}

function addPaperParticles(world: World, x: number, y: number, color: string, count: number, lift = 1) {
  for (let index = 0; index < count; index += 1) {
    world.particles.push({
      id: world.nextParticleId,
      x: x + randomBetween(-10, 10),
      y: y + randomBetween(-4, 8),
      vx: randomBetween(-58, 58),
      vy: randomBetween(34, 92) * lift,
      size: randomBetween(1.6, 3.4),
      color,
      createdAt: world.time,
      lifetime: randomBetween(0.34, 0.62),
    });
    world.nextParticleId += 1;
  }

  if (world.particles.length > particleLimit) {
    world.particles.splice(0, world.particles.length - particleLimit);
  }
}

function reactToLanding(world: World, platform: Platform, color: string, power: number, particleCount: number) {
  if (platform.reactUntil <= world.time) {
    platform.reactPower = 0;
  }
  if (world.playerSquashUntil <= world.time) {
    world.playerSquashPower = 0;
  }

  platform.reactUntil = world.time + 0.16;
  platform.reactPower = Math.max(platform.reactPower, power);
  world.playerSquashUntil = world.time + 0.14;
  world.playerSquashPower = Math.max(world.playerSquashPower, power);
  world.cameraKick = Math.max(world.cameraKick, 2.4 + power * 18);
  addPaperParticles(world, platform.x + platform.width / 2, platform.y + 8, color, particleCount, 0.78 + power * 2);
}

function updateParticles(world: World, deltaSeconds: number) {
  world.particles = world.particles.filter((particle) => {
    const age = world.time - particle.createdAt;
    if (age > particle.lifetime) return false;

    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vy -= 220 * deltaSeconds;
    particle.vx *= Math.max(0, 1 - deltaSeconds * 2.8);
    return true;
  });
}

function endRun(world: World, recordRun: (world: World) => void, playAudioCue?: (cue: GameAudioCue) => void) {
  if (world.status === "dead") return;

  world.status = "dead";
  world.deathMessage = pickRandom(deathMessages);
  world.bonusLabel = "";
  world.onFireUntil = 0;
  world.marketCrashUntil = 0;
  world.shakePower = Math.max(world.shakePower, 28);
  world.flashPower = Math.max(world.flashPower, 0.75);
  world.cameraKick = Math.max(world.cameraKick, 10);
  triggerHitStop(world, 0.08);
  addPaperParticles(world, world.player.x, world.player.y, "#b94b3e", 14, 1.3);
  pushFloatingText(world, "LIQUIDATED", world.player.x, world.player.y + 42, "#b94b3e");
  playAudioCue?.("loseGame");

  if (!world.scoreSubmitted) {
    world.scoreSubmitted = true;
    syncDisplayScore(world);
    recordRun(world);
  }
}

function finishCountdownWorld(world: World) {
  if (world.status !== "countdown") return;

  world.status = "playing";
  world.player.vy = 850;
  world.flashPower = Math.max(world.flashPower, 0.34);
  triggerNotice(world, "PUMP", 0.9);
  pushFloatingText(world, "PUMP", world.player.x, world.player.y + 48, "#e4b745");
}

function updatePlatforms(world: World, deltaSeconds: number) {
  for (const platform of world.platforms) {
    if (platform.state !== "solid") continue;

    if (platform.movementKind !== "static") {
      const age = Math.max(0, world.time - platform.moveStartedAt);
      const phase = age * platform.moveSpeed + platform.phase;
      const leftBound = 10;
      const rightBound = world.width - platform.width - 10;
      const minY = platform.baseY - Math.max(4, platform.moveAmpY + 8);
      const maxY = platform.baseY + Math.max(4, platform.moveAmpY + 8);

      if (platform.movementKind === "patrol" || platform.movementKind === "sine") {
        platform.x = clamp(platform.baseX + Math.sin(phase) * platform.moveAmpX, leftBound, rightBound);
        platform.y = platform.baseY;
      } else if (platform.movementKind === "vertical") {
        platform.x = platform.baseX;
        platform.y = clamp(platform.baseY + Math.sin(phase) * platform.moveAmpY, minY, maxY);
      } else if (platform.movementKind === "diagonal") {
        platform.x = clamp(platform.baseX + Math.sin(phase) * platform.moveAmpX, leftBound, rightBound);
        platform.y = clamp(platform.baseY + Math.cos(phase * 0.88) * platform.moveAmpY, minY, maxY);
      } else if (platform.movementKind === "orbit") {
        platform.x = clamp(platform.baseX + Math.sin(phase) * platform.moveAmpX, leftBound, rightBound);
        platform.y = clamp(platform.baseY + Math.cos(phase) * platform.moveAmpY, minY, maxY);
      } else if (platform.movementKind === "switch") {
        const cycle = (age * platform.moveSpeed) % 2;
        const triangle = cycle < 1 ? cycle : 2 - cycle;
        const snap = triangle * triangle * (3 - 2 * triangle);
        platform.x = clamp(platform.baseX + (snap * 2 - 1) * platform.moveAmpX, leftBound, rightBound);
        platform.y = clamp(platform.baseY + Math.sin(phase * 0.5) * platform.moveAmpY, minY, maxY);
      }
    } else if (platform.vx !== 0) {
      platform.x += platform.vx * deltaSeconds;

      if (platform.x < 10 || platform.x + platform.width > world.width - 10) {
        platform.x = clamp(platform.x, 10, world.width - platform.width - 10);
        platform.vx *= -1;
      }
    }
  }

  world.platforms = world.platforms.filter((platform) => {
    if (platform.y <= world.cameraY - 180) return false;
    if (platform.y > world.cameraY + world.height + 980) return false;
    if (platform.state === "breaking" && platform.breakStartedAt !== undefined && world.time - platform.breakStartedAt > 0.62) return false;
    return true;
  });
}

function convertAbovePlayerPlatformsToPanicRed(world: World) {
  const minimumConvertedY = world.player.y + world.player.height / 2 + 10;

  for (const platform of world.platforms) {
    if (platform.state !== "solid") continue;
    if (platform.y <= minimumConvertedY) continue;
    if (platform.kind === "solana") continue;

    platform.kind = "red-candle";
    platform.height = 18;
    platform.hasMoneyPrinter = false;
    platform.redHits = 0;
    platform.cracked = false;
    platform.panicRed = true;
    platform.vx = 0;
  }
}

function updateCollectibles(world: World, playAudioCue?: (cue: GameAudioCue) => void) {
  const { player } = world;

  for (const collectible of world.collectibles) {
    if (collectible.collected) continue;

    const overlapsX =
      player.x + player.width * 0.42 >= collectible.x - collectible.width / 2 &&
      player.x - player.width * 0.42 <= collectible.x + collectible.width / 2;
    const overlapsY =
      player.y + player.height * 0.38 >= collectible.y - collectible.height / 2 &&
      player.y - player.height * 0.38 <= collectible.y + collectible.height / 2;

    if (!overlapsX || !overlapsY) continue;

    collectible.collected = true;

    if (collectible.kind === "jetpack") {
      player.vy = Math.max(player.vy, jetpackVelocity);
      world.jetpackBoostStartedAt = world.time;
      world.jetpackBoostUntil = world.time + jetpackBoostDuration;
      world.shakePower = Math.max(world.shakePower, 16);
      world.flashPower = Math.max(world.flashPower, 0.5);
      world.cameraKick = Math.max(world.cameraKick, 8);
      world.playerSquashUntil = world.time + 0.16;
      world.playerSquashPower = Math.max(world.playerSquashPower, 0.14);
      triggerHitStop(world, 0.055);
      addPaperParticles(world, collectible.x, collectible.y, "#e4b745", 16, 1.7);
      triggerNotice(world, "JETPACK BOOST", 1.6);
      pushFloatingText(world, "JETPACK BOOST", collectible.x, collectible.y + 22, "#e4b745");
      playAudioCue?.("jetpack");
    } else {
      world.marketCrashUntil = world.time + marketCrashDuration;
      world.redPillCooldownUntil = world.time + nextRedPillCooldown();
      convertAbovePlayerPlatformsToPanicRed(world);
      world.shakePower = Math.max(world.shakePower, 12);
      world.flashPower = Math.max(world.flashPower, 0.28);
      world.cameraKick = Math.max(world.cameraKick, 7);
      triggerHitStop(world, 0.05);
      addPaperParticles(world, collectible.x, collectible.y, "#d94b45", 12, 1.2);
      triggerNotice(world, "OH SHIT, BOBO MARKET", 2.2);
      pushFloatingText(world, "MARKET PANIC", collectible.x, collectible.y + 24, "#d94b45");
      playAudioCue?.("redPill");
    }
  }

  world.collectibles = world.collectibles.filter((collectible) => {
    if (collectible.collected) return false;
    if (collectible.y <= world.cameraY - 180) return false;
    if (collectible.y > world.cameraY + world.height + 980) return false;
    return true;
  });
}

function triggerIntoxication(world: World, x: number, y: number) {
  const messages = ["INTOXICATED", "TOO MUCH HONEY", "BOBO OVERDOSE"] as const;
  const message = pickRandom(messages);

  world.intoxicatedUntil = world.time + intoxicationDuration;
  world.shakePower = Math.max(world.shakePower, 5);
  triggerNotice(world, message, 1.7);
  pushFloatingText(world, message, x, y + 26, "#d49632");
}

function isIntoxicated(world: World) {
  return world.intoxicatedUntil > world.time;
}

function updateHoneyLife(world: World, playAudioCue?: (cue: GameAudioCue) => void) {
  if (!world.honeyLife) return;

  const { honeyLife, player } = world;

  if (!honeyLife.collected) {
    const overlapsX =
      player.x + player.width * 0.4 >= honeyLife.x - honeyLife.width / 2 &&
      player.x - player.width * 0.4 <= honeyLife.x + honeyLife.width / 2;
    const overlapsY =
      player.y + player.height * 0.38 >= honeyLife.y - honeyLife.height / 2 &&
      player.y - player.height * 0.38 <= honeyLife.y + honeyLife.height / 2;

    if (overlapsX && overlapsY) {
      honeyLife.collected = true;
      world.shakePower = Math.max(world.shakePower, 4);

      if (world.lives >= honeyLifeMax) {
        triggerIntoxication(world, honeyLife.x, honeyLife.y);
      } else {
        world.lives = Math.min(honeyLifeMax, world.lives + 1);
        world.honeyLivesCollected += 1;
        triggerNotice(world, "EXTRA HONEY", 1.45);
        pushFloatingText(world, "+1 LIFE", honeyLife.x, honeyLife.y + 26, "#d49632");
      }
      playAudioCue?.("honey");
    }
  }

  if (honeyLife.collected || honeyLife.y <= world.cameraY - 180 || honeyLife.y > world.cameraY + world.height + 980) {
    world.honeyLife = null;
  }
}

function updateMumuObstacle(world: World, mumu: MumuObstacle, deltaSeconds: number, playAudioCue?: (cue: GameAudioCue) => void) {
  if (mumu.state === "warning") {
    if (world.time - mumu.warningStartedAt >= mumu.warningDuration) {
      mumu.state = "active";
      mumu.activeStartedAt = world.time;
      playAudioCue?.("mumu");
    }
    return true;
  }


  const activeAge = world.time - (mumu.activeStartedAt ?? world.time);

  if (mumu.mode === "ricochet" && !mumu.exiting) {
    mumu.x += mumu.vx * deltaSeconds;
    mumu.y += (mumu.vy + Math.sin(world.time * 6.4 + mumu.phase) * 42) * deltaSeconds;

    const bounceMargin = 46;
    if (mumu.x < bounceMargin) {
      mumu.x = bounceMargin;
      mumu.vx = Math.abs(mumu.vx) * randomBetween(0.96, 1.06);
    } else if (mumu.x > world.width - bounceMargin) {
      mumu.x = world.width - bounceMargin;
      mumu.vx = -Math.abs(mumu.vx) * randomBetween(0.96, 1.06);
    }

    const minY = world.cameraY + 72;
    const maxY = world.cameraY + world.height - 72;
    if (mumu.y < minY) {
      mumu.y = minY;
      mumu.vy = Math.abs(mumu.vy) + randomBetween(70, 130);
    } else if (mumu.y > maxY) {
      mumu.y = maxY;
      mumu.vy = -Math.abs(mumu.vy) - randomBetween(70, 130);
    }

    if (activeAge > mumu.patrolDuration) {
      mumu.exiting = true;
      mumu.vx = mumu.side === "left" ? Math.abs(mumu.vx) : -Math.abs(mumu.vx);
    }
  } else if (mumu.mode === "patrol" && !mumu.exiting) {
    mumu.x += mumu.vx * deltaSeconds;
    mumu.y += (mumu.vy + Math.sin(world.time * 4.2 + mumu.phase) * 18) * deltaSeconds;

    const patrolMargin = 44;
    if (mumu.x < patrolMargin) {
      mumu.x = patrolMargin;
      mumu.vx = Math.abs(mumu.vx);
    } else if (mumu.x > world.width - patrolMargin) {
      mumu.x = world.width - patrolMargin;
      mumu.vx = -Math.abs(mumu.vx);
    }

    const minY = world.cameraY + 86;
    const maxY = world.cameraY + world.height - 88;
    mumu.y = clamp(mumu.y, minY, maxY);

    if (activeAge > mumu.patrolDuration) {
      mumu.exiting = true;
      mumu.vx = mumu.vx >= 0 ? Math.abs(mumu.vx) : -Math.abs(mumu.vx);
    }
  } else {
    mumu.x += mumu.vx * deltaSeconds;
    mumu.y += mumu.vy * deltaSeconds;
  }

  const hasExitedLeft = mumu.vx < 0 && mumu.x + mumu.width / 2 < -80;
  const hasExitedRight = mumu.vx > 0 && mumu.x - mumu.width / 2 > world.width + 80;

  if (hasExitedLeft || hasExitedRight) {
    return false;
  }

  if (mumu.hit) return true;

  const { player } = world;
  const overlapsX =
    player.x + player.width * 0.34 >= mumu.x - mumu.width * 0.32 &&
    player.x - player.width * 0.34 <= mumu.x + mumu.width * 0.32;
  const overlapsY =
    player.y + player.height * 0.32 >= mumu.y - mumu.height * 0.28 &&
    player.y - player.height * 0.32 <= mumu.y + mumu.height * 0.28;

  if (!overlapsX || !overlapsY) return true;

  mumu.hit = true;
  mumu.exiting = true;
  const knockDirection = mumu.vx > 0 ? 1 : -1;

  world.jetpackBoostUntil = world.time;
  world.jetpackBoostStartedAt = 0;
  world.scoreMultiplierUntil = Math.min(world.scoreMultiplierUntil, world.time);
  world.onFireUntil = Math.min(world.onFireUntil, world.time + 0.6);
  world.hitStunUntil = world.time + (mumu.variant === "red" ? 0.78 : 0.66);
  player.vx = clamp(player.vx + knockDirection * (mumu.variant === "red" ? 920 : 760), -1040, 1040);
  player.vy = Math.min(player.vy, mumu.variant === "red" ? -1350 : -1210);
  player.y -= mumu.variant === "red" ? 48 : 38;
  world.shakePower = Math.max(world.shakePower, mumu.variant === "red" ? 48 : 40);
  world.flashPower = Math.max(world.flashPower, mumu.variant === "red" ? 0.48 : 0.38);
  world.cameraKick = Math.max(world.cameraKick, mumu.variant === "red" ? 18 : 15);
  world.playerSquashUntil = world.time + 0.18;
  world.playerSquashPower = Math.max(world.playerSquashPower, mumu.variant === "red" ? 0.22 : 0.18);
  triggerHitStop(world, 0.08);
  addPaperParticles(world, player.x, player.y, mumu.variant === "red" ? "#d2292f" : "#d94b45", mumu.variant === "red" ? 22 : 18, 1.45);
  triggerNotice(world, "MUMU SMASH", 1.35);
  pushFloatingText(world, "MUMU SMASH", player.x, player.y + 38, "#d94b45");
  playAudioCue?.("mumu");
  return true;
}

function updateMumu(world: World, deltaSeconds: number, playAudioCue?: (cue: GameAudioCue) => void) {
  maybeSpawnMumu(world, deltaSeconds);

  const hadMumu = activeMumuCount(world) > 0;

  if (world.mumu && !updateMumuObstacle(world, world.mumu, deltaSeconds, playAudioCue)) {
    world.mumu = null;
  }

  if (world.mumu2 && !updateMumuObstacle(world, world.mumu2, deltaSeconds, playAudioCue)) {
    world.mumu2 = null;
  }

  if (hadMumu && activeMumuCount(world) === 0) {
    scheduleNextMumu(world);
  }
}

function wrappedHorizontalDistance(world: World, left: number, right: number) {
  const direct = Math.abs(left - right);

  return Math.min(direct, world.width - direct);
}

function hasReachablePathPlatformAbove(world: World) {
  const { player } = world;
  const minVerticalGap = 44;
  const maxVerticalGap = 164;
  const maxHorizontalGap = clamp(world.width * 0.48, 145, 190);

  return world.platforms.some((platform) => {
    if (!isPathPlatform(platform)) return false;

    const verticalGap = platform.y - player.y;
    if (verticalGap < minVerticalGap || verticalGap > maxVerticalGap) return false;

    const platformCenter = platform.x + platform.width / 2;

    return wrappedHorizontalDistance(world, platformCenter, player.x) <= maxHorizontalGap;
  });
}

function isPlayerNearPathPlatform(world: World) {
  const { player } = world;

  return world.platforms.some((platform) => {
    if (!isPathPlatform(platform)) return false;

    const verticalDistance = Math.abs(platform.y - player.y);
    if (verticalDistance > 56) return false;

    const platformCenter = platform.x + platform.width / 2;

    return wrappedHorizontalDistance(world, platformCenter, player.x) <= platform.width / 2 + player.width * 0.75;
  });
}

function createReachablePathPlatform(world: World) {
  const direction = world.player.vx >= 0 ? 1 : -1;
  const baseGap = randomBetween(118, 142);
  const safeKind: PlatformKind = isMarketCrashActive(world) ? "solana" : "green-candle";
  const centerCandidates = [
    world.player.x + direction * randomBetween(42, 82),
    world.player.x - direction * randomBetween(38, 76),
    world.player.x,
    world.width / 2,
  ];
  const yCandidates = [world.player.y + baseGap, world.player.y + baseGap + 14, world.player.y + 108];

  let platform = createPlatform(yCandidates[0], world.width, world.nextPlatformId, world.player.x, true, safeKind, centerCandidates[0]);

  for (const y of yCandidates) {
    for (const center of centerCandidates) {
      const candidate = createPlatform(y, world.width, world.nextPlatformId, world.player.x, true, safeKind, center);
      if (!platformOverlapsExisting(world, candidate)) {
        platform = candidate;
        break;
      }
    }

    if (!platformOverlapsExisting(world, platform)) {
      break;
    }
  }

  if (platformOverlapsExisting(world, platform)) {
    platform = createPlatform(world.player.y + 122, world.width, world.nextPlatformId, world.player.x, true, safeKind, world.width / 2);
  }

  world.platforms.push(platform);
  world.nextPlatformId += 1;

  const highestPath = world.platforms.filter(isPathPlatform).sort((left, right) => right.y - left.y)[0];
  if (!highestPath || platform.y >= highestPath.y - 8) {
    world.lastPlatformCenter = platform.x + platform.width / 2;
  }

  if (platform.y >= world.nextPlatformY - 8) {
    world.nextPlatformY = platform.y + nextPlatformGap(world, platform.y);
  }

  return platform;
}

function ensureReachablePathPlatform(world: World) {
  if (world.status !== "playing") return;
  if (world.time < world.emergencyPlatformCooldownUntil) return;
  if (isPlayerNearPathPlatform(world)) return;
  if (hasReachablePathPlatformAbove(world)) return;

  const platform = createReachablePathPlatform(world);
  const message = pickRandom(emergencySaveMessages);

  world.emergencyPlatformCooldownUntil = world.time + 1.65;
  triggerNotice(world, message, 1.15);
  pushFloatingText(world, message, platform.x + platform.width / 2, platform.y + 24, "#8ba65b");
}

function createEmergencyPlatform(world: World): Platform {
  const width = Math.min(138, Math.max(112, world.width * 0.32));
  const y = world.cameraY + world.height * 0.3;
  const platform: Platform = {
    id: world.nextPlatformId,
    x: clamp(world.width / 2 - width / 2, 12, world.width - width - 12),
    y,
    baseX: clamp(world.width / 2 - width / 2, 12, world.width - width - 12),
    baseY: y,
    width,
    height: 18,
    kind: isMarketCrashActive(world) ? "solana" : "green-candle",
    state: "solid",
    phase: Math.random() * Math.PI * 2,
    vx: 0,
    movementKind: "static",
    moveAmpX: 0,
    moveAmpY: 0,
    moveSpeed: 0,
    moveStartedAt: world.time,
    breakStartedAt: undefined,
    hasMoneyPrinter: false,
    redHits: 0,
    cracked: false,
    isPath: true,
    panicRed: false,
    reactUntil: 0,
    reactPower: 0,
  };

  world.nextPlatformId += 1;
  world.platforms.push(platform);
  return platform;
}

function respawnPlayer(world: World) {
  world.lives = Math.max(1, world.lives - 1);
  world.livesUsed += 1;

  const targetScreenY = world.height * 0.68;
  const candidates = world.platforms
    .filter(isPathPlatform)
    .map((platform) => ({ platform, distance: Math.abs(screenY(world, platform.y) - targetScreenY) }))
    .filter((entry) => screenY(world, entry.platform.y) > world.height * 0.34 && screenY(world, entry.platform.y) < world.height * 0.88)
    .sort((left, right) => left.distance - right.distance);
  const platform = candidates[0]?.platform ?? createEmergencyPlatform(world);

  world.player.x = platform.x + platform.width / 2;
  world.player.y = platform.y + world.player.height / 2 + 8;
  world.player.vx = 0;
  world.player.vy = jumpVelocity * 0.88;
  world.maxAltitude = Math.max(world.maxAltitude, world.player.y);
  world.mumu = null;
  world.mumu2 = null;
  world.hitStunUntil = 0;
  world.emergencyPlatformCooldownUntil = world.time + 0.9;
  scheduleNextMumu(world);
  world.shakePower = Math.max(world.shakePower, 10);
  world.flashPower = Math.max(world.flashPower, 0.26);
  world.savedUntil = world.time + 1.2;
  triggerNotice(world, "SAVED", 1.35);
  pushFloatingText(world, "SAVED", world.player.x, world.player.y + 38, "#8ba65b");
}

function handleFall(world: World, recordRun: (world: World) => void, playAudioCue?: (cue: GameAudioCue) => void) {
  if (world.lives > 1) {
    respawnPlayer(world);
    return;
  }

  endRun(world, recordRun, playAudioCue);
}

function activateOnFire(world: World, playAudioCue?: (cue: GameAudioCue) => void) {
  world.onFireUntil = world.time + onFireDuration;
  world.shakePower = Math.max(world.shakePower, 12);
  world.flashPower = Math.max(world.flashPower, 0.34);
  world.cameraKick = Math.max(world.cameraKick, 8);
  triggerHitStop(world, 0.05);
  addPaperParticles(world, world.player.x, world.player.y, "#e05b2d", 16, 1.5);
  triggerNotice(world, "BOBOCLAAAAAT MODE", 1.5);
  pushFloatingText(world, "BOBOCLAAAAAT MODE", world.player.x, world.player.y + 48, "#e05b2d");
  playAudioCue?.("onFire");
}

function recordPlatformLanding(world: World, playAudioCue?: (cue: GameAudioCue) => void) {
  if (world.status !== "playing") return;

  world.platformLandings += 1;

  if (world.platformLandings < world.nextOnFireLandingTarget) return;

  world.nextOnFireLandingTarget += 50;
  activateOnFire(world, playAudioCue);
}

function awardAltitudeScore(world: World) {
  if (world.maxAltitude <= world.lastScoredAltitude) return;

  const previousScore = getDisplayScore(world);
  const altitudeDelta = world.maxAltitude - world.lastScoredAltitude;
  const multiplier = getScoreMultiplier(world);
  const gainRate = getBiomeProgressGainRate(world.biomeProgress);
  const baseGain = altitudeDelta * gainRate;
  const scoreGain = baseGain * multiplier * getScoreGainDamping(previousScore);

  world.biomeProgress += baseGain;
  world.scoreFloat += scoreGain;
  world.lastScoredAltitude = world.maxAltitude;
  syncDisplayScore(world);

  while (majorMcapMilestones[world.nextMilestoneIndex] !== undefined && getDisplayScore(world) >= majorMcapMilestones[world.nextMilestoneIndex]) {
    const milestone = majorMcapMilestones[world.nextMilestoneIndex];
    world.nextMilestoneIndex += 1;

    if (previousScore < milestone) {
      world.milestonePulseUntil = world.time + 1.15;
      world.shakePower = Math.max(world.shakePower, 5);
      world.flashPower = Math.max(world.flashPower, 0.18);
      world.cameraKick = Math.max(world.cameraKick, 5);
      pushFloatingText(world, `${formatMcap(milestone)} MCAP`, world.player.x, world.player.y + 62, "#e4b745");
      addPaperParticles(world, world.player.x, world.player.y + 28, "#e4b745", 12, 1.2);
    }
  }
}

function updateWorld(
  world: World,
  input: InputState,
  deltaSeconds: number,
  recordRun: (world: World) => void,
  playAudioCue?: (cue: GameAudioCue) => void,
) {
  if (world.status === "ready" || world.status === "paused" || world.status === "dead") return;

  if (world.hitStopRemaining > 0) {
    world.hitStopRemaining = Math.max(0, world.hitStopRemaining - deltaSeconds);
    world.shakePower = Math.max(0, world.shakePower - deltaSeconds * 22);
    world.flashPower = Math.max(0, world.flashPower - deltaSeconds * 3.1);
    world.cameraKick *= Math.max(0, 1 - deltaSeconds * 16);
    return;
  }

  world.time += deltaSeconds;
  world.shakePower = Math.max(0, world.shakePower - deltaSeconds * 18);
  world.flashPower = Math.max(0, world.flashPower - deltaSeconds * 2.6);
  world.cameraKick *= Math.max(0, 1 - deltaSeconds * 10.5);
  if (Math.abs(world.cameraKick) < 0.05) {
    world.cameraKick = 0;
  }
  world.feedbackTexts = world.feedbackTexts.filter((feedback) => world.time - feedback.createdAt < feedbackLifetime);
  updateParticles(world, deltaSeconds);

  if (world.noticeUntil < world.time) {
    world.bonusLabel = "";
  }

  if (world.status === "countdown") {
    if (world.time - world.countdownStartedAt >= countdownDuration) {
      finishCountdownWorld(world);
    }

    return;
  }

  updatePlatforms(world, deltaSeconds);

  const player = world.player;
  const difficulty = getDifficulty(world.maxAltitude);
  const rawInputDirection = Number(input.right) - Number(input.left);
  const inputDirection = isIntoxicated(world) ? -rawInputDirection : rawInputDirection;
  const isHitStunned = world.time < world.hitStunUntil;
  const previousBottom = player.y - player.height / 2;
  const acceleration = isHitStunned ? 420 : 2220 + difficulty * 230;
  const maxSpeed = isHitStunned ? 760 : 294 + difficulty * 38;
  const friction = Math.max(0, 1 - deltaSeconds * (isHitStunned ? 1.7 : 8.8));

  if (inputDirection !== 0) {
    player.vx += inputDirection * acceleration * deltaSeconds;
  } else {
    player.vx *= friction;
  }

  const biomeTier = getBiomeTier(world);
  if (!isHitStunned && biomeTier >= 3) {
    const windPressure = Math.sin(world.time * (0.52 + biomeTier * 0.04) + world.backgroundSeed) * (biomeTier >= 8 ? 72 : biomeTier >= 6 ? 48 : 28);
    player.vx += windPressure * deltaSeconds;
  }

  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  player.x += player.vx * deltaSeconds;

  if (player.x < -player.width / 2) {
    player.x = world.width + player.width / 2;
  } else if (player.x > world.width + player.width / 2) {
    player.x = -player.width / 2;
  }

  const apexFactor = Math.abs(player.vy) < 150 ? 0.82 : 1;
  const gravity = (player.vy > 0 ? 1450 + difficulty * 52 : 1950 + difficulty * 86) * apexFactor;
  player.vy -= gravity * deltaSeconds;

  if (world.jetpackBoostUntil > world.time) {
    const boostRemaining = clamp((world.jetpackBoostUntil - world.time) / jetpackBoostDuration, 0, 1);
    player.vy = Math.min(jetpackVelocity, Math.max(player.vy, 980 + boostRemaining * 360) + 620 * deltaSeconds);
  }

  player.y += player.vy * deltaSeconds;
  updateCollectibles(world, playAudioCue);
  updateHoneyLife(world, playAudioCue);
  maybeSpawnRedPill(world, deltaSeconds);
  updateMumu(world, deltaSeconds, playAudioCue);

  const nextBottom = player.y - player.height / 2;

  if (player.vy <= 0) {
    for (const platform of world.platforms) {
      if (platform.state !== "solid") continue;

      const isCrossingPlatform = previousBottom >= platform.y && nextBottom <= platform.y + platform.height * 0.6;
      const overlapsX = player.x + player.width / 2 >= platform.x && player.x - player.width / 2 <= platform.x + platform.width;

      if (!isCrossingPlatform || !overlapsX) continue;

      let nextJumpVelocity = jumpVelocity + difficulty * 10;

      player.y = platform.y + player.height / 2 + 1;
      recordPlatformLanding(world, playAudioCue);

      if (platform.kind === "green-candle") {
        nextJumpVelocity = jumpVelocity + difficulty * 10;
        reactToLanding(world, platform, "#8ba65b", 0.045, 4);
        playAudioCue?.("greenJump");
      }

      if (platform.kind === "red-candle") {
        const wasPanicRed = platform.panicRed;
        platform.redHits += 1;
        platform.cracked = true;
        nextJumpVelocity = jumpVelocity + difficulty * 10;
        world.shakePower = Math.max(world.shakePower, 5);
        reactToLanding(world, platform, "#b94b3e", wasPanicRed ? 0.09 : 0.075, wasPanicRed ? 7 : 5);
        playAudioCue?.("redJump");

        if (platform.panicRed || platform.redHits >= 2) {
          platform.state = "breaking";
          platform.breakStartedAt = world.time;
          ensureReachablePathPlatform(world);
          world.cameraKick = Math.max(world.cameraKick, 6);
          world.shakePower = Math.max(world.shakePower, 7);
          triggerNotice(world, platform.panicRed ? "MARKET PANIC" : "RED CANDLE BROKE", 1.05);
          pushFloatingText(world, platform.panicRed ? "MARKET PANIC" : "RED CANDLE BROKE", platform.x + platform.width / 2, platform.y + 24, "#b94b3e");
        }
      }

      if (platform.kind === "rug") {
        platform.state = "breaking";
        platform.breakStartedAt = world.time;
        ensureReachablePathPlatform(world);
        nextJumpVelocity = jumpVelocity * 0.62;
        world.shakePower = Math.max(world.shakePower, 4);
        reactToLanding(world, platform, "#d4aa4c", 0.08, 6);
        triggerNotice(world, "RUG!", 1.05);
        pushFloatingText(world, "RUG!", platform.x + platform.width / 2, platform.y + 24, "#e4b745");
        playAudioCue?.("rugJump");
      }

      if (platform.kind === "honey-jar") {
        world.scoreMultiplierUntil = Math.max(world.scoreMultiplierUntil, world.time + 4);
        nextJumpVelocity = jumpVelocity * 1.22;
        world.shakePower = Math.max(world.shakePower, 2);
        world.flashPower = Math.max(world.flashPower, 0.2);
        reactToLanding(world, platform, "#e4b745", 0.055, 5);
        triggerNotice(world, "HONEY x2", 1.35);
        pushFloatingText(world, "HONEY x2", platform.x + platform.width / 2, platform.y + 28, "#e4b745");
        playAudioCue?.("honeyPlatform");
      }

      if (platform.hasMoneyPrinter) {
        platform.hasMoneyPrinter = false;
        nextJumpVelocity = moneyPrinterVelocity;
        world.scoreFloat += 150_000 * getScoreMultiplier(world);
        syncDisplayScore(world);
        world.shakePower = Math.max(world.shakePower, 13);
        world.cameraKick = Math.max(world.cameraKick, 8);
        reactToLanding(world, platform, "#8ba65b", 0.12, 12);
        triggerNotice(world, "CASH BOOST", 1.45);
        pushFloatingText(world, "CASH BOOST", platform.x + platform.width / 2, platform.y + 38, "#8ba65b");
        playAudioCue?.("cashPrinterPlatform");
      }

      if (platform.kind === "solana") {
        const roll = Math.random();

        let pumpLabel = "PUMP!";
        let pumpColor = "#39d98a";
        let pumpMultiplier = 1.12;
        let pumpShake = 4;
        let pumpFlash = 0.08;
        let breaksAfterPump = false;

        if (roll < 0.05) {
          pumpLabel = "GOD CANDLE";
          pumpMultiplier = 5.55;
          pumpShake = 52;
          pumpFlash = 0.5;
        } else if (roll < 0.34) {
          pumpLabel = "PUMP PUMP PUMP";
          pumpMultiplier = 1.32;
          pumpShake = 8;
          pumpFlash = 0.15;
        } else if (roll < 0.52) {
          pumpLabel = "DEV SOLD";
          pumpMultiplier = 0.42;
          pumpColor = "#b94b3e";
          pumpShake = 7;
          pumpFlash = 0.12;
        } else if (roll < 0.60) {
          pumpLabel = "OH SHIT";
          pumpMultiplier = 0.46;
          pumpColor = "#e4b745";
          pumpShake = 9;
          pumpFlash = 0.14;
        } else if (roll < 0.85) {
          pumpLabel = "RUGGED AFTER PUMP";
          pumpMultiplier = 0.05;
          pumpColor = "#d4aa4c";
          pumpShake = 10;
          pumpFlash = 0.16;
          breaksAfterPump = true;
        }

        const pumpVelocity = Math.max(jumpVelocity * 0.86, jumpVelocity * pumpMultiplier + difficulty * 18);
        nextJumpVelocity = Math.max(nextJumpVelocity, pumpVelocity);

        if (breaksAfterPump) {
          platform.state = "breaking";
          platform.breakStartedAt = world.time;
          ensureReachablePathPlatform(world);
        }

        world.shakePower = Math.max(world.shakePower, pumpShake);
        world.flashPower = Math.max(world.flashPower, pumpFlash);
        reactToLanding(world, platform, pumpColor, 0.085, pumpShake);
        triggerNotice(world, pumpLabel, 1.15);
        pushFloatingText(world, pumpLabel, platform.x + platform.width / 2, platform.y + 28, pumpColor);
        playAudioCue?.("solanaPlatform");
      }

      if (isOnFire(world)) {
        nextJumpVelocity = Math.max(nextJumpVelocity + 120, nextJumpVelocity * 1.13);
      }

      player.vy = nextJumpVelocity;
      break;
    }
  }

  world.maxAltitude = Math.max(world.maxAltitude, player.y);
  awardAltitudeScore(world);
  maybeSpawnHoneyLife(world);

  const biomeProgress = getBiomeProgress(world);
  const transitionMessage = getBackgroundMix(biomeProgress).message;
  if (transitionMessage && transitionMessage !== world.lastTransitionMessage) {
    world.lastTransitionMessage = transitionMessage;
    triggerNotice(world, transitionMessage, 1.8);
  }

  const targetScreenY = world.height * 0.42;
  const highJumpPull = clamp(player.vy / jetpackVelocity, 0, 1) * world.height * (isOnFire(world) ? 0.055 : 0.035);
  const desiredCameraY = Math.max(0, world.maxAltitude - (world.height - targetScreenY) + highJumpPull);
  const cameraEase = 1 - Math.exp(-deltaSeconds * (player.vy > 900 || isOnFire(world) ? 6.2 : 4.7));
  world.cameraY += (desiredCameraY - world.cameraY) * cameraEase;

  ensurePlatformBuffer(world);

  if (screenY(world, player.y) > world.height + 95) {
    handleFall(world, recordRun, playAudioCue);
  }
}

function drawOutlinedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke = "#130e0c",
) {
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.lineWidth = 3;
  context.strokeStyle = stroke;
  context.strokeRect(x, y, width, height);
}

function drawPixelText(context: CanvasRenderingContext2D, text: string, x: number, y: number, size = 12, color = "#f4e4b2") {
  context.save();
  context.font = `700 ${size}px Courier New, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#130e0c";
  context.fillText(text, x + 2, y + 2);
  context.fillStyle = color;
  context.fillText(text, x, y);
  context.restore();
}

function drawPaperScratches(context: CanvasRenderingContext2D, world: World) {
  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = "#f4e4b2";
  context.lineWidth = 1;

  for (let index = 0; index < 18; index += 1) {
    const x = (Math.sin(world.backgroundSeed + index * 18.73) * 0.5 + 0.5) * world.width;
    const y = (Math.cos(world.backgroundSeed + index * 23.11) * 0.5 + 0.5) * world.height;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 16 + (index % 4) * 8, y + 5);
    context.stroke();
  }

  context.restore();
}

function drawStreetBackground(context: CanvasRenderingContext2D, world: World) {
  const { width, height } = world;
  const skylineBase = height - 58;

  context.fillStyle = "rgba(11, 11, 12, 0.86)";
  for (let index = 0; index < 10; index += 1) {
    const buildingWidth = width / 8.6;
    const buildingHeight = 72 + ((index * 39) % 112);
    const x = index * buildingWidth - 24;
    context.fillRect(x, skylineBase - buildingHeight, buildingWidth - 8, buildingHeight);
    context.fillStyle = index % 2 === 0 ? "rgba(228, 183, 69, 0.68)" : "rgba(118, 148, 111, 0.56)";
    for (let wy = skylineBase - buildingHeight + 18; wy < skylineBase - 14; wy += 24) {
      context.fillRect(x + 12, wy, 6, 8);
      context.fillRect(x + 28, wy, 6, 8);
    }
    context.fillStyle = "rgba(11, 11, 12, 0.86)";
  }
}

function drawCityBackground(context: CanvasRenderingContext2D, world: World) {
  const { width, height } = world;

  context.save();
  context.globalAlpha = 0.36;
  context.strokeStyle = "rgba(228, 183, 69, 0.36)";
  context.lineWidth = 2;
  for (let x = 20; x < width; x += 58) {
    context.beginPath();
    context.moveTo(x, height);
    context.lineTo(width / 2, height * 0.38);
    context.stroke();
  }
  context.restore();

  context.fillStyle = "rgba(0, 0, 0, 0.46)";
  for (let index = 0; index < 8; index += 1) {
    const towerWidth = 34 + (index % 3) * 16;
    const towerHeight = 110 + ((index * 47) % 145);
    const x = index * (width / 7) - 18;
    context.fillRect(x, height - towerHeight, towerWidth, towerHeight);
    context.fillStyle = "rgba(130, 176, 79, 0.55)";
    context.fillRect(x + towerWidth / 2 - 3, height - towerHeight - 22, 6, 22);
    context.fillStyle = "rgba(0, 0, 0, 0.46)";
  }
}

function drawSkyBackground(context: CanvasRenderingContext2D, world: World) {
  const { width, height } = world;
  const drift = (world.cameraY * 0.14) % width;

  context.save();
  context.fillStyle = "rgba(244, 228, 178, 0.56)";
  for (let index = 0; index < 7; index += 1) {
    const x = (index * 128 - drift + width) % (width + 160) - 80;
    const y = 70 + ((index * 53) % Math.max(120, height * 0.52));
    context.fillRect(x, y, 70, 18);
    context.fillRect(x + 18, y - 13, 42, 18);
    context.fillRect(x + 52, y + 3, 38, 14);
  }
  context.restore();
}

function drawMoonBackground(context: CanvasRenderingContext2D, world: World) {
  const { width, height } = world;

  context.save();
  context.fillStyle = "rgba(244, 228, 178, 0.88)";
  context.beginPath();
  context.arc(width - 70, 86, 46, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(45, 42, 39, 0.22)";
  context.beginPath();
  context.arc(width - 86, 76, 9, 0, Math.PI * 2);
  context.arc(width - 55, 98, 12, 0, Math.PI * 2);
  context.arc(width - 66, 62, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(244, 228, 178, 0.14)";
  for (let x = -40; x < width + 80; x += 74) {
    context.fillRect(x, height - 44 + Math.sin(x * 0.08) * 8, 55, 9);
  }
  context.restore();
}

function drawSpaceCartelBackground(context: CanvasRenderingContext2D, world: World) {
  const { width, height } = world;

  context.save();
  context.fillStyle = "rgba(130, 176, 79, 0.72)";
  context.fillRect(width / 2 - 58, 70, 116, 34);
  context.strokeStyle = "#130e0c";
  context.lineWidth = 3;
  context.strokeRect(width / 2 - 58, 70, 116, 34);
  drawPixelText(context, "CARTEL", width / 2, 88, 14, "#130e0c");

  context.globalAlpha = 0.42;
  context.strokeStyle = "rgba(191, 73, 74, 0.48)";
  for (let orbit = 0; orbit < 4; orbit += 1) {
    context.beginPath();
    context.ellipse(width / 2, height * 0.45, 92 + orbit * 46, 26 + orbit * 13, orbit * 0.28, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawMarketCapMarkers(context: CanvasRenderingContext2D, world: World) {
  const displayMcap = getDisplayMcap(world);
  const range = getBiomeRangeForMcap(displayMcap);
  const markerRange = Number.isFinite(range.max) ? Math.max(1, range.max - range.min) : Math.max(1, displayMcap - range.min + 69_000_000_000);
  const markers = getMarkerScoresForMcap(displayMcap);
  const markerSpan = world.height * 0.62;

  context.save();
  context.font = "700 11px Courier New, monospace";
  context.textBaseline = "middle";

  for (const marker of markers) {
    const y = world.height * 0.52 - ((marker - displayMcap) / markerRange) * markerSpan;
    if (y < -30 || y > world.height + 30) continue;

    const label = formatMarkerScore(marker);
    const isMajor = marker === range.min || marker === range.max || marker >= 1_000_000_000;

    context.globalAlpha = isMajor ? 0.76 : 0.48;
    context.strokeStyle = "#130e0c";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(42, y);
    context.moveTo(world.width - 42, y);
    context.lineTo(world.width, y);
    context.stroke();

    context.strokeStyle = isMajor ? "#e4b745" : "#8da66a";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(42, y);
    context.moveTo(world.width - 42, y);
    context.lineTo(world.width, y);
    context.stroke();

    context.globalAlpha = 0.86;
    context.fillStyle = "rgba(19, 14, 12, 0.7)";
    context.fillRect(4, y - 11, 42, 22);
    context.fillRect(world.width - 46, y - 11, 42, 22);
    context.fillStyle = "#f4e4b2";
    context.textAlign = "left";
    context.fillText(label, 8, y + 1);
    context.textAlign = "right";
    context.fillText(label, world.width - 8, y + 1);
  }

  context.restore();
}

function drawPosterBackgroundImage(
  context: CanvasRenderingContext2D,
  world: World,
  background: BackgroundKey,
  image: HTMLImageElement | null | undefined,
  fallbackColor: string,
  alpha = 1,
) {
  const { width, height } = world;

  context.save();
  context.globalAlpha = alpha;

  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    context.fillStyle = fallbackColor;
    context.fillRect(0, 0, width, height);
    context.restore();
    return;
  }

  const overdraw = Math.max(96, height * 0.18);
  const scale = Math.max(width / image.naturalWidth, (height + overdraw) / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const extraHeight = Math.max(0, drawHeight - height);
  const localProgress = getBiomeLocalProgress(getBiomeProgress(world), background);
  const parallax = backgroundParallax[background];
  const drift = clamp(localProgress * extraHeight * 0.78 + world.cameraY * parallax, 0, extraHeight * 0.82);
  const anchorToBottom = background === "crypto-orbit";
  const y = anchorToBottom
    ? clamp(-extraHeight + drift * 0.35, -extraHeight, 0)
    : clamp(-extraHeight * 0.82 + drift, -extraHeight, 0);

  context.drawImage(image, x, y, drawWidth, drawHeight);

  context.restore();
}

function drawStreetFallback(context: CanvasRenderingContext2D, world: World, alpha: number) {
  const { width, height } = world;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = "#8ccdf2";
  context.fillRect(0, 0, width, height);

  context.globalAlpha = alpha * 0.42;
  context.fillStyle = "#ffffff";
  for (let index = 0; index < 5; index += 1) {
    const x = (index * 118 + (world.cameraY * 0.04) % 80) % (width + 120) - 80;
    const y = 42 + ((index * 41) % 150);
    context.fillRect(x, y, 72, 18);
    context.fillRect(x + 18, y - 12, 46, 18);
  }

  context.globalAlpha = alpha;
  context.fillStyle = "#536b5a";
  for (let index = 0; index < 7; index += 1) {
    const buildingWidth = width / 5.2;
    const buildingHeight = 86 + ((index * 47) % 115);
    const x = index * (buildingWidth * 0.72) - 22;
    context.fillRect(x, height - buildingHeight, buildingWidth, buildingHeight);
  }
  context.fillStyle = "#5c3c2c";
  context.fillRect(0, height - 34, width, 34);
  context.restore();
}

function drawStreetBackgroundImage(
  context: CanvasRenderingContext2D,
  world: World,
  image: HTMLImageElement | null | undefined,
  fallbackColor: string,
  alpha = 1,
) {
  const { width, height } = world;

  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    context.save();
    context.fillStyle = fallbackColor;
    context.fillRect(0, 0, width, height);
    context.restore();
    drawStreetFallback(context, world, alpha);
    return;
  }

  context.save();
  context.globalAlpha = alpha;

  const skySourceHeight = Math.max(1, image.naturalHeight * 0.42);
  const skyScale = Math.max(width / image.naturalWidth, height / skySourceHeight);
  const skyDrawWidth = image.naturalWidth * skyScale;
  const skyDrawHeight = skySourceHeight * skyScale;
  const skyX = (width - skyDrawWidth) / 2;
  const skyOffset = ((world.cameraY * 0.055) % skyDrawHeight + skyDrawHeight) % skyDrawHeight;

  for (let y = skyOffset - skyDrawHeight; y < height + skyDrawHeight; y += skyDrawHeight) {
    context.drawImage(image, 0, 0, image.naturalWidth, skySourceHeight, skyX, y, skyDrawWidth, skyDrawHeight);
  }

  const groundSourceY = image.naturalHeight * 0.42;
  const groundSourceHeight = image.naturalHeight - groundSourceY;
  const groundScale = Math.max(width / image.naturalWidth, (height * 0.5) / groundSourceHeight);
  const groundDrawWidth = image.naturalWidth * groundScale;
  const groundDrawHeight = groundSourceHeight * groundScale;
  const groundX = (width - groundDrawWidth) / 2;
  const groundY = height - groundDrawHeight + Math.min(44, world.cameraY * 0.018);

  context.drawImage(
    image,
    0,
    groundSourceY,
    image.naturalWidth,
    groundSourceHeight,
    groundX,
    groundY,
    groundDrawWidth,
    groundDrawHeight,
  );

  context.restore();
}

function drawBiomeBackgroundImage(
  context: CanvasRenderingContext2D,
  world: World,
  background: BackgroundKey,
  image: HTMLImageElement | null | undefined,
  fallbackColor: string,
  alpha = 1,
) {
  drawPosterBackgroundImage(context, world, background, image, fallbackColor, alpha);
}

function drawTornTransitionBand(context: CanvasRenderingContext2D, world: World, top: boolean, alpha: number) {
  const baseY = top ? 0 : world.height;
  const edgeY = top ? 76 : world.height - 76;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = "#100b09";
  context.beginPath();

  if (top) {
    context.moveTo(0, baseY);
    context.lineTo(world.width, baseY);
    for (let x = world.width; x >= 0; x -= 24) {
      const rough = Math.sin(x * 0.09 + world.backgroundSeed) * 9 + Math.cos(x * 0.031) * 7;
      context.lineTo(x, edgeY + rough);
    }
  } else {
    context.moveTo(0, baseY);
    context.lineTo(world.width, baseY);
    for (let x = world.width; x >= 0; x -= 24) {
      const rough = Math.sin(x * 0.08 + world.backgroundSeed * 1.7) * 8 + Math.cos(x * 0.037) * 7;
      context.lineTo(x, edgeY + rough);
    }
  }

  context.closePath();
  context.fill();
  context.restore();
}

function drawTransitionOverlay(
  context: CanvasRenderingContext2D,
  world: World,
  mix: { current: BackgroundKey; next?: BackgroundKey; alpha: number; message?: string },
) {
  if (!mix.next || !mix.message || mix.alpha <= 0 || mix.alpha >= 1) return;

  const pulse = Math.sin(mix.alpha * Math.PI);
  const textAlpha = clamp(pulse * 1.25, 0, 1);

  context.save();
  context.globalAlpha = 0.2 * pulse;
  context.fillStyle = "#050403";
  context.fillRect(0, 0, world.width, world.height);
  context.restore();

  drawTornTransitionBand(context, world, true, 0.46 * pulse);
  drawTornTransitionBand(context, world, false, 0.36 * pulse);

  context.save();
  context.globalAlpha = textAlpha;
  const panelWidth = Math.min(world.width - 42, 286);
  const panelHeight = 48;
  const panelX = (world.width - panelWidth) / 2;
  const panelY = world.height * 0.46 - panelHeight / 2;

  context.fillStyle = "rgba(19, 14, 12, 0.82)";
  context.fillRect(panelX, panelY, panelWidth, panelHeight);
  context.strokeStyle = "#e4b745";
  context.lineWidth = 2;
  context.strokeRect(panelX + 4, panelY + 4, panelWidth - 8, panelHeight - 8);
  drawPixelText(context, mix.message, world.width / 2, panelY + panelHeight / 2 + 1, 18, "#f4e4b2");
  context.restore();
}

function drawBackground(context: CanvasRenderingContext2D, world: World, assets: LoadedAssets) {
  const biomeProgress = getBiomeProgress(world);
  const mix = getBackgroundMix(biomeProgress);
  const fallbackColors = Object.fromEntries(biomeDefinitions.map((biome) => [biome.key, biome.fallback])) as Record<BackgroundKey, string>;

  drawBiomeBackgroundImage(context, world, mix.current, assets.backgrounds[mix.current], fallbackColors[mix.current], 1);

  if (mix.next && mix.alpha > 0) {
    drawBiomeBackgroundImage(context, world, mix.next, assets.backgrounds[mix.next], fallbackColors[mix.next], mix.alpha);
  }

  drawTransitionOverlay(context, world, mix);

  context.save();
  context.globalAlpha = 0.14;
  context.strokeStyle = "#f4e4b2";
  context.lineWidth = 1;
  const gridOffset = ((world.cameraY * 0.08) % 48 + 48) % 48;
  for (let y = gridOffset; y < world.height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(world.width, y);
    context.stroke();
  }
  context.restore();

  drawMarketCapMarkers(context, world);
  drawPaperScratches(context, world);
  drawPixelText(context, getStage(biomeProgress), world.width / 2, 28, 13, "#f4e4b2");
}

function drawMoneyPrinterSparkles(context: CanvasRenderingContext2D, world: World, platform: Platform) {
  if (!platform.hasMoneyPrinter) return;

  context.save();
  context.fillStyle = "#e4b745";

  for (let index = 0; index < 5; index += 1) {
    const phase = world.time * 5.8 + platform.phase + index * 1.7;
    const x = platform.width * (0.2 + index * 0.15) + Math.sin(phase) * 4;
    const y = -18 - Math.cos(phase * 0.8) * 8 - (index % 2) * 5;
    const size = index % 2 === 0 ? 3 : 2;

    context.globalAlpha = 0.42 + Math.sin(phase) * 0.16;
    context.fillRect(x, y, size, size);
  }

  context.restore();
}

function drawRedCandleCracks(context: CanvasRenderingContext2D, platform: Platform, alpha = 1) {
  if (platform.kind !== "red-candle" || (!platform.cracked && !platform.panicRed)) return;

  context.save();
  context.globalAlpha = alpha;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#2b1612";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(platform.width * 0.32, 2);
  context.lineTo(platform.width * 0.39, platform.height * 0.42);
  context.lineTo(platform.width * 0.34, platform.height - 3);
  context.moveTo(platform.width * 0.59, 3);
  context.lineTo(platform.width * 0.54, platform.height * 0.54);
  context.lineTo(platform.width * 0.64, platform.height - 2);
  context.stroke();
  context.restore();
}

function drawPlatformParticles(context: CanvasRenderingContext2D, world: World, platform: Platform, color: string, count: number) {
  context.save();
  context.fillStyle = color;

  for (let index = 0; index < count; index += 1) {
    const phase = world.time * 7 + platform.phase + index * 1.9;
    const x = platform.width * (0.18 + index / Math.max(1, count) * 0.68) + Math.sin(phase) * 3;
    const y = -10 - Math.cos(phase * 0.8) * 5 - (index % 2) * 4;

    context.globalAlpha = 0.36 + Math.sin(phase) * 0.12;
    context.fillRect(x, y, 2, 2);
  }

  context.restore();
}

function drawPlatform(context: CanvasRenderingContext2D, world: World, platform: Platform, assets: LoadedAssets) {
  const y = screenY(world, platform.y);

  if (y < -90 || y > world.height + 80) return;

  const breakAge = platform.state === "breaking" && platform.breakStartedAt !== undefined ? world.time - platform.breakStartedAt : 0;
  const alpha = platform.state === "breaking" ? clamp(1 - breakAge * 1.7, 0, 1) : 1;
  const wobble = platform.kind === "rug" && platform.state === "solid" ? Math.sin(world.time * 10 + platform.phase) * 1.4 : 0;
  const reaction = platform.reactUntil > world.time ? clamp((platform.reactUntil - world.time) / 0.16, 0, 1) * platform.reactPower : 0;
  const unstableReaction = platform.kind === "red-candle" || platform.kind === "rug" ? Math.sin(world.time * 54 + platform.phase) * reaction * 18 : 0;
  const x = platform.x + wobble;

  context.save();
  context.globalAlpha = alpha;
  context.translate(x + platform.width / 2 + unstableReaction, y + platform.height / 2 + reaction * 8);
  context.scale(1 + reaction * 0.5, 1 - reaction * 0.62);
  context.translate(-platform.width / 2, -platform.height / 2);

  if (platform.state === "breaking") {
    if (platform.kind === "red-candle" && breakAge < 0.1) {
      const redSprite = assets.platforms[platform.kind];
      if (redSprite?.complete && redSprite.naturalWidth > 0 && redSprite.naturalHeight > 0) {
        context.drawImage(redSprite, -8, platform.height + 14 - 38, platform.width + 16, 38);
      } else {
        drawOutlinedRect(context, 0, 0, platform.width, platform.height, "#b94b3e");
        context.fillStyle = "#d7a657";
        context.fillRect(platform.width - 18, -8, 7, 8);
      }
      drawRedCandleCracks(context, platform, 0.9);

      context.restore();
      return;
    }

    const shardY = breakAge * 54;
    drawOutlinedRect(context, 0, shardY, platform.width * 0.45, platform.height, platform.kind === "red-candle" ? "#a9352d" : "#74523f");
    drawOutlinedRect(context, platform.width * 0.56, shardY + 8, platform.width * 0.4, platform.height, platform.kind === "red-candle" ? "#7d211d" : "#573627");
    context.restore();
    return;
  }

  const sprite = assets.platforms[platform.kind];
  if (sprite?.complete && sprite.naturalWidth > 0 && sprite.naturalHeight > 0) {
    const spriteScale: Record<PlatformKind, { widthPad: number; height: number; yOffset: number }> = {
      "green-candle": { widthPad: 16, height: 38, yOffset: 14 },
      "red-candle": { widthPad: 16, height: 38, yOffset: 14 },
      rug: { widthPad: 18, height: 42, yOffset: 16 },
      "honey-jar": { widthPad: 16, height: 32, yOffset: 17 },
      "cash-stack": { widthPad: 16, height: 48, yOffset: 22 },
      solana: { widthPad: 16, height: 40, yOffset: 15 },
    };
    const box = spriteScale[platform.kind];
    const drawWidth = platform.width + box.widthPad;
    const drawX = -box.widthPad / 2;
    const drawY = platform.height + box.yOffset - box.height;

    context.drawImage(sprite, drawX, drawY, drawWidth, box.height);
    drawMoneyPrinterSparkles(context, world, platform);
    drawRedCandleCracks(context, platform);
    context.restore();
    return;
  }

  switch (platform.kind) {
    case "green-candle":
      drawOutlinedRect(context, 0, 0, platform.width, platform.height, "#82a94c");
      context.fillStyle = "#d7c26b";
      context.fillRect(platform.width - 18, -8, 7, 8);
      context.fillStyle = "#395b2f";
      context.fillRect(10, 4, platform.width - 24, 3);
      break;
    case "red-candle":
      drawOutlinedRect(context, 0, 0, platform.width, platform.height, "#b94b3e");
      context.fillStyle = "#d7a657";
      context.fillRect(platform.width - 18, -8, 7, 8);
      context.fillStyle = "#6f251f";
      context.fillRect(8, 4, platform.width - 18, 3);
      drawRedCandleCracks(context, platform);
      break;
    case "honey-jar":
      drawOutlinedRect(context, 0, 3, platform.width, platform.height, "#d49632");
      context.fillStyle = "#f0d36a";
      context.fillRect(8, -5, platform.width - 16, 10);
      context.strokeStyle = "#130e0c";
      context.strokeRect(8, -5, platform.width - 16, 10);
      context.fillStyle = "#f4e4b2";
      context.fillRect(platform.width * 0.22, 9, platform.width * 0.52, 6);
      break;
    case "cash-stack":
      drawOutlinedRect(context, 0, 0, platform.width, platform.height, "#6f934c");
      context.fillStyle = "#dce0aa";
      for (let bill = 9; bill < platform.width - 12; bill += 26) {
        context.fillRect(bill, 4, 18, 10);
      }
      break;
    case "solana":
      drawOutlinedRect(context, 0, 0, platform.width, platform.height, "#8f6ed5");
      context.fillStyle = "#dce0aa";
      context.fillRect(12, 5, platform.width - 24, 4);
      break;
    case "rug":
      drawOutlinedRect(context, 0, 0, platform.width, platform.height, "#744b3d");
      context.fillStyle = "#d4aa4c";
      for (let fringe = 4; fringe < platform.width; fringe += 13) {
        context.fillRect(fringe, platform.height, 5, 7);
      }
      context.fillStyle = "#3d2520";
      context.fillRect(11, 5, platform.width - 22, 5);
      break;
  }

  context.font = "700 10px Courier New, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#130e0c";
  context.fillText(platformLabel(platform.kind), platform.width / 2, platform.height / 2 + 1);

  if (platform.hasMoneyPrinter) {
    drawOutlinedRect(context, platform.width / 2 - 18, -33, 36, 22, "#a8b96f");
    context.fillStyle = "#15130f";
    context.fillRect(platform.width / 2 - 11, -27, 22, 7);
    context.fillStyle = "#f4e4b2";
    context.font = "700 10px Courier New, monospace";
    context.fillText("$$", platform.width / 2, -14);
  }

  drawMoneyPrinterSparkles(context, world, platform);
  if (platform.kind === "solana") {
    drawPlatformParticles(context, world, platform, "#8f6ed5", 3);
  }

  context.restore();
}

function drawJetpack(
  context: CanvasRenderingContext2D,
  world: World,
  collectible: Collectible,
  image?: HTMLImageElement | null,
) {
  const y = screenY(world, collectible.y);

  if (y < -70 || y > world.height + 70) return;

  const bob = Math.sin(world.time * 4 + collectible.phase) * 4;

  context.save();
  context.translate(collectible.x, y + bob);

  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    context.drawImage(image, -26, -30, 52, 60);
  } else {
    context.globalAlpha = 0.18 + Math.sin(world.time * 7 + collectible.phase) * 0.04;
    context.fillStyle = "#e4b745";
    context.fillRect(-23, -27, 46, 54);

    context.globalAlpha = 1;
    context.fillStyle = "#f4e4b2";
    context.fillRect(-13, -18, 26, 30);
    context.strokeStyle = "#130e0c";
    context.lineWidth = 3;
    context.strokeRect(-13, -18, 26, 30);

    context.fillStyle = "#b94b3e";
    context.fillRect(-20, -11, 9, 30);
    context.fillRect(11, -11, 9, 30);
    context.strokeRect(-20, -11, 9, 30);
    context.strokeRect(11, -11, 9, 30);

    context.fillStyle = "#8ba65b";
    context.fillRect(-7, -25, 14, 9);
    context.strokeRect(-7, -25, 14, 9);

    context.fillStyle = "#e4b745";
    context.fillRect(-15, 20, 8, 11 + Math.sin(world.time * 10) * 3);
    context.fillRect(7, 20, 8, 11 + Math.cos(world.time * 10) * 3);
    context.fillStyle = "#130e0c";
    context.font = "700 8px Courier New, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("JET", 0, -1);
  }

  context.restore();
}

function drawRedPill(context: CanvasRenderingContext2D, world: World, collectible: Collectible) {
  const y = screenY(world, collectible.y);

  if (y < -60 || y > world.height + 60) return;

  const bob = Math.sin(world.time * 4.4 + collectible.phase) * 4;

  context.save();
  context.translate(collectible.x, y + bob);
  context.rotate(Math.sin(world.time * 3.6 + collectible.phase) * 0.18);
  context.fillStyle = "#d94b45";
  context.strokeStyle = "#130e0c";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(-18, -9, 36, 18, 9);
  context.fill();
  context.stroke();
  context.fillStyle = "#f4e4b2";
  context.fillRect(-1, -8, 3, 16);
  context.fillStyle = "rgba(255, 255, 255, 0.46)";
  context.fillRect(-11, -5, 8, 3);
  context.restore();
}

function drawCollectibles(context: CanvasRenderingContext2D, world: World, assets: LoadedAssets) {
  for (const collectible of world.collectibles) {
    if (!collectible.collected) {
      if (collectible.kind === "jetpack") {
        drawJetpack(context, world, collectible, assets.jetpack);
      } else {
        drawRedPill(context, world, collectible);
      }
    }
  }
}

function drawHoneyLife(context: CanvasRenderingContext2D, world: World, image: HTMLImageElement | null | undefined) {
  const honeyLife = world.honeyLife;
  if (!honeyLife || honeyLife.collected) return;

  const y = screenY(world, honeyLife.y);
  if (y < -50 || y > world.height + 50) return;

  const bob = Math.sin(world.time * 4.5 + honeyLife.phase) * 4;

  context.save();
  context.translate(honeyLife.x, y + bob);
  context.rotate(Math.sin(world.time * 3 + honeyLife.phase) * 0.08);

  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    context.drawImage(image, -18, -20, 36, 40);
  } else {
    context.fillStyle = "#d49632";
    context.strokeStyle = "#130e0c";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(-16, -18, 32, 36, 8);
    context.fill();
    context.stroke();
    context.fillStyle = "#f0d36a";
    context.fillRect(-10, -24, 20, 8);
    context.strokeRect(-10, -24, 20, 8);
    context.fillStyle = "#130e0c";
    context.font = "700 8px Courier New, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("+1", 0, 1);
  }

  context.restore();
}

function drawMumuPlaceholder(context: CanvasRenderingContext2D, mumu: MumuObstacle) {
  context.fillStyle = mumu.variant === "red" ? "#b92f35" : "#7b4b2d";
  context.fillRect(-mumu.width / 2 + 9, -mumu.height / 2 + 12, mumu.width - 18, mumu.height - 18);
  context.strokeStyle = "#130e0c";
  context.lineWidth = 3;
  context.strokeRect(-mumu.width / 2 + 9, -mumu.height / 2 + 12, mumu.width - 18, mumu.height - 18);
  context.fillStyle = mumu.variant === "red" ? "#f05b51" : "#d7a657";
  context.fillRect(-mumu.width / 2 + 3, -mumu.height / 2 + 4, 17, 13);
  context.fillRect(mumu.width / 2 - 20, -mumu.height / 2 + 4, 17, 13);
  context.fillStyle = "#130e0c";
  context.fillRect(-13, -4, 6, 6);
  context.fillRect(8, -4, 6, 6);
}

function drawSingleMumu(context: CanvasRenderingContext2D, world: World, image: HTMLImageElement | null, mumu: MumuObstacle) {
  const y = screenY(world, mumu.y);

  if (mumu.state === "warning") {
    const warningAge = world.time - mumu.warningStartedAt;
    const pulse = 0.68 + Math.sin(warningAge * 12) * 0.18;
    const x = mumu.side === "left" ? 82 : world.width - 82;
    const warningY = 54 + (mumu.id % 2) * 36;
    const panelWidth = mumu.warningLabel === "RED MUMU" ? 112 : mumu.warningLabel === "MUMU PATROL" ? 132 : 144;

    context.save();
    context.globalAlpha = clamp(pulse, 0.35, 0.92);
    context.fillStyle = mumu.variant === "red" ? "rgba(121, 32, 34, 0.88)" : "rgba(19, 14, 12, 0.82)";
    context.fillRect(x - panelWidth / 2, warningY - 17, panelWidth, 34);
    context.strokeStyle = mumu.variant === "red" ? "#f4e4b2" : "#e4b745";
    context.lineWidth = 2;
    context.strokeRect(x - panelWidth / 2 + 4, warningY - 13, panelWidth - 8, 26);
    drawPixelText(context, mumu.warningLabel, x, warningY + 1, 12, "#f4e4b2");
    context.restore();
    return;
  }

  if (y < -80 || y > world.height + 80) return;

  context.save();
  context.translate(mumu.x, y + Math.sin(world.time * 12 + mumu.phase) * 2);
  if (mumu.vx < 0) {
    context.scale(-1, 1);
  }

  const trailDirection = mumu.vx < 0 ? -1 : 1;
  const speedAlpha = clamp(Math.abs(mumu.vx) / 760, 0.22, mumu.variant === "red" ? 0.68 : 0.52);
  for (let index = 3; index >= 1; index -= 1) {
    context.save();
    context.globalAlpha = speedAlpha * ((mumu.variant === "red" ? 0.24 : 0.16) / index);
    context.translate(-trailDirection * index * 18, Math.sin(world.time * 14 + index) * 2);
    context.scale(1 + index * 0.045, 0.95);
    if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      context.drawImage(image, -mumu.width / 2, -mumu.height / 2, mumu.width, mumu.height);
    } else {
      drawMumuPlaceholder(context, mumu);
    }
    context.restore();
  }

  context.globalAlpha = mumu.hit ? 0.72 : 1;
  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    context.drawImage(image, -mumu.width / 2, -mumu.height / 2, mumu.width, mumu.height);
  } else {
    drawMumuPlaceholder(context, mumu);
  }

  if (mumu.variant === "red") {
    context.globalAlpha = mumu.hit ? 0.18 : 0.28;
    context.globalCompositeOperation = "source-atop";
    context.fillStyle = "#d2292f";
    context.fillRect(-mumu.width / 2, -mumu.height / 2, mumu.width, mumu.height);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 0.85;
    context.strokeStyle = "#f05b51";
    context.lineWidth = 3;
    context.strokeRect(-mumu.width / 2 + 8, -mumu.height / 2 + 8, mumu.width - 16, mumu.height - 16);
  }

  context.restore();
}

function drawMumu(
  context: CanvasRenderingContext2D,
  world: World,
  image: HTMLImageElement | null,
  evilImage: HTMLImageElement | null,
) {
  if (world.mumu) {
    drawSingleMumu(
      context,
      world,
      world.mumu.variant === "red" ? evilImage ?? image : image,
      world.mumu,
    );
  }

  if (world.mumu2) {
    drawSingleMumu(
      context,
      world,
      world.mumu2.variant === "red" ? evilImage ?? image : image,
      world.mumu2,
    );
  }
}

function drawFallbackPlayer(context: CanvasRenderingContext2D, player: Player) {
  drawOutlinedRect(context, -player.width / 2, -player.height / 2, player.width, player.height, "#b97538");
  context.fillStyle = "#f1c05d";
  context.fillRect(-player.width / 2 + 7, -player.height / 2 + 7, player.width - 14, player.height - 13);
  context.fillStyle = "#111111";
  context.fillRect(-12, -9, 9, 7);
  context.fillRect(4, -9, 9, 7);
}

function drawPaperFlame(context: CanvasRenderingContext2D, x: number, y: number, scale: number, phase: number) {
  const sway = Math.sin(phase) * 4 * scale;

  context.save();
  context.translate(x + sway, y);
  context.scale(scale, scale);
  context.fillStyle = "#d94b45";
  context.strokeStyle = "#130e0c";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -24);
  context.bezierCurveTo(19, -8, 13, 13, 0, 20);
  context.bezierCurveTo(-17, 9, -13, -8, 0, -24);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#e4b745";
  context.beginPath();
  context.moveTo(0, -13);
  context.bezierCurveTo(10, -2, 7, 10, 0, 14);
  context.bezierCurveTo(-9, 7, -7, -2, 0, -13);
  context.closePath();
  context.fill();
  context.restore();
}

function drawOnFireCanvasEffects(context: CanvasRenderingContext2D, world: World) {
  if (!isOnFire(world)) return;

  const remaining = clamp((world.onFireUntil - world.time) / onFireDuration, 0, 1);
  const pulse = 0.88 + Math.sin(world.time * 12) * 0.12;

  context.save();
  context.globalAlpha = 0.62 + remaining * 0.18;
  for (let index = 0; index < 7; index += 1) {
    const y = world.height - 14 - ((index * world.height) / 6.4 + world.time * 74) % (world.height + 60);
    const scale = (0.8 + (index % 3) * 0.14) * pulse;
    drawPaperFlame(context, 14, y, scale, world.time * 8.8 + index);
    drawPaperFlame(context, world.width - 14, y + 18, scale, world.time * 9.2 + index * 1.3);
  }

  context.globalAlpha = 0.18;
  context.strokeStyle = "#e4b745";
  context.lineWidth = 2;
  for (let index = 0; index < 5; index += 1) {
    const y = (world.height + index * 97 - (world.time * 130) % (world.height + 120)) % (world.height + 120) - 60;
    context.beginPath();
    context.moveTo(48 + index * 17, y);
    context.lineTo(22 + index * 10, y + 58);
    context.moveTo(world.width - 48 - index * 17, y + 18);
    context.lineTo(world.width - 22 - index * 10, y + 76);
    context.stroke();
  }

  context.globalAlpha = 0.92;
  drawPixelText(context, "BOBOCLAAAAAT MODE", world.width / 2, world.height * 0.22, 30, "#e4b745");
  context.restore();
}

function drawMarketCrashCanvasEffects(context: CanvasRenderingContext2D, world: World) {
  if (!isMarketCrashActive(world)) return;

  const remaining = clamp((world.marketCrashUntil - world.time) / marketCrashDuration, 0, 1);
  const pulse = 0.62 + Math.sin(world.time * 9) * 0.12;

  context.save();
  context.globalAlpha = 0.045 + Math.max(0, Math.sin(world.time * 8)) * 0.025;
  context.fillStyle = "#d94b45";
  context.fillRect(0, 0, world.width, world.height);
  context.globalAlpha = pulse;
  context.strokeStyle = "#d94b45";
  context.lineWidth = 3;
  context.strokeRect(7, 7, world.width - 14, world.height - 14);
  context.globalAlpha = 0.82;
  drawPixelText(context, "OH SHIT, BOBO MARKET", world.width / 2, 58, 15, "#d94b45");

  context.globalAlpha = 0.18 + remaining * 0.12;
  context.fillStyle = "#d94b45";
  for (let index = 0; index < 7; index += 1) {
    const y = (index * 91 + world.time * 34) % (world.height + 70) - 35;
    context.fillRect(0, y, 8, 28);
    context.fillRect(world.width - 8, y + 33, 8, 28);
  }
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, world: World, playerImage: HTMLImageElement | null) {
  const { player } = world;
  const x = player.x;
  const y = screenY(world, player.y);
  const tilt = clamp(player.vx / 900, -0.18, 0.18);
  const flameSize = clamp(player.vy / 60, 0, 20);
  const isJetpacking = world.jetpackBoostUntil > world.time;
  const playerOnFire = isOnFire(world);
  const airScale = clamp(1 - Math.max(player.vy, 0) / 2400, 0.58, 1);
  const squash = world.playerSquashUntil > world.time ? clamp((world.playerSquashUntil - world.time) / 0.14, 0, 1) * world.playerSquashPower : 0;
  const firePulse = playerOnFire ? 0.02 + Math.sin(world.time * 15) * 0.018 : 0;

  context.save();
  context.translate(x, y + player.height / 2 + 8);
  context.scale(1, 0.34);
  const shadowGradient = context.createRadialGradient(0, 0, 2, 0, 0, player.width * 0.78 * airScale);
  shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0.26)");
  shadowGradient.addColorStop(0.72, "rgba(0, 0, 0, 0.12)");
  shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = shadowGradient;
  context.beginPath();
  context.ellipse(0, 0, player.width * 0.86 * airScale, 18 * airScale, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(x, y);
  context.rotate(tilt);
  context.scale(1 + squash + firePulse, 1 - squash * 0.72 + firePulse * 0.45);

  if (playerOnFire) {
    context.globalAlpha = 0.7;
    for (let index = 0; index < 3; index += 1) {
      const trailY = player.height / 2 + 11 + index * 13;
      const drift = Math.sin(world.time * 13 + index * 1.7) * 8;
      drawPaperFlame(context, drift, trailY, 0.22 - index * 0.035, world.time * 12 + index);
    }
    context.globalAlpha = 1;
    drawPaperFlame(context, -24, -9, 0.58, world.time * 10);
    drawPaperFlame(context, 24, -11, 0.58, world.time * 10.5 + 1.7);
    drawPaperFlame(context, 0, -31, 0.5, world.time * 11 + 0.8);
  }

  if (flameSize > 5) {
    context.fillStyle = "#b94b3e";
    context.fillRect(-8, player.height / 2 - 2, 16, isJetpacking ? flameSize + 18 : flameSize);
    context.fillStyle = "#d7a657";
    context.fillRect(-4, player.height / 2, 8, (isJetpacking ? flameSize + 18 : flameSize) * 0.72);
  }

  if (isJetpacking) {
    context.fillStyle = "#f4e4b2";
    for (let index = 0; index < 4; index += 1) {
      const drift = Math.sin(world.time * 18 + index) * 7;
      context.fillRect(drift - 2, player.height / 2 + 18 + index * 13, 4, 7);
    }
  }

  if (playerImage?.complete && playerImage.naturalWidth > 0) {
    context.imageSmoothingEnabled = true;
    context.drawImage(playerImage, -31, -35, 62, 62);
  } else {
    drawFallbackPlayer(context, player);
  }

  context.restore();
}

function resolvePlayerImage(assets: LoadedAssets, selectedHead: HeadKey) {
  return assets.heads[selectedHead] ?? assets.fallbackHead;
}

function drawFloatingFeedback(context: CanvasRenderingContext2D, world: World) {
  context.save();
  context.font = "700 15px Courier New, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const feedback of world.feedbackTexts) {
    const age = world.time - feedback.createdAt;
    const alpha = clamp(1 - age / feedbackLifetime, 0, 1);
    const y = screenY(world, feedback.y) - age * 42;

    context.globalAlpha = alpha;
    context.fillStyle = "#130e0c";
    context.fillText(feedback.text, feedback.x + 2, y + 2);
    context.fillStyle = feedback.color;
    context.fillText(feedback.text, feedback.x, y);
  }

  context.restore();
}

function drawGameParticles(context: CanvasRenderingContext2D, world: World) {
  context.save();

  for (const particle of world.particles) {
    const age = world.time - particle.createdAt;
    const alpha = clamp(1 - age / particle.lifetime, 0, 1);
    const y = screenY(world, particle.y);

    if (y < -20 || y > world.height + 20) continue;

    context.globalAlpha = alpha * 0.78;
    context.fillStyle = particle.color;
    context.fillRect(particle.x, y, particle.size, particle.size);
  }

  context.restore();
}

function drawWorld(context: CanvasRenderingContext2D, world: World, assets: LoadedAssets, selectedHead: HeadKey) {
  context.clearRect(0, 0, world.width, world.height);

  context.save();
  if (Math.abs(world.cameraKick) > 0.05) {
    context.translate(0, world.cameraKick);
  }
  if (world.shakePower > 0.1) {
    const shakeX = (Math.random() * 2 - 1) * world.shakePower;
    const shakeY = (Math.random() * 2 - 1) * world.shakePower;
    context.translate(shakeX, shakeY);
  }

  if (isIntoxicated(world)) {
    context.translate(Math.sin(world.time * 7.2) * 2.2, Math.cos(world.time * 5.4) * 1.4);
    context.rotate(Math.sin(world.time * 3.1) * 0.006);
  }

  drawBackground(context, world, assets);
  drawMarketCrashCanvasEffects(context, world);

  const sortedPlatforms = [...world.platforms].sort((left, right) => left.y - right.y);
  for (const platform of sortedPlatforms) {
    drawPlatform(context, world, platform, assets);
  }

  drawCollectibles(context, world, assets);
  drawHoneyLife(context, world, assets.honeyLife ?? assets.platforms["honey-jar"]);
  drawMumu(context, world, assets.mumu, assets.evilMumu);
  drawOnFireCanvasEffects(context, world);
  drawGameParticles(context, world);
  drawPlayer(context, world, resolvePlayerImage(assets, selectedHead));
  drawFloatingFeedback(context, world);
  context.restore();

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = "#000000";
  for (let y = 0; y < world.height; y += 5) {
    context.fillRect(0, y, world.width, 1);
  }
  context.restore();

  if (world.flashPower > 0.01) {
    context.save();
    context.globalAlpha = clamp(world.flashPower, 0, 0.55);
    context.fillStyle = "#f4e4b2";
    context.fillRect(0, 0, world.width, world.height);
    context.restore();
  }
}

function drawScoreCardCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.strokeStyle = "#21160f";
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(x, y, 68 * scale, 34 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 54 * scale, y + 8 * scale, 78 * scale, 38 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x - 58 * scale, y + 10 * scale, 72 * scale, 34 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function scoreCardTheme(stage: StageLabel) {
  switch (stage) {
    case "BACKALLEY":
    case "ROOFTOPS":
      return { top: "#5aaee8", middle: "#8fd0ff", bottom: "#2f5f8f", accent: "#f2c73a", shadow: "#1f4772", badge: "STREET SURVIVOR" };
    case "SKY ASCENT":
    case "CLOUDS":
      return { top: "#84d7ff", middle: "#dbf7ff", bottom: "#fff2b8", accent: "#6ead47", shadow: "#4f9ccc", badge: "CLOUD CHASER" };
    case "STORM MARKET":
      return { top: "#a54848", middle: "#e19879", bottom: "#391d28", accent: "#f2c73a", shadow: "#6f252f", badge: "PANIC SURVIVOR" };
    case "MOON":
      return { top: "#172b55", middle: "#8ea9d8", bottom: "#f2e6bf", accent: "#f2c73a", shadow: "#10172e", badge: "MOON SURVIVOR" };
    case "JUNGLE BAY ABYSS":
      return { top: "#140f33", middle: "#5c4ba8", bottom: "#160d24", accent: "#8f6ed5", shadow: "#0d081c", badge: "ORBIT LEGEND" };
    case "ASCENSION":
      return { top: "#f2c73a", middle: "#fff0b8", bottom: "#d58e4d", accent: "#6ead47", shadow: "#9b6b18", badge: "ASCENSION RUN" };
    case "BILLIONAIRE CLUB":
      return { top: "#f6a2c9", middle: "#ffe1a8", bottom: "#c58a3a", accent: "#f2c73a", shadow: "#8d4d6d", badge: "FUTURE BILLIONAIRE" };
    case "BOBO HEAVEN":
      return { top: "#fff1a8", middle: "#fff9df", bottom: "#f2c73a", accent: "#d49632", shadow: "#a56d10", badge: "BOBO HEAVENLY" };
    default:
      return { top: "#84d7ff", middle: "#dbf7ff", bottom: "#fff2b8", accent: "#f2c73a", shadow: "#4f9ccc", badge: "MOON SURVIVOR" };
  }
}

function drawScoreCardPaperPanel(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, stroke = "#21160f") {
  context.save();
  context.translate(x, y);
  context.beginPath();
  context.moveTo(18, 4);
  context.lineTo(width - 26, 0);
  context.quadraticCurveTo(width - 3, 5, width - 5, 29);
  context.lineTo(width, height - 26);
  context.quadraticCurveTo(width - 8, height - 2, width - 33, height - 5);
  context.lineTo(26, height);
  context.quadraticCurveTo(3, height - 7, 6, height - 31);
  context.lineTo(0, 27);
  context.quadraticCurveTo(4, 5, 18, 4);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 7;
  context.stroke();
  context.restore();
}

function drawScoreCardText(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") {
  context.save();
  context.textAlign = align;
  context.textBaseline = "middle";
  context.font = `900 ${size}px "Courier New", monospace`;
  context.lineJoin = "round";
  context.strokeStyle = "#21160f";
  context.lineWidth = Math.max(5, size * 0.09);
  context.strokeText(text, x, y);
  context.fillStyle = color;
  context.fillText(text, x, y);
  context.restore();
}

function drawScoreCardBadge(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, color: string) {
  context.save();
  context.translate(x, y);
  context.fillStyle = color;
  context.strokeStyle = "#21160f";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(-width / 2, -28);
  context.lineTo(width / 2, -28);
  context.lineTo(width / 2 - 20, 0);
  context.lineTo(width / 2, 28);
  context.lineTo(-width / 2, 28);
  context.lineTo(-width / 2 + 20, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#21160f";
  context.font = '900 26px "Courier New", monospace';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 0, 1);
  context.restore();
}

function drawScoreCardTexture(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = "#21160f";
  for (let index = 0; index < 360; index += 1) {
    const x = (Math.sin(index * 41.13) * 0.5 + 0.5) * width;
    const y = (Math.cos(index * 31.73) * 0.5 + 0.5) * height;
    context.fillRect(x, y, index % 3 === 0 ? 2 : 1, 1);
  }
  context.globalAlpha = 0.1;
  context.strokeStyle = "#ffffff";
  for (let index = 0; index < 28; index += 1) {
    const x = (Math.sin(index * 12.9) * 0.5 + 0.5) * width;
    const y = (Math.cos(index * 17.4) * 0.5 + 0.5) * height;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 34, y + 6);
    context.stroke();
  }
  context.restore();
}

function downloadScoreCardImage(result: RunResult, displayName: string, playerImage: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;

  const context = canvas.getContext("2d");
  if (!context) return;

  const score = formatMarketCap(result.score);
  const theme = scoreCardTheme(result.stage);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, theme.top);
  gradient.addColorStop(0.52, theme.middle);
  gradient.addColorStop(1, theme.bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.globalAlpha = 0.18;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(1320, 160, 118, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.1;
  context.beginPath();
  context.arc(1320, 160, 188, 0, Math.PI * 2);
  context.fill();
  context.restore();

  drawScoreCardCloud(context, 185, 162, 0.9);
  drawScoreCardCloud(context, 1350, 276, 0.8);
  drawScoreCardCloud(context, 1180, 748, 0.58);
  drawScoreCardTexture(context, canvas.width, canvas.height);

  context.save();
  context.globalAlpha = 0.18;
  context.fillStyle = theme.shadow;
  for (let index = 0; index < 7; index += 1) {
    const y = 250 + index * 82;
    context.fillRect(0, y, canvas.width, index % 2 === 0 ? 12 : 7);
  }
  context.restore();

  drawScoreCardPaperPanel(context, 70, 58, 1460, 784, "rgba(255, 246, 214, 0.94)");
  drawScoreCardPaperPanel(context, 105, 95, 1390, 710, "rgba(255, 255, 255, 0.32)", "rgba(33, 22, 15, 0.7)");

  drawScoreCardBadge(context, "BOBRO TO THE MOON", 800, 132, 590, theme.accent);
  drawScoreCardBadge(context, theme.badge, 1138, 570, 470, "#ffffff");

  context.save();
  context.globalAlpha = 0.76;
  context.fillStyle = "#21160f";
  context.fillRect(730, 228, 6, 492);
  context.globalAlpha = 0.55;
  context.fillStyle = theme.accent;
  context.fillRect(748, 228, 4, 492);
  context.restore();

  drawScoreCardPaperPanel(context, 160, 226, 470, 492, "rgba(255, 255, 255, 0.62)", "rgba(33, 22, 15, 0.82)");

  if (playerImage) {
    const headSize = 330;
    context.save();
    context.translate(395, 470);
    context.globalAlpha = 0.2;
    context.beginPath();
    context.ellipse(0, 178, 188, 38, 0, 0, Math.PI * 2);
    context.fillStyle = "#21160f";
    context.fill();
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(0, -8, 176, 0, Math.PI * 2);
    context.fillStyle = theme.accent;
    context.fill();
    context.lineWidth = 10;
    context.strokeStyle = "#21160f";
    context.stroke();
    context.drawImage(playerImage, -headSize / 2, -headSize / 2 - 20, headSize, headSize);
    context.restore();
  } else {
    context.save();
    context.translate(395, 470);
    context.beginPath();
    context.arc(0, -8, 176, 0, Math.PI * 2);
    context.fillStyle = theme.accent;
    context.fill();
    context.lineWidth = 10;
    context.strokeStyle = "#21160f";
    context.stroke();
    context.fillStyle = "#21160f";
    context.font = '900 92px "Courier New", monospace';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("BOBO", 0, -8);
    context.restore();
  }

  drawScoreCardText(context, score, 1138, 330, score.length > 6 ? 138 : 162, "#fff3bd");
  drawScoreCardText(context, "BOBO MCAP", 1138, 462, 54, theme.accent);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '900 58px "Courier New", monospace';
  context.fillStyle = "#21160f";
  context.fillText(result.stage, 1138, 640);
  context.font = '800 30px "Courier New", monospace';
  context.fillStyle = "#416c2d";
  context.fillText("REACHED ZONE", 1138, 690);

  drawScoreCardPaperPanel(context, 160, 746, 1280, 74, "rgba(255, 255, 255, 0.68)", "rgba(33, 22, 15, 0.72)");
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = '900 32px "Courier New", monospace';
  context.fillStyle = "#21160f";
  context.fillText(displayName.toUpperCase(), 206, 784);
  context.font = '800 24px "Courier New", monospace';
  context.fillStyle = "#a56d10";
  context.fillText(result.skinLabel, 548, 784);

  context.font = '900 27px "Courier New", monospace';
  context.fillStyle = "#21160f";
  context.textAlign = "right";
  context.fillText("bobroscartel.lol/game", 1395, 784);

  context.save();
  context.globalAlpha = 0.45;
  context.strokeStyle = "#21160f";
  context.lineWidth = 5;
  context.strokeRect(38, 38, canvas.width - 76, canvas.height - 76);
  context.strokeStyle = theme.accent;
  context.lineWidth = 3;
  context.strokeRect(58, 58, canvas.width - 116, canvas.height - 116);
  context.restore();

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `bobro-to-the-moon-${score.replace(/[^a-z0-9]+/gi, "").toLowerCase()}.png`;
  link.click();
}

type ScoreResponse = {
  playerBestToday?: number;
};

type HolderResponse = {
  isHolder: boolean;
  bobrosCount: number;
};

type WalletStatus = "idle" | "checking" | "holder" | "denied" | "error";

function getGameShareUrl() {
  if (configuredSiteUrl) return `${configuredSiteUrl}/game`;
  if (typeof window !== "undefined") return `${window.location.origin}/game`;

  return fallbackGameShareUrl;
}

async function checkHolder(wallet: string) {
  const response = await fetch(`/api/check-holder?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Holder check failed");
  }

  return (await response.json()) as HolderResponse;
}

export default function BobroToTheMoon({
  onScoreSubmitted,
  onAccessChange,
}: {
  onScoreSubmitted: () => void;
  onAccessChange?: (access: { mode: GameMode; wallet?: string }) => void;
}) {
  const {
    muted: audioMuted,
    toggleMuted: toggleAudioMuted,
    startMusic,
    switchToHighLevelMusic,
    pauseMusic,
    stopMusic,
    playGreenJump,
    playRedJump,
    playRugJump,
    playHoneyPlatform,
    playSolanaPlatform,
    playCashPrinterPlatform,
    playRedPill,
    playOnFire,
    playJetpack,
    playHoney,
    playMumu,
    playLoseGame,
  } = useGameAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false });
  const activePointerIdRef = useRef<number | null>(null);
  const worldRef = useRef<World>(createWorld());
  const hudRef = useRef<HudState>(initialHudState);
  const activeRunSessionRef = useRef<ActiveRunSession | null>(null);
  const autoStartGuestRunRef = useRef(false);
  const bestTodayRef = useRef(0);
  const recordRunRef = useRef<(world: World) => void>(() => undefined);
  const assetsRef = useRef<LoadedAssets>({
    heads: {},
    fallbackHead: null,
    backgrounds: {},
    platforms: {},
    honeyLife: null,
    jetpack: null,
    mumu: null,
    evilMumu: null,
  });
  const countdownTimeoutRef = useRef<number | undefined>(undefined);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [mode, setMode] = useState<GameMode>("guest");
  const [modeChosen, setModeChosen] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("idle");
  const [walletAddress, setWalletAddress] = useState("");
  const [manualWalletAddress, setManualWalletAddress] = useState("");
  const [bobrosCount, setBobrosCount] = useState(0);
  const [accessMessage, setAccessMessage] = useState("");
  const [runSessionMessage, setRunSessionMessage] = useState("");
  const [selectedHead, setSelectedHead] = useState<HeadKey>("bobro-head");
  const [bestUnlockScore, setBestUnlockScore] = useState(0);
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [nameError, setNameError] = useState("");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hud, setHud] = useState<HudState>(initialHudState);

  const syncHud = useCallback((_force = false) => {
    const world = worldRef.current;
    const displayScore = getDisplayScore(world);
    const statusLabels = [
      ...(isOnFire(world) ? ["BOBOCLAAAAAT MODE"] : []),
      ...(isMarketCrashActive(world) ? ["MARKET PANIC"] : []),
      ...(isIntoxicated(world) ? ["INTOXICATED"] : []),
    ];
    const nextHud: HudState = {
      status: world.status,
      score: displayScore,
      bonusLabel: world.bonusLabel,
      deathMessage: world.deathMessage,
      bestToday: bestTodayRef.current,
      lives: world.lives,
      multiplier: getScoreMultiplier(world),
      stage: getStage(getBiomeProgress(world)),
      countdownText: world.status === "countdown" ? getCountdownText(world) : "",
      statusLabels,
      milestoneActive: world.milestonePulseUntil > world.time,
    };

    if (areHudStatesEqual(hudRef.current, nextHud)) return;

    hudRef.current = nextHud;
    setHud(nextHud);
  }, []);

  const playAudioCue = useCallback(
    (cue: GameAudioCue) => {
      if (cue === "greenJump") {
        playGreenJump();
      } else if (cue === "redJump") {
        playRedJump();
      } else if (cue === "rugJump") {
        playRugJump();
      } else if (cue === "honeyPlatform") {
        playHoneyPlatform();
      } else if (cue === "solanaPlatform") {
        playSolanaPlatform();
      } else if (cue === "cashPrinterPlatform") {
        playCashPrinterPlatform();
      } else if (cue === "redPill") {
        playRedPill();
      } else if (cue === "onFire") {
        playOnFire();
      } else if (cue === "jetpack") {
        playJetpack();
      } else if (cue === "honey") {
        playHoney();
      } else if (cue === "loseGame") {
        playLoseGame();
      } else {
        playMumu();
      }
    },
    [
      playCashPrinterPlatform,
      playGreenJump,
      playHoney,
      playHoneyPlatform,
      playJetpack,
      playLoseGame,
      playMumu,
      playOnFire,
      playRedJump,
      playRedPill,
      playRugJump,
      playSolanaPlatform,
    ],
  );

  const loadProgressForMode = useCallback(
    (nextMode: GameMode, nextWallet = "") => {
      const storedBest = window.localStorage.getItem(getBestScoreKey(nextMode, nextWallet));
      const parsedBest = storedBest ? Number(storedBest) : 0;
      const bestToday = Number.isFinite(parsedBest) ? parsedBest : 0;

      bestTodayRef.current = bestToday;

      if (nextMode === "holder") {
        // Holder unlocks used to be global. Do not auto-migrate them, because
        // wallet-scoped keys prevent one wallet inheriting another wallet's skins.
        const storedUnlockBest = window.localStorage.getItem(getBestUnlockScoreKey(nextWallet));
        const parsedUnlockBest = storedUnlockBest ? Number(storedUnlockBest) : 0;
        const bestUnlock = Math.max(bestToday, Number.isFinite(parsedUnlockBest) ? parsedUnlockBest : 0);
        const storedHead = window.localStorage.getItem(getHeadStorageKey(nextWallet));

        setBestUnlockScore(bestUnlock);

        if (isHeadKey(storedHead) && isHeadUnlocked(storedHead, bestUnlock)) {
          setSelectedHead(storedHead);
        } else {
          setSelectedHead("bobro-head");
          window.localStorage.setItem(getHeadStorageKey(nextWallet), "bobro-head");
        }
      } else {
        setBestUnlockScore(0);
        setSelectedHead("bobro-head");
      }

      syncHud(true);
    },
    [syncHud],
  );

  useEffect(() => {
    let isCancelled = false;

    const loadAssets = async () => {
      const [headEntries, backgroundEntries, platformEntries, honeyLifeImage, jetpackImage, mumuImage, evilMumuImage] = await Promise.all([
        Promise.all(Object.entries(headAssetPaths).map(async ([key, src]) => [key, await loadCanvasImage(src)] as const)),
        Promise.all(Object.entries(backgroundAssetPaths).map(async ([key, src]) => [key, await loadCanvasImage(src)] as const)),
        Promise.all(Object.entries(platformAssetPaths).map(async ([key, src]) => [key, await loadCanvasImage(src)] as const)),
        loadCanvasImage(honeyLifeAssetPath),
        loadCanvasImage(jetpackAssetPath),
        loadCanvasImage(mumuAssetPath),
        loadCanvasImage(evilMumuAssetPath),
      ]);

      if (isCancelled) return;

      const heads = Object.fromEntries(headEntries.filter((entry) => entry[1])) as ImageMap<HeadKey>;
      const fallbackHead = heads["bobro-head"] ?? (await loadCanvasImage(legacyPlayerAssetPath));

      if (isCancelled) return;

      assetsRef.current = {
        heads,
        fallbackHead,
        backgrounds: Object.fromEntries(backgroundEntries.filter((entry) => entry[1])) as ImageMap<BackgroundKey>,
        platforms: Object.fromEntries(platformEntries.filter((entry) => entry[1])) as ImageMap<PlatformKind>,
        honeyLife: honeyLifeImage,
        jetpack: jetpackImage,
        mumu: mumuImage,
        evilMumu: evilMumuImage,
      };
      setAssetsLoaded(true);
    };

    void loadAssets();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    loadProgressForMode("guest");
  }, [loadProgressForMode]);

  useEffect(() => {
    if (mode === "guest" && selectedHead !== "bobro-head") {
      setSelectedHead("bobro-head");
    }
  }, [mode, selectedHead]);

  const selectHead = useCallback((head: HeadKey) => {
    if (mode !== "holder") return;
    if (!walletAddress) return;
    if (!isHeadUnlocked(head, bestUnlockScore)) return;

    setSelectedHead(head);
    window.localStorage.setItem(getHeadStorageKey(walletAddress), head);
  }, [bestUnlockScore, mode, walletAddress]);

  const activateHolderAccess = useCallback(
    (wallet: string, count: number) => {
      setMode("holder");
      setModeChosen(true);
      setWalletStatus("holder");
      setWalletAddress(wallet);
      setManualWalletAddress(wallet);
      setBobrosCount(count);
      setAccessMessage(`Holder mode active: ${count} Bobro detected.`);
      loadProgressForMode("holder", wallet);
      onAccessChange?.({ mode: "holder", wallet });
    },
    [loadProgressForMode, onAccessChange],
  );

  const activateGuestAccess = useCallback(
    (message: string, status: WalletStatus = "denied") => {
      setMode("guest");
      setModeChosen(true);
      setWalletStatus(status);
      setBobrosCount(0);
      setSelectedHead("bobro-head");
      setAccessMessage(message);
      loadProgressForMode("guest");
      onAccessChange?.({ mode: "guest" });
    },
    [loadProgressForMode, onAccessChange],
  );

  const playAsGuest = useCallback(() => {
    setMode("guest");
    setModeChosen(true);
    setWalletStatus("idle");
    setAccessMessage("GUEST RUN READY. LOCAL SCORE ONLY.");
    setWalletAddress("");
    setManualWalletAddress("");
    setBobrosCount(0);
    setSelectedHead("bobro-head");
    loadProgressForMode("guest");
    onAccessChange?.({ mode: "guest" });
  }, [loadProgressForMode, onAccessChange]);

  const startGuestRunFromMenu = useCallback(() => {
    startMusic("normal");
    autoStartGuestRunRef.current = true;
    playAsGuest();
  }, [playAsGuest, startMusic]);

  const checkEnteredWalletAddress = useCallback(async () => {
    if (walletStatus === "checking") return;

    autoStartGuestRunRef.current = false;
    const wallet = normalizeWalletInput(manualWalletAddress);
    setManualWalletAddress(wallet);

    if (!isLikelySolanaWalletAddress(wallet)) {
      setWalletStatus("error");
      setAccessMessage("Paste a valid Solana wallet address.");
      return;
    }

    setWalletAddress(wallet);
    setWalletStatus("checking");
    setAccessMessage("");

    try {
      const holder = await checkHolder(wallet);

      if (holder.isHolder) {
        activateHolderAccess(wallet, holder.bobrosCount);
        return;
      }

      activateGuestAccess("NO BOBRO NFT DETECTED. You can still play as guest.");
    } catch {
      setMode("guest");
      setModeChosen(false);
      setWalletStatus("error");
      setAccessMessage("Wallet check unavailable. You can still play as guest.");
      onAccessChange?.({ mode: "guest" });
    }
  }, [activateGuestAccess, activateHolderAccess, manualWalletAddress, onAccessChange, walletStatus]);

  const recordRunResult = useCallback(
    (world: World) => {
      const score = getDisplayScore(world);
      const previousBestToday = bestTodayRef.current;
      const nextBestToday = Math.max(previousBestToday, score);
      const skin = getHeadOption(selectedHead);
      const isHolderRun = mode === "holder";
      const unlockedSkin = isHolderRun
        ? [...headOptions].filter((head) => head.unlockAt > bestUnlockScore && head.unlockAt <= score).sort((left, right) => right.unlockAt - left.unlockAt)[0]
        : undefined;

      bestTodayRef.current = nextBestToday;
      window.localStorage.setItem(getBestScoreKey(mode, walletAddress), String(nextBestToday));

      if (isHolderRun) {
        setBestUnlockScore((currentBest) => {
          const nextBest = Math.max(currentBest, score);
          window.localStorage.setItem(getBestUnlockScoreKey(walletAddress), String(nextBest));
          return nextBest;
        });
      }

      setRunResult({
        score,
        stage: getStage(getBiomeProgress(world)),
        skinKey: selectedHead,
        skinLabel: skin.label,
        mode,
        deathMessage: world.deathMessage,
        previousBestToday,
        bestToday: nextBestToday,
        honeyLivesCollected: world.honeyLivesCollected,
        livesUsed: world.livesUsed,
        unlockedSkinLabel: unlockedSkin?.label,
        saved: false,
        runId: activeRunSessionRef.current?.runId,
        weekId: activeRunSessionRef.current?.weekId,
        leaderboardEligible: Boolean(activeRunSessionRef.current?.leaderboardEligible),
      });
      setSaveStatus("idle");
      setNameError("");
      syncHud(true);
    },
    [bestUnlockScore, mode, selectedHead, syncHud, walletAddress],
  );

  useEffect(() => {
    recordRunRef.current = (world: World) => {
      recordRunResult(world);
    };
  }, [recordRunResult]);

  const startRunSession = useCallback(async (): Promise<ActiveRunSession | null> => {
    try {
      const response = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          wallet: mode === "holder" ? walletAddress : undefined,
          selectedSkin: selectedHead,
          zone: "BACKALLEY",
        }),
      });

      if (!response.ok) {
        throw new Error("Run session unavailable");
      }

      const session = (await response.json()) as RunSessionResponse;

      if (!session.runId) {
        throw new Error("Run session unavailable");
      }

      setRunSessionMessage("");
      return { ...session, leaderboardEligible: mode === "holder" && Boolean(walletAddress) };
    } catch {
      setRunSessionMessage("Weekly leaderboard unavailable for this run. Local play still works.");
      return null;
    }
  }, [mode, selectedHead, walletAddress]);

  const saveRunToBountyBoard = useCallback(async () => {
    if (!runResult || saveStatus === "saving" || runResult.saved) return;
    if (mode !== "holder") {
      setNameError("Holder wallet required for weekly rewards.");
      return;
    }
    if (!runResult.leaderboardEligible || !runResult.runId) {
      setNameError("WEEKLY SESSION UNAVAILABLE. RUN AGAIN TO ENTER.");
      return;
    }

    const displayName = getValidPlayerName(playerName);
    if (!displayName) {
      setNameError("NO URLS ON THE BOUNTY BOARD");
      return;
    }

    setPlayerName(displayName);
    setNameError("");
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          wallet: walletAddress || playerWallet,
          runId: runResult.runId,
          score: runResult.score,
          formattedMcap: formatMarketCap(runResult.score),
          selectedSkin: runResult.skinKey,
          zone: runResult.stage,
          bobrosCount: Math.max(1, bobrosCount || 1),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save score");
      }

      const result = (await response.json()) as ScoreResponse;
      if (typeof result.playerBestToday === "number") {
        bestTodayRef.current = Math.max(bestTodayRef.current, result.playerBestToday);
        window.localStorage.setItem(getBestScoreKey("holder", walletAddress), String(bestTodayRef.current));
        setBestUnlockScore((currentBest) => {
          const nextBest = Math.max(currentBest, result.playerBestToday ?? 0);
          window.localStorage.setItem(getBestUnlockScoreKey(walletAddress), String(nextBest));
          return nextBest;
        });
      }

      setRunResult((currentResult) => (currentResult ? { ...currentResult, saved: true, bestToday: bestTodayRef.current } : currentResult));
      setSaveStatus("saved");
      onScoreSubmitted();
      syncHud(true);
    } catch {
      setSaveStatus("error");
    }
  }, [bobrosCount, mode, onScoreSubmitted, playerName, runResult, saveStatus, syncHud, walletAddress]);

  const shareRunOnX = useCallback(() => {
    if (!runResult) return;

    const shareUrl = getGameShareUrl();
    const scoreText = formatMarketCap(runResult.score);
    const tweetText = `I pushed $BOBO to ${scoreText} MCAP in Bobro To The Moon 🚀

Think you can beat my run?

🏆 Weekly rewards for Bobros holders
🥇 #1 wins a Bobros NFT
🎟 Top 3 get whitelist with special Bobros mint price

Play:
${shareUrl}`;

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank", "noopener,noreferrer");
  }, [runResult]);

  const downloadScoreCard = useCallback(() => {
    if (!runResult) return;

    const displayName = getValidPlayerName(playerName) ?? defaultPlayerName;
    setPlayerName(displayName);
    setNameError("");
    downloadScoreCardImage(runResult, displayName, resolvePlayerImage(assetsRef.current, runResult.skinKey));
  }, [playerName, runResult]);

  const updatePlayerName = useCallback((value: string) => {
    if (hasUrlLikeText(value)) {
      setNameError("NO URLS ON THE BOUNTY BOARD");
      return;
    }

    setNameError("");
    setPlayerName(normalizePlayerName(value));
  }, []);

  const clearCountdownTimeout = useCallback(() => {
    if (countdownTimeoutRef.current !== undefined) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = undefined;
    }
  }, []);

  const scheduleCountdownFinish = useCallback(
    (delaySeconds: number) => {
      clearCountdownTimeout();
      countdownTimeoutRef.current = window.setTimeout(() => {
        const world = worldRef.current;
        finishCountdownWorld(world);
        syncHud(true);
        countdownTimeoutRef.current = undefined;
      }, Math.max(0, delaySeconds) * 1000);
    },
    [clearCountdownTimeout, syncHud],
  );

  useEffect(() => {
    return () => clearCountdownTimeout();
  }, [clearCountdownTimeout]);

  const startGame = useCallback(async () => {
    if (!assetsLoaded) return;
    if (!modeChosen) return;

    const currentWorld = worldRef.current;
    startMusic("normal");
    const runSession = await startRunSession();
    const nextWorld = createWorld(currentWorld.width, currentWorld.height, "countdown");

    activeRunSessionRef.current = runSession;
    nextWorld.countdownStartedAt = nextWorld.time;
    worldRef.current = nextWorld;
    inputRef.current = { left: false, right: false };
    lastFrameTimeRef.current = null;
    setRunResult(null);
    setSaveStatus("idle");
    setNameError("");
    scheduleCountdownFinish(countdownDuration);
    syncHud(true);
  }, [assetsLoaded, modeChosen, scheduleCountdownFinish, startMusic, startRunSession, syncHud]);

  useEffect(() => {
    if (!autoStartGuestRunRef.current) return;
    if (!assetsLoaded || !modeChosen || mode !== "guest" || worldRef.current.status !== "ready") return;

    autoStartGuestRunRef.current = false;
    void startGame();
  }, [assetsLoaded, mode, modeChosen, startGame]);

  useEffect(() => {
    const musicMode = getMusicModeForStage(hud.stage);

    if (hud.status === "paused") {
      pauseMusic();
      return;
    }

    if (hud.status === "playing" || hud.status === "countdown") {
      if (musicMode === "high") {
        switchToHighLevelMusic();
      } else {
        startMusic("normal");
      }
      return;
    }

    if (hud.status === "dead") {
      stopMusic();
    }
  }, [audioMuted, hud.stage, hud.status, pauseMusic, startMusic, stopMusic, switchToHighLevelMusic]);

  const returnToStartScreen = useCallback(() => {
    const currentWorld = worldRef.current;
    const nextWorld = createWorld(currentWorld.width, currentWorld.height, "ready");

    clearCountdownTimeout();
    activeRunSessionRef.current = null;
    autoStartGuestRunRef.current = false;
    setRunSessionMessage("");
    worldRef.current = nextWorld;
    inputRef.current = { left: false, right: false };
    activePointerIdRef.current = null;
    lastFrameTimeRef.current = null;
    setRunResult(null);
    setSaveStatus("idle");
    setNameError("");
    stopMusic();
    syncHud(true);
  }, [clearCountdownTimeout, stopMusic, syncHud]);

  const togglePause = useCallback(() => {
    const world = worldRef.current;

    if (world.status === "playing" || world.status === "countdown") {
      world.pausedFrom = world.status;
      world.status = "paused";
      world.bonusLabel = "PAUSED";
      world.noticeUntil = world.time + 999;
      clearCountdownTimeout();
      syncHud(true);
      return;
    }

    if (world.status === "paused") {
      world.status = world.pausedFrom ?? "playing";
      world.pausedFrom = undefined;
      world.bonusLabel = "";
      world.noticeUntil = world.time;
      if (world.status === "countdown") {
        scheduleCountdownFinish(countdownDuration - (world.time - world.countdownStartedAt));
      }
      syncHud(true);
    }
  }, [clearCountdownTimeout, scheduleCountdownFinish, syncHud]);

  const setDirection = useCallback((direction: keyof InputState, isActive: boolean) => {
    inputRef.current = {
      ...inputRef.current,
      [direction]: isActive,
    };
  }, []);

  const setPointerDirection = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const isLeftSide = clientX - rect.left < rect.width / 2;
    inputRef.current = {
      left: isLeftSide,
      right: !isLeftSide,
    };
  }, []);

  const stopPointerDirection = useCallback(() => {
    activePointerIdRef.current = null;
    inputRef.current = { left: false, right: false };
  }, []);

  const handleCanvasPointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      activePointerIdRef.current = event.pointerId;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events in tests may not have an active browser pointer.
      }
      setPointerDirection(event.clientX);
    },
    [setPointerDirection],
  );

  const handleCanvasPointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      setPointerDirection(event.clientX);
    },
    [setPointerDirection],
  );

  const handleCanvasPointerEnd = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      event.preventDefault();

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Keep fallback pointer control quiet for non-standard pointer events.
      }

      stopPointerDirection();
    },
    [stopPointerDirection],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let activeFrameMs = canvasFrameMsDesktop;
    let idleFrameMs = canvasIdleFrameMsDesktop;

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(300, Math.floor(rect.width || defaultWidth));
      const nextHeight = Math.max(460, Math.floor(rect.height || defaultHeight));
      const performanceProfile = getCanvasPerformanceProfile(nextWidth);
      const dpr = Math.min(window.devicePixelRatio || 1, performanceProfile.dprCap);
      activeFrameMs = performanceProfile.activeFrameMs;
      idleFrameMs = performanceProfile.idleFrameMs;

      const nextCanvasWidth = Math.floor(nextWidth * dpr);
      const nextCanvasHeight = Math.floor(nextHeight * dpr);

      if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
        canvas.width = nextCanvasWidth;
        canvas.height = nextCanvasHeight;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeWorld(worldRef.current, nextWidth, nextHeight);
      drawWorld(context, worldRef.current, assetsRef.current, selectedHead);
      syncHud(true);
    };

    syncCanvasSize();

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncCanvasSize);
    resizeObserver?.observe(canvas);

    const tick = (time: number) => {
      const world = worldRef.current;
      const isActiveRun = world.status === "playing" || world.status === "countdown";
      const targetFrameMs = isActiveRun ? activeFrameMs : idleFrameMs;

      if (lastFrameTimeRef.current !== null && time - lastFrameTimeRef.current < targetFrameMs) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const previousTime = lastFrameTimeRef.current ?? time;
      const deltaSeconds = Math.min(0.034, Math.max(0, (time - previousTime) / 1000));
      lastFrameTimeRef.current = time;

      updateWorld(world, inputRef.current, deltaSeconds, recordRunRef.current, playAudioCue);
      drawWorld(context, world, assetsRef.current, selectedHead);
      syncHud();

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver?.disconnect();
    };
  }, [playAudioCue, selectedHead, syncHud]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isTyping) return;

      const key = event.key.toLowerCase();

      if (event.key === "Escape" || key === "p") {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        setDirection("left", true);
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDirection("right", true);
      }

      if ((event.key === "Enter" || event.key === " ") && worldRef.current.status === "ready" && modeChosen) {
        event.preventDefault();
        startGame();
      }

      if ((event.key === "Enter" || event.key === " ") && worldRef.current.status === "dead") {
        event.preventDefault();
        returnToStartScreen();
      }

      if ((event.key === "Enter" || event.key === " ") && worldRef.current.status === "paused") {
        event.preventDefault();
        togglePause();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        setDirection("left", false);
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        setDirection("right", false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [modeChosen, returnToStartScreen, setDirection, startGame, togglePause]);

  const commitPlayerName = useCallback(() => {
    const displayName = getValidPlayerName(playerName);
    if (!displayName) {
      setNameError("NO URLS ON THE BOUNTY BOARD");
      return;
    }

    setPlayerName(displayName);
    setNameError("");
  }, [playerName]);

  const selectedHeadOption = getHeadOption(selectedHead);
  const result = runResult;
  const resultBestText = result
    ? result.previousBestToday > 0
      ? result.score > result.previousBestToday
        ? `NEW BEST BY ${formatMarketCap(result.score - result.previousBestToday)}`
        : `BEST TODAY ${formatMarketCap(result.previousBestToday)}`
      : "FIRST RUN TODAY"
    : "";
  const saveButtonLabel = saveStatus === "saving" ? "SAVING..." : runResult?.saved || saveStatus === "saved" ? "SAVED TO BOUNTY BOARD" : "SAVE TO BOUNTY BOARD";
  const effectiveUnlockScore = mode === "holder" ? bestUnlockScore : 0;
  const walletShort = walletAddress ? shortenWallet(walletAddress) : "";
  const isHolderMode = mode === "holder";
  const modeStatusText = isHolderMode
    ? `Holder mode${walletShort ? ` · ${walletShort}` : ""}`
    : "Guest run — scores are local only.";
  const canSaveRun = result?.mode === "holder" && isHolderMode && result.leaderboardEligible && Boolean(result.runId);
  const readyStartLabel = isHolderMode ? "START BOUNTY RUN" : "START GUEST RUN";
  const holderStatusLabel = isHolderMode
    ? `HOLDER VERIFIED · ${bobrosCount} BOBROS`
    : walletStatus === "denied"
      ? "NO BOBROS FOUND"
      : walletStatus === "error"
        ? "CHECK FAILED"
        : modeChosen && mode === "guest"
          ? "GUEST RUN READY"
          : "";

  return (
    <section className={styles.gameCabinet} aria-label="BOBRO TO THE MOON game frame">
      <div
        className={`${styles.gameHud} ${hud.multiplier > 1 ? styles.gameHudBoosted : ""} ${hud.milestoneActive ? styles.gameHudMilestone : ""} ${hud.statusLabels.includes("INTOXICATED") ? styles.gameHudIntoxicated : ""
          }`}
        aria-live="polite"
      >
        <span className={styles.hudCell}>
          BOBO MCAP <strong>{formatMarketCap(hud.score)}</strong>
        </span>
        <span className={styles.hudCell}>
          TODAY <strong>{formatMarketCap(hud.bestToday)}</strong>
        </span>
        <span className={styles.hudCell}>
          ZONE <strong>{hud.stage}</strong>
        </span>
        <span className={styles.hudCell}>
          MULTI <strong>{hud.multiplier}X</strong>
        </span>
        <span className={styles.hudCell}>
          HONEY <strong>x{hud.lives}/{honeyLifeMax}</strong>
        </span>
      </div>
      {hud.statusLabels.length > 0 ? (
        <div className={styles.statusBadges} aria-label="Active game statuses">
          {hud.statusLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}

      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.gameCanvas}
          aria-label="BOBRO TO THE MOON gameplay canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerEnd}
          onPointerCancel={handleCanvasPointerEnd}
          onLostPointerCapture={stopPointerDirection}
        />

        <button
          className={styles.soundToggle}
          type="button"
          onClick={toggleAudioMuted}
          aria-pressed={audioMuted}
          aria-label={audioMuted ? "Unmute game audio" : "Mute game audio"}
        >
          {audioMuted ? "MUTED" : "SOUND ON"}
        </button>

        {hud.bonusLabel ? <div className={styles.bonusNotice}>{hud.bonusLabel}</div> : null}

        {hud.status !== "playing" ? (
          <div className={`${styles.gameOverlay} ${hud.status === "dead" ? styles.deathOverlay : ""}`}>
            <span>
              {hud.status === "dead"
                ? "RUN ENDED"
                : hud.status === "paused"
                  ? "PAUSED"
                  : hud.status === "countdown"
                    ? "GET READY"
                    : modeChosen
                      ? modeStatusText
                      : "BOBROS GAME"}
            </span>
            <h2>
              {hud.status === "dead"
                ? hud.deathMessage
                : hud.status === "paused"
                  ? "HOLD"
                  : hud.status === "countdown"
                    ? hud.countdownText || "PUMP"
                    : "BOBRO TO THE MOON"}
            </h2>
            <p>
              {hud.status === "dead"
                ? result?.mode === "holder"
                  ? "SAVE YOUR WEEKLY RUN, FLEX THE RECEIPT, OR RUN IT BACK."
                  : "GUEST SCORE SAVED LOCALLY. FLEX THE RECEIPT OR RUN IT BACK."
                : hud.status === "paused"
                  ? "ESC OR P TO RESUME."
                  : hud.status === "countdown"
                    ? "PUMP IS COMING."
                    : "HOLDER SCORES ENTER THE WEEKLY BOUNTY BOARD."}
            </p>
            {hud.status === "ready" ? (
              <div className={styles.readyMenu} aria-label="BOBRO TO THE MOON start menu">
                <div className={styles.menuAccessPanel}>
                  <div className={styles.menuIntro}>
                    <span>HOLDER SCORES ENTER THE WEEKLY BOUNTY BOARD</span>
                    <div className={styles.prizeStrip} aria-label="Weekly contest rewards">
                      <b>#1 WINS BOBROS NFT</b>
                      <b>TOP 3 GET WHITELIST</b>
                      <b>HOLDER REWARDS</b>
                    </div>
                  </div>

                  <button
                    className={`${styles.startButton} ${modeChosen ? styles.bountyRunButton : styles.primaryRunButton}`}
                    type="button"
                    onClick={modeChosen ? startGame : startGuestRunFromMenu}
                    disabled={modeChosen && !assetsLoaded}
                  >
                    {modeChosen && !assetsLoaded ? "LOADING ASSETS" : modeChosen ? readyStartLabel : "START GUEST RUN"}
                  </button>

                  <div className={styles.holderTerminal} aria-label="Holder wallet check">
                    <label className={styles.walletEntry}>
                      <span>VERIFY HOLDER ADDRESS FOR WEEKLY REWARDS</span>
                      <div>
                        <input
                          type="text"
                          inputMode="text"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="PASTE HOLDER WALLET ADDRESS"
                          value={manualWalletAddress}
                          onChange={(event) => setManualWalletAddress(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void checkEnteredWalletAddress();
                            }
                          }}
                        />
                        <button
                          className={styles.startButton}
                          type="button"
                          onClick={checkEnteredWalletAddress}
                          disabled={walletStatus === "checking"}
                        >
                          {walletStatus === "checking" ? "..." : "VERIFY"}
                        </button>
                      </div>
                    </label>
                    <div className={styles.safetyLine}>
                      <span>Paste address only. No wallet connection.</span>
                    </div>
                    {holderStatusLabel ? <small className={styles.statusPill}>{holderStatusLabel}</small> : null}
                    {accessMessage ? (
                      <small className={walletStatus === "denied" || walletStatus === "error" ? styles.formError : styles.saveConfirmation}>{accessMessage}</small>
                    ) : null}
                  </div>
                </div>

                <div className={styles.menuSkinPanel}>
                  <div className={styles.skinSelector} aria-label="Choose your Bobro">
                    <strong className={styles.skinTitle}>SELECT BOBRO</strong>
                    <div className={styles.skinGrid}>
                      {headOptions.map((head) => {
                        const unlocked = mode === "holder" ? effectiveUnlockScore >= head.unlockAt : head.key === "bobro-head";

                        return (
                          <button
                            className={`${styles.skinButton} ${selectedHead === head.key ? styles.skinButtonSelected : ""} ${unlocked ? "" : styles.skinButtonLocked}`}
                            type="button"
                            key={head.key}
                            onClick={() => selectHead(head.key)}
                            aria-pressed={selectedHead === head.key}
                            disabled={!unlocked}
                          >
                            <img className={styles.skinPreview} src={head.src} alt="" aria-hidden="true" />
                            <span>{head.label}</span>
                            <small className={styles.skinUnlock}>
                              {unlocked
                                ? selectedHead === head.key
                                  ? "SELECTED"
                                  : mode === "holder"
                                    ? "UNLOCKED"
                                    : "DEFAULT"
                                : mode === "holder"
                                  ? formatMcap(head.unlockAt)
                                  : "LOCKED"}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {hud.status === "dead" && result ? (
              <div className={styles.resultPanel} aria-label="Run result">
                <dl>
                  <div>
                    <dt>BOBO MCAP</dt>
                    <dd>{formatMarketCap(result.score)}</dd>
                  </div>
                  <div>
                    <dt>ZONE</dt>
                    <dd>{result.stage}</dd>
                  </div>
                  <div>
                    <dt>SKIN</dt>
                    <dd>{result.skinLabel}</dd>
                  </div>
                  <div>
                    <dt>BEST</dt>
                    <dd>{resultBestText}</dd>
                  </div>
                  <div>
                    <dt>HONEY</dt>
                    <dd>{result.honeyLivesCollected} EXTRA / {result.livesUsed} SAVES</dd>
                  </div>
                </dl>
                {result.mode === "holder" ? (
                  <label className={styles.nameEntry}>
                    <span>ENTER YOUR NAME</span>
                    <input
                      type="text"
                      inputMode="text"
                      maxLength={16}
                      value={playerName}
                      onChange={(event) => updatePlayerName(event.target.value)}
                      onBlur={commitPlayerName}
                      aria-invalid={Boolean(nameError)}
                    />
                  </label>
                ) : (
                  <small className={styles.guestNote}>Holder wallet required for weekly rewards.</small>
                )}
                {nameError ? <small className={styles.formError}>{nameError}</small> : null}
                {runSessionMessage && !result.leaderboardEligible ? <small className={styles.formError}>{runSessionMessage}</small> : null}
                {result.mode === "holder" && result.leaderboardEligible ? (
                  <small className={styles.guestNote}>Weekly leaderboard entries are reviewed before rewards are distributed.</small>
                ) : null}
                {result.unlockedSkinLabel ? <small className={styles.unlockToast}>UNLOCKED {result.unlockedSkinLabel}</small> : null}
                {saveStatus === "saved" ? <small className={styles.saveConfirmation}>SAVED TO BOUNTY BOARD</small> : null}
                {saveStatus === "error" ? <small className={styles.formError}>SAVE FAILED. TRY AGAIN.</small> : null}
              </div>
            ) : null}
            {hud.status === "dead" && result ? (
              <div className={styles.deathActions}>
                <button className={styles.startButton} type="button" onClick={saveRunToBountyBoard} disabled={!canSaveRun || saveStatus === "saving" || result.saved}>
                  {canSaveRun ? saveButtonLabel : "HOLDER WALLET REQUIRED"}
                </button>
                <button className={styles.startButton} type="button" onClick={shareRunOnX}>
                  {result.saved ? "SHARE SCORE ON X" : "SHARE ON X"}
                </button>
                <button className={styles.startButton} type="button" onClick={downloadScoreCard}>
                  DOWNLOAD SCORE CARD
                </button>
                <button className={styles.startButton} type="button" onClick={returnToStartScreen}>
                  RUN AGAIN
                </button>
              </div>
            ) : hud.status !== "ready" && hud.status !== "countdown" && modeChosen ? (
              <button
                className={styles.startButton}
                type="button"
                onClick={hud.status === "paused" ? togglePause : startGame}
                disabled={!assetsLoaded && hud.status !== "paused"}
              >
                {!assetsLoaded ? "LOADING ASSETS" : hud.status === "dead" ? "RESTART" : hud.status === "paused" ? "RESUME" : "START RUN"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <span className={styles.gameCredit}>built by scream.vision</span>

      <div className={styles.gameActions}>
        <button
          className={styles.pauseButton}
          type="button"
          onClick={togglePause}
          disabled={hud.status === "ready" || hud.status === "dead"}
          aria-label={hud.status === "paused" ? "Resume game" : "Pause game"}
        >
          {hud.status === "paused" ? "RESUME" : "PAUSE"}
        </button>
      </div>

      <div className={styles.controlsHint}>A/D OR ARROWS. TAP LEFT/RIGHT HALF ON MOBILE.</div>
    </section>
  );
}

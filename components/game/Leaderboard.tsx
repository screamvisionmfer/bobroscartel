"use client";

import { useEffect, useState } from "react";
import styles from "./Game.module.css";

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  wallet: string;
  score: number;
  formattedMcap?: string;
  selectedSkin?: string;
  zone?: string;
  bobrosCount: number;
  submittedAt: string;
};

type LeaderboardResponse = {
  weekId: string;
  weekEndsAt?: string;
  serverTime?: string;
  scope: "weekly" | "all-time";
  playerBestToday: number;
  playerBestWeekly: number;
  entries: LeaderboardEntry[];
};

function formatMarketCap(score: number) {
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

function shortenWallet(wallet: string) {
  if (wallet.includes("...")) return wallet;
  if (wallet.length <= 12) return wallet;

  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function getResetCountdown(weekEndsAt?: string, serverTime?: string) {
  if (!weekEndsAt) return "--";

  const end = Date.parse(weekEndsAt);
  const start = serverTime ? Date.parse(serverTime) : Date.now();

  if (!Number.isFinite(end) || !Number.isFinite(start)) return "--";

  const totalMinutes = Math.max(0, Math.floor((end - start) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export default function Leaderboard({ refreshKey, walletAddress }: { refreshKey: number; walletAddress?: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTopTen, setShowTopTen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadLeaderboard = async () => {
      setIsLoading(true);

      try {
        const params = walletAddress ? `?wallet=${encodeURIComponent(walletAddress)}` : "";
        const response = await fetch(`/api/leaderboard${params}`, { cache: "no-store" });
        const data = (await response.json()) as LeaderboardResponse;

        if (!isCancelled) {
          setLeaderboard(data);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      isCancelled = true;
    };
  }, [refreshKey, walletAddress]);

  const visibleEntries = leaderboard?.entries.slice(0, showTopTen ? 10 : 5) ?? [];
  const resetCountdown = getResetCountdown(leaderboard?.weekEndsAt, leaderboard?.serverTime);

  return (
    <aside className={styles.leaderboard} aria-label="Weekly leaderboard">
      <div className={styles.leaderboardHeader}>
        <span className={styles.kicker}>Current Week: {leaderboard?.weekId ?? "LOADING"}</span>
        <h2>BOUNTY BOARD</h2>
        <small>Manual review before rewards</small>
      </div>

      <section className={styles.rewardPanel} aria-label="Weekly rewards">
        <h3>WEEKLY REWARDS</h3>
        <p>
          <span>#1</span>
          <strong>2 Bobros NFT</strong>
        </p>
        <p>
          <span>Top 3</span>
          <strong>Whitelist spots with special mint price</strong>
        </p>
      
      </section>

      <div className={styles.weekReset}>
        <span>Resets in</span>
        <strong>{resetCountdown}</strong>
      </div>

      <div className={styles.playerBest}>
        <span>{walletAddress ? "Your Holder Best This Week" : "Connect Holder Wallet"}</span>
        <strong>{walletAddress ? formatMarketCap(leaderboard?.playerBestWeekly ?? leaderboard?.playerBestToday ?? 0) : "LOCAL ONLY"}</strong>
      </div>

      <div className={styles.leaderboardList}>
        {isLoading ? (
          <div className={styles.leaderboardEmpty}>LOADING SUSPECTS...</div>
        ) : visibleEntries.length ? (
          visibleEntries.map((entry) => (
            <article className={styles.leaderboardRow} key={`${entry.wallet}-${entry.submittedAt}`}>
              <strong>#{entry.rank}</strong>
              <div>
                <span>{entry.displayName || "ANON BOBRO"}</span>
                <small>{shortenWallet(entry.wallet)} / {entry.bobrosCount} BOBRO HOLDER</small>
              </div>
              <b>{entry.formattedMcap || formatMarketCap(entry.score)}</b>
            </article>
          ))
        ) : (
          <div className={styles.leaderboardEmpty}>NO SCORES YET</div>
        )}
      </div>

      {!isLoading && leaderboard && leaderboard.entries.length > 5 ? (
        <button className={styles.leaderboardToggle} type="button" onClick={() => setShowTopTen((current) => !current)}>
          {showTopTen ? "SHOW TOP 5" : "VIEW TOP 10"}
        </button>
      ) : null}

      <section className={styles.rewardPanel} aria-label="Weekly rewards">
        <h3></h3>
        
        <strong>Rewards reset weekly. Entries are reviewed before rewards are distributed. Weekly Rewards only for Bobro holders.</strong>
      </section>
    </aside>
  );
}

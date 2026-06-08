"use client";

import { useEffect, useState } from "react";
import type { ChallengeRunData } from "./challengeTypes";
import BobroToTheMoon from "./BobroToTheMoon";
import Leaderboard from "./Leaderboard";
import styles from "./Game.module.css";

type ShellGameStatus = "loading" | "ready" | "countdown" | "playing" | "paused" | "dead";

export default function GameShell({ challengeRun = null }: { challengeRun?: ChallengeRunData | null }) {
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [holderWallet, setHolderWallet] = useState("");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [gameStatus, setGameStatus] = useState<ShellGameStatus>("loading");

  const leaderboard = <Leaderboard refreshKey={leaderboardVersion} walletAddress={holderWallet} />;
  const showMobileLeaderboardButton = gameStatus === "ready";

  useEffect(() => {
    if (gameStatus === "loading" || gameStatus === "paused" || gameStatus === "dead") {
      setLeaderboardOpen(false);
    }
  }, [gameStatus]);

  return (
    <main className={`page-shell ${styles.gamePage}`}>
      <div className="paper-grain" aria-hidden="true" />
      <div className={styles.gameClouds} aria-hidden="true">
        <img className={`${styles.gameCloud} ${styles.gameCloudOne}`} src="/assets/cloud.png" alt="" />
        <img className={`${styles.gameCloud} ${styles.gameCloudTwo}`} src="/assets/cloud.png" alt="" />
        <img className={`${styles.gameCloud} ${styles.gameCloudThree}`} src="/assets/cloud.png" alt="" />
      </div>

      <section className={styles.gameHeaderStrip}>
        <a className={styles.gameLogoLink} href="/" aria-label="Back to BOBROS home">
          <img src="/assets/logo.png" alt="BOBROS" />
        </a>
        <div>
          <h1>BOBRO TO THE MOON</h1>
          <p>Holder scores enter the weekly bounty board.</p>
        </div>
        <a className={styles.backLink} href="/">
          BACK TO SITE
        </a>
      </section>

      <section className={styles.gameLayout} aria-label="BOBRO TO THE MOON game section">
        <BobroToTheMoon
          onScoreSubmitted={() => setLeaderboardVersion((current) => current + 1)}
          onAccessChange={(access) => setHolderWallet(access.mode === "holder" ? access.wallet ?? "" : "")}
          onStatusChange={setGameStatus}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          challengeRun={challengeRun}
        />

        <div className={styles.leaderboardSidebar}>{leaderboard}</div>
      </section>

      {showMobileLeaderboardButton ? (
        <button
          className={styles.leaderboardMobileOpen}
          type="button"
          onClick={() => setLeaderboardOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={leaderboardOpen}
        >
          BOUNTY
        </button>
      ) : null}

      {leaderboardOpen ? (
        <div className={styles.leaderboardModal} role="dialog" aria-modal="true" aria-label="Weekly bounty board">
          <div className={styles.leaderboardModalBackdrop} onClick={() => setLeaderboardOpen(false)} aria-hidden="true" />
          <section className={styles.leaderboardModalPanel}>
            <div className={styles.leaderboardModalTop}>
              <strong>BOUNTY BOARD</strong>
              <button type="button" onClick={() => setLeaderboardOpen(false)}>
                X CLOSE
              </button>
            </div>
            <div className={styles.leaderboardModalScroll}>
              <Leaderboard refreshKey={leaderboardVersion} walletAddress={holderWallet} />
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

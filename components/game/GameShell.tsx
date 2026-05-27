"use client";

import { useState } from "react";
import BobroToTheMoon from "./BobroToTheMoon";
import Leaderboard from "./Leaderboard";
import styles from "./Game.module.css";

export default function GameShell() {
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [holderWallet, setHolderWallet] = useState("");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const leaderboard = <Leaderboard refreshKey={leaderboardVersion} walletAddress={holderWallet} />;

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
          <p>Weekly jumper. Holder scores hit the bounty board.</p>
        </div>
        <a className={styles.backLink} href="/">
          BACK TO SITE
        </a>
      </section>

      <section className={styles.gameLayout} aria-label="BOBRO TO THE MOON game section">
        <BobroToTheMoon
          onScoreSubmitted={() => setLeaderboardVersion((current) => current + 1)}
          onAccessChange={(access) => setHolderWallet(access.mode === "holder" ? access.wallet ?? "" : "")}
        />

        <div className={styles.leaderboardSidebar}>{leaderboard}</div>
      </section>

      <button
        className={styles.leaderboardMobileOpen}
        type="button"
        onClick={() => setLeaderboardOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={leaderboardOpen}
      >
        BOUNTY BOARD
      </button>

      {leaderboardOpen ? (
        <div className={styles.leaderboardModal} role="dialog" aria-modal="true" aria-label="Weekly bounty board">
          <div className={styles.leaderboardModalBackdrop} onClick={() => setLeaderboardOpen(false)} aria-hidden="true" />
          <section className={styles.leaderboardModalPanel}>
            <div className={styles.leaderboardModalTop}>
              <strong>BOUNTY BOARD</strong>
              <button type="button" onClick={() => setLeaderboardOpen(false)}>
                × BACK TO GAME
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

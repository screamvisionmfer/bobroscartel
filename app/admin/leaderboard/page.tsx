"use client";

import { useMemo, useState } from "react";

type AdminEntry = {
  rank: number;
  displayName?: string;
  wallet: string;
  score: number;
  formattedMcap?: string;
  bobrosCount: number;
  selectedSkin?: string;
  zone?: string;
  weekId?: string;
  createdAt?: string;
  submittedAt?: string;
  runDurationMs?: number;
  runId?: string;
  flags?: string[];
};

type LeaderboardResponse = {
  weekId: string;
  entries: AdminEntry[];
  reviewNote?: string;
};

type ResetResponse = {
  ok: boolean;
  scope: string;
  weekId: string;
  dryRun: boolean;
  storage: string;
  entriesFound: number;
  keysPlanned: string[];
  deletedKeys: string[];
  warning?: string;
};

const cardStyle: React.CSSProperties = {
  border: "2px solid #1d160f",
  borderRadius: 14,
  background: "rgba(255, 248, 223, 0.92)",
  boxShadow: "0 8px 0 rgba(0,0,0,.12)",
  padding: 16,
};

const buttonStyle: React.CSSProperties = {
  border: "2px solid #1d160f",
  borderRadius: 999,
  background: "#f2c73a",
  boxShadow: "0 5px 0 rgba(91,72,31,.28)",
  color: "#090909",
  cursor: "pointer",
  fontWeight: 900,
  padding: "10px 14px",
  textTransform: "uppercase",
};

export default function AdminLeaderboardPage() {
  const [secret, setSecret] = useState("");
  const [weekId, setWeekId] = useState("");
  const [limit, setLimit] = useState("50");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [resetPreview, setResetPreview] = useState<ResetResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const wallets = useMemo(() => {
    const seen = new Set<string>();
    return (data?.entries ?? [])
      .map((entry) => entry.wallet)
      .filter((wallet) => {
        if (!wallet || seen.has(wallet)) return false;
        seen.add(wallet);
        return true;
      });
  }, [data]);

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        "x-admin-secret": secret,
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(typeof json.error === "string" ? json.error : `Request failed: ${response.status}`);
    }

    return json as T;
  }

  async function loadTop() {
    if (!secret.trim()) {
      setMessage("Paste ADMIN_REVIEW_SECRET first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setResetPreview(null);

    try {
      const params = new URLSearchParams();
      if (weekId.trim()) params.set("weekId", weekId.trim());
      if (limit.trim()) params.set("limit", limit.trim());

      const result = await requestJson<LeaderboardResponse>(`/api/admin/leaderboard?${params.toString()}`);
      setData(result);
      setMessage(`Loaded ${result.entries.length} entries for ${result.weekId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  async function copyWallets() {
    if (wallets.length === 0) {
      setMessage("No wallets to copy.");
      return;
    }

    await navigator.clipboard.writeText(wallets.join("\n"));
    setMessage(`Copied ${wallets.length} wallets.`);
  }

  async function previewReset() {
    if (!secret.trim()) {
      setMessage("Paste ADMIN_REVIEW_SECRET first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({ dryRun: "true" });
      if (weekId.trim()) params.set("weekId", weekId.trim());
      const result = await requestJson<ResetResponse>(`/api/admin/leaderboard/reset?${params.toString()}`, {
        method: "POST",
        body: JSON.stringify({ scope: "weekly" }),
      });

      setResetPreview(result);
      setMessage(`Dry run: ${result.entriesFound} entries found for reset.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset preview failed.");
    } finally {
      setLoading(false);
    }
  }

  async function resetWeekly() {
    if (!resetPreview) {
      setMessage("Run dry-run first.");
      return;
    }

    const confirmText = `RESET ${resetPreview.weekId}`;
    const typed = window.prompt(`Type exactly: ${confirmText}`);

    if (typed !== confirmText) {
      setMessage("Reset cancelled.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      if (resetPreview.weekId) params.set("weekId", resetPreview.weekId);
      const result = await requestJson<ResetResponse>(`/api/admin/leaderboard/reset?${params.toString()}`, {
        method: "POST",
        body: JSON.stringify({ scope: "weekly" }),
      });

      setResetPreview(result);
      setData(null);
      setMessage(`Reset complete. Deleted ${result.deletedKeys.length} Redis keys.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        color: "#1d160f",
        background: "linear-gradient(180deg, #f9dd77, #8ec9f1)",
        fontFamily: '"Courier New", monospace',
      }}
    >
      <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={cardStyle}>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.9, textTransform: "uppercase" }}>
            Bobros leaderboard admin
          </h1>
          <p style={{ marginBottom: 0, fontWeight: 700 }}>
            Paste admin secret, load top wallets, copy them for whitelist, or reset the current weekly board.
          </p>
        </div>

        <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 900, textTransform: "uppercase" }}>
            ADMIN_REVIEW_SECRET
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              style={{ border: "2px solid #1d160f", borderRadius: 999, padding: "12px 14px", font: "inherit" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 10 }}>
            <input
              value={weekId}
              onChange={(event) => setWeekId(event.target.value)}
              placeholder="Optional weekId, e.g. 2026-W22. Empty = current week"
              style={{ border: "2px solid #1d160f", borderRadius: 999, padding: "12px 14px", font: "inherit" }}
            />
            <input
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              placeholder="Limit"
              style={{ border: "2px solid #1d160f", borderRadius: 999, padding: "12px 14px", font: "inherit" }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button style={buttonStyle} disabled={loading} onClick={loadTop}>Load top</button>
            <button style={buttonStyle} disabled={loading || wallets.length === 0} onClick={copyWallets}>Copy wallets</button>
            <button style={{ ...buttonStyle, background: "#fff8df" }} disabled={loading} onClick={previewReset}>Dry-run reset</button>
            <button style={{ ...buttonStyle, background: "#c94a37", color: "#fff8df" }} disabled={loading || !resetPreview} onClick={resetWeekly}>
              Reset weekly
            </button>
          </div>

          {message ? <strong>{message}</strong> : null}
        </div>

        {resetPreview ? (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Reset preview</h2>
            <p>
              Week: <b>{resetPreview.weekId}</b> · Entries: <b>{resetPreview.entriesFound}</b> · Storage: <b>{resetPreview.storage}</b>
            </p>
            <p style={{ marginBottom: 0 }}>Dry run planned keys: {resetPreview.keysPlanned.length}</p>
          </div>
        ) : null}

        {data ? (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Top wallets · {data.weekId}</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    {['Rank', 'Wallet', 'Score', 'Bobros', 'Skin', 'Zone', 'Flags'].map((head) => (
                      <th key={head} style={{ borderBottom: "2px solid #1d160f", padding: 8, textAlign: "left" }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={`${entry.rank}-${entry.wallet}-${entry.score}`}>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8 }}>{entry.rank}</td>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8, fontWeight: 900 }}>{entry.wallet}</td>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8 }}>{entry.formattedMcap ?? entry.score}</td>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8 }}>{entry.bobrosCount}</td>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8 }}>{entry.selectedSkin}</td>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8 }}>{entry.zone}</td>
                      <td style={{ borderBottom: "1px solid rgba(0,0,0,.2)", padding: 8 }}>{entry.flags?.join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

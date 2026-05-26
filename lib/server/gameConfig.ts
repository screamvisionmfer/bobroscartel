export const maxScore = 1_000_000_000_000;

export const allowedSkins = new Set(["bobro-head", "bobohazard", "high-bobo", "luchador", "skelebobo", "diamondbobo", "og-rekt"]);

export const allowedZones = new Set([
  "BACKALLEY",
  "ROOFTOPS",
  "SKY ASCENT",
  "CLOUDS",
  "STORM MARKET",
  "MOON",
  "CRYPTO ORBIT",
  "ASCENSION",
  "BILLIONAIRE CLUB",
  "BOBO HEAVEN",
]);

export const zoneMinimumScores: Record<string, number> = {
  BACKALLEY: 0,
  ROOFTOPS: 250_000,
  "SKY ASCENT": 1_000_000,
  CLOUDS: 5_000_000,
  "STORM MARKET": 25_000_000,
  MOON: 100_000_000,
  "CRYPTO ORBIT": 500_000_000,
  ASCENSION: 2_000_000_000,
  "BILLIONAIRE CLUB": 10_000_000_000,
  "BOBO HEAVEN": 69_000_000_000,
};

export function formatMcap(score: number) {
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

export function getUtcWeekId(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getUtcWeekEndsAt(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  const weekStart = new Date(utcDate);
  weekStart.setUTCDate(utcDate.getUTCDate() - day + 1);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  return weekEnd.toISOString();
}

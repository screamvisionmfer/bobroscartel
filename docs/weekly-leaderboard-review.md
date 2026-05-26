# Weekly Leaderboard Review

This game uses a no-sign leaderboard flow. Players do not sign messages or transactions, so weekly rewards must be manually reviewed before distribution.

## Required Server Env Vars

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ADMIN_REVIEW_SECRET`

Do not prefix these with `NEXT_PUBLIC_`. Do not share `ADMIN_REVIEW_SECRET`.

## Public Leaderboard

Current weekly leaderboard:

```sh
curl https://www.bobroscartel.lol/api/leaderboard
```

All-time leaderboard:

```sh
curl "https://www.bobroscartel.lol/api/leaderboard?scope=all-time"
```

The public API only returns clean display fields. It does not expose run IDs, validation notes, Redis keys, or admin review data.

## Admin Review

Current week:

```sh
curl -H "x-admin-secret: $ADMIN_REVIEW_SECRET" \
  "https://www.bobroscartel.lol/api/admin/leaderboard"
```

Specific week:

```sh
curl -H "x-admin-secret: $ADMIN_REVIEW_SECRET" \
  "https://www.bobroscartel.lol/api/admin/leaderboard?weekId=2026-W22&limit=100"
```

The admin route returns review-only fields such as wallet, score, Bobros count, selected skin, zone, week ID, created time, run duration, run ID, and simple flags.

## Review Notes

- Rewards are manually reviewed before distribution.
- The no-sign flow does not cryptographically prove the player controls the submitted wallet.
- The server re-checks Bobros holder status before saving a holder score.
- Run sessions are single-use and expire automatically.
- Keep `ADMIN_REVIEW_SECRET` private.
- If Redis env vars are missing in production, prize leaderboard reads/writes should fail safely rather than silently using memory.

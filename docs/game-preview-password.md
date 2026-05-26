# Game Preview Password Gate

The `/game` preview and game leaderboard APIs are temporarily protected with HTTP Basic Auth while production Redis and leaderboard review are tested.

## Required Env Var

- `GAME_PREVIEW_PASSWORD`

Do not prefix this with `NEXT_PUBLIC_`. Do not put it in client code.

## Protected Routes

- `/game`
- `/api/run`
- `/api/score`
- `/api/leaderboard`

The homepage `/`, static assets, images, `/api/check-holder`, and `/api/admin/leaderboard` are not covered by this gate. The admin leaderboard keeps its separate `ADMIN_REVIEW_SECRET`.

## Access

Open:

```txt
https://www.bobroscartel.lol/game
```

When the browser asks for Basic Auth credentials, enter any username and the value of `GAME_PREVIEW_PASSWORD` as the password.

API example:

```sh
curl -u "bobros:$GAME_PREVIEW_PASSWORD" \
  "https://www.bobroscartel.lol/api/leaderboard"
```

## Missing Password Behavior

- Development: protected routes are allowed and the server logs a warning.
- Production: protected routes return `401` instead of becoming public.

## Vercel

Set `GAME_PREVIEW_PASSWORD` in the Vercel project environment variables for Production and Preview deployments, then redeploy.

## Disable Before Public Launch

Remove the protected paths from `middleware.ts`, delete the middleware gate, or change the production behavior intentionally before opening `/game` publicly.

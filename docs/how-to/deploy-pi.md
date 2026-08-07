# Deploy to Raspberry Pi

The app runs on a Raspberry Pi 4 behind a Cloudflare Tunnel. Both the Pi and Vercel share the same Supabase Postgres database.

**Pi local IP:** `<pi-local-ip>` (on the home LAN)  
**Public URL:** `recipai.pp.ua` (via Cloudflare Tunnel)  
**Process manager:** PM2  
**Runtime:** Bun

---

Pi deploy is also the last step of `scripts/release.sh --mode=local` (see [deploy-vercel.md](deploy-vercel.md#local-release-pipeline-github-actions-unavailable)) — the fallback path when GitHub Actions can't run the pipeline itself.

## SSH in

```bash
ssh recipai@recipai.local
```

If mDNS is unavailable, replace `recipai.local` with the Pi's local IP.

---

## Deploy (pull + rebuild)

The Pi has a `~/deploy.sh` wrapper for releases that do not contain a database migration:

```bash
ssh recipai@recipai.local '~/deploy.sh'
```

That's the recommended path day-to-day. Before using it, check whether the release adds a file under `db/migrations/`. If it does, use the safe manual sequence below and run the migration before starting the new application code. The wrapper's ordinary pull/build/restart sequence is:

```bash
cd ~/recipai
git pull
bun install --frozen-lockfile
bun run build
pm2 restart recipai
```

For a release with a Drizzle migration, load a direct Supabase connection URL (port 5432) into `SUPABASE_MIGRATION_URL`. If the Pi cannot reach the direct IPv6 endpoint, use the Supavisor **session** pooler (port 5432). Then deploy in this order:

```bash
cd ~/recipai
git pull
bun install --frozen-lockfile
DATABASE_URL="$SUPABASE_MIGRATION_URL" bun run db:migrate
bun run build
pm2 restart recipai
```

The command-level `DATABASE_URL` overrides the transaction-pooler runtime value in `.env.local`. Because Pi and Vercel share one database, apply each migration once, before either deployment starts code that depends on it.

---

## PM2 commands

```bash
pm2 status              # check if recipai is running
pm2 logs recipai        # stream logs
pm2 restart recipai     # restart after deploy
pm2 stop recipai        # stop
pm2 start recipai       # start
```

---

## Troubleshooting

**`bun: command not found` in PM2**  
PM2 may not have Bun in its PATH. Check the ecosystem config:
```bash
cat ~/recipai/ecosystem.config.js
```
The `interpreter` field should point to the full Bun path (e.g. `/home/recipai/.bun/bin/bun`).

**Port conflict**  
The app listens on port `3000` by default. Check with `lsof -i :3000`.

**Cloudflare Tunnel not routing**  
Tunnel config lives in `~/.cloudflared/config.yml`. Restart with:
```bash
sudo systemctl restart cloudflared
```

**Generated service worker appears in Git output**

`public/sw.js` is regenerated on every build and should remain ignored. Confirm whether it is unexpectedly tracked:
```bash
git ls-files public/sw.js
```

No output is the expected result. If it is tracked, fix that in the repository rather than forcing the deployment checkout past it.

---

## Telegram webhook

The Telegram bot webhook can only point to **one host** at a time — the last `setWebhook` call wins. To point the webhook at the Pi:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://recipai.pp.ua/api/telegram-bot" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Verify the current webhook host:
```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

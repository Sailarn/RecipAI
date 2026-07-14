# Deploy to Raspberry Pi

The app runs on a Raspberry Pi 4 behind a Cloudflare Tunnel. Both the Pi and Vercel share the same Supabase Postgres database.

**Pi local IP:** `<pi-local-ip>` (on the home LAN)  
**Public URL:** `recipai.pp.ua` (via Cloudflare Tunnel)  
**Process manager:** PM2  
**Runtime:** Bun

---

## SSH in

```bash
ssh pi@<pi-local-ip>
```

---

## Deploy (pull + rebuild)

The Pi has a `~/deploy.sh` wrapper that runs the full pull/build/restart sequence in one shot:

```bash
ssh recipai@recipai.local '~/deploy.sh'
```

That's the recommended path day-to-day. What it does under the hood (useful for troubleshooting a failed deploy step-by-step):

```bash
cd ~/recipai
git pull
bun install --frozen-lockfile
bun run build
pm2 restart recipai
```

If there are Drizzle migrations to run:
```bash
bun run db:migrate
```

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
The `interpreter` field should point to the full Bun path (e.g. `/home/pi/.bun/bin/bun`).

**Port conflict**  
The app listens on port `3000` by default. Check with `lsof -i :3000`.

**Cloudflare Tunnel not routing**  
Tunnel config lives in `~/.cloudflared/config.yml`. Restart with:
```bash
sudo systemctl restart cloudflared
```

**Git conflicts on pull**  
`public/sw.js` is regenerated on every build and is gitignored, but if it somehow got committed upstream, reset it:
```bash
git checkout -- public/sw.js
```

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

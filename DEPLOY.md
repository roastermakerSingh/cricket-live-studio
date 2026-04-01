# 🚀 Free Deployment — CricketLive Studio v2.0
## 100% Free: Render.com (server) + Netlify (client)

---

## Architecture

| Part | Host | Cost |
|------|------|------|
| `server/` — Node.js + Socket.IO | **Render.com** free tier | **$0** |
| `client/` — React app | **Netlify** free tier | **$0** |

---

## Step 1 — Push to GitHub

```bash
cd cricket-v2
git init && git add .
git commit -m "CricketLive Studio v2"
git remote add origin https://github.com/YOUR_USERNAME/cricket-live-studio.git
git push -u origin main
```

---

## Step 2 — Deploy Server on Render.com

1. Go to https://render.com → Sign up free (no credit card)
2. Click **New + → Web Service** → connect your GitHub repo
3. Fill in:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`
4. Click **Create Web Service**
5. Copy your URL: `https://cricket-live-server.onrender.com`

---

## Step 3 — Deploy Client on Netlify

1. Open `client/.env.production` and set:
   ```
   REACT_APP_SERVER_URL=https://cricket-live-server.onrender.com
   ```
2. Commit + push
3. Go to https://netlify.com → New site → Import from GitHub
4. Netlify reads `netlify.toml` automatically (base: `client`, build: `npm run build`)
5. Copy your URL: `https://your-app.netlify.app`

---

## Step 4 — Link the two services

In Render → your service → **Environment** tab, add:
```
CLIENT_URL = https://your-app.netlify.app
```
Render redeploys automatically. Now QR codes and watch links point to your live app.

---

## How video streaming works (v2 — no WebRTC for viewers)

The old WebRTC peer-to-peer approach failed across the internet (no TURN server).

**New approach — Socket.IO frame relay:**
1. Studio draws each video frame onto a hidden canvas (~12fps)
2. Score overlay is burned directly into the canvas
3. Frame encoded as JPEG (~50-80KB) → sent via `socket.emit('video:frame')`
4. Server fans the frame out to every viewer socket in the room
5. Viewers decode with `createImageBitmap()` and paint onto a `<canvas>` via `requestAnimationFrame`

Works 100% across the internet. No WebRTC, no TURN servers, no NAT issues.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not create match room" | Check `REACT_APP_SERVER_URL` in `.env.production`. Wait 30s for Render cold start. |
| Watch page blank / no video | Make sure broadcaster clicked "Start Camera". Check console for `video:frame` events. |
| QR shows localhost | Add `CLIENT_URL` in Render environment variables. |
| Render slow to start | Free tier spins down after 15min idle. Upgrade to Starter ($7/mo) for always-on. |

---

## Total Cost: **$0/month** 🎉

# 🏏 CricketLive Studio v2.0

A full-stack, real-time cricket live streaming and scoring platform with:
- 📱 **Mobile camera via QR code** (WebRTC peer-to-peer)
- 📺 **Shareable live watch link** (viewers watch in browser)
- 🎯 **TV-style score overlay** on live video
- 🏏 **Ball-by-ball scoring panel**
- 💾 **Download recordings** to device
- 🔴 **Real-time score sync** to all viewers

---

## Architecture

```
cricket-v2/
├── server/              Node.js + Socket.IO signaling server
│   └── index.js         WebRTC signaling + room management + QR generation
└── client/              React app (all 4 pages)
    └── src/
        ├── pages/
        │   ├── SetupPage.js      Match configuration & room creation
        │   ├── StudioPage.js     Main broadcaster desktop studio
        │   ├── MobilePage.js     Mobile camera page (opened via QR)
        │   └── WatchPage.js      Viewer watch page (shareable link)
        └── components/
            ├── ScoreOverlay.js   TV-style broadcast score overlay
            ├── ScoringPanel.js   Ball-by-ball scoring controls
            ├── CommentaryFeed.js Auto-generated commentary
            ├── MobileConnectModal.js  QR code for mobile camera
            └── ShareModal.js    QR code + link for viewers
```

---

## Quick Start

### 1. Install dependencies

```bash
# From the root folder
npm run install:all
```

Or manually:
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Start both server and client

```bash
# From root — starts both simultaneously
npm start
```

Or separately:
```bash
# Terminal 1 — signaling server (port 3001)
npm run start:server

# Terminal 2 — React client (port 3000)
npm run start:client
```

### 3. Open the app

```
http://localhost:3000
```

---

## How to Use

### Step 1 — Setup Match
- Choose teams, format (T20/ODI/Test), venue and toss
- Click **LAUNCH LIVE STUDIO** — creates a unique room

### Step 2 — Studio Page (Desktop/Laptop)
The studio has two columns:

**Left — Video Feed**
- **Use This Device** — starts your laptop/desktop webcam
- **📱 Mobile QR** — shows a QR code to connect your phone as camera

**Right — Scoring Panel**
- Switch between **INN 1 / INN 2** innings
- Score tab: tap runs (0–6), extras, or WICKET for each ball
- Click ✎ on player names to rename batters & bowler
- Commentary tab: auto-generated ball-by-ball feed

### Step 3 — Connect Mobile Camera (Optional)
1. Click **📱 Mobile QR** in the studio
2. Scan the QR code with your phone (same Wi-Fi network)
3. Allow camera and microphone permissions on the phone
4. Your phone's camera streams live to the desktop studio via WebRTC

### Step 4 — Share Watch Link
1. Click **🔗 Share Watch Link** in the studio header
2. Copy the link or show the QR code to viewers
3. Anyone opens the link → sees the live video + score overlay in their browser
4. Score updates propagate in real time to all viewers

### Step 5 — Record & Download
- Click **● Record** to start recording the active camera
- Click **⏹ Stop** to save — the file appears in the recordings list below the video
- Click **⬇ Download** to save as `.webm` to your device

---

## Pages / Routes

| Route | Description |
|-------|-------------|
| `/` | Match setup screen |
| `/studio/:roomId` | Broadcaster studio (scoring + camera) |
| `/mobile/:roomId` | Mobile camera page — opened via QR scan |
| `/watch/:roomId` | Viewer page — share this link! |

---

## Sharing Outside Local Network

By default, links work on your **local Wi-Fi network**.

To share with people **outside your network**:

### Option A — ngrok (easiest)
```bash
# Install ngrok: https://ngrok.com
ngrok http 3001    # tunnel to server
ngrok http 3000    # tunnel to client (separate terminal)
```
Use the ngrok HTTPS URLs as your watch link.

### Option B — Set PUBLIC_HOST
```bash
PUBLIC_HOST=your.public.ip.address node server/index.js
```

### Option C — Deploy to a VPS
Deploy `server/` to any Node.js host (Railway, Render, Fly.io).
Set `REACT_APP_SERVER_URL` in the client to your deployed server URL.

---

## Environment Variables

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `PUBLIC_HOST` | auto-detected local IP | Host used in watch links |

### Client
| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_SERVER_URL` | `http://localhost:3001` | Signaling server URL |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Signaling Server | Node.js, Express, Socket.IO |
| QR Generation | `qrcode` npm package |
| Client Framework | React 18, React Router v6 |
| Real-time Comms | Socket.IO client |
| Camera Relay | WebRTC (getUserMedia + RTCPeerConnection) |
| Video Recording | MediaRecorder API |
| Fonts | Bebas Neue, Syne, JetBrains Mono |

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge | Mobile Chrome |
|---------|--------|---------|--------|------|---------------|
| Camera | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebRTC | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recording | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| QR Scan | N/A | N/A | N/A | N/A | ✅ |

> **Note:** Camera and WebRTC require **HTTPS in production**. `localhost` works without HTTPS during development.

---

## License
MIT — free to use and modify.

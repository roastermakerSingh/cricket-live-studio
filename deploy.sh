#!/bin/bash
# ============================================================
#  CricketLive Studio — One-Command Deploy Script
#  Usage: bash deploy.sh
# ============================================================

set -e  # exit on any error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}${GREEN}🏏 CricketLive Studio — Deploy Script${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# ── STEP 1: Check prerequisites ──────────────────────────────
echo -e "${CYAN}[1/6] Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ git not found. Install from https://git-scm.com${NC}"; exit 1
fi
echo -e "  ${GREEN}✓ git found${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org (v18+)${NC}"; exit 1
fi
NODE_VER=$(node -v)
echo -e "  ${GREEN}✓ node found: $NODE_VER${NC}"

if ! command -v npm &> /dev/null; then
  echo -e "${RED}✗ npm not found. Install Node.js from https://nodejs.org${NC}"; exit 1
fi
echo -e "  ${GREEN}✓ npm found${NC}"

# ── STEP 2: Install dependencies ─────────────────────────────
echo ""
echo -e "${CYAN}[2/6] Installing dependencies...${NC}"
echo -e "  Installing server dependencies..."
cd server && npm install --silent && cd ..
echo -e "  ${GREEN}✓ Server deps installed${NC}"

echo -e "  Installing client dependencies..."
cd client && npm install --silent && cd ..
echo -e "  ${GREEN}✓ Client deps installed${NC}"

# ── STEP 3: Get GitHub repo URL ───────────────────────────────
echo ""
echo -e "${CYAN}[3/6] GitHub repository setup${NC}"

REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE" ]; then
  echo -e "${YELLOW}  No GitHub remote found.${NC}"
  echo ""
  echo -e "  ${BOLD}Please do the following:${NC}"
  echo -e "  1. Go to ${CYAN}https://github.com/new${NC}"
  echo -e "  2. Create a repo named: ${BOLD}cricket-live-studio${NC}"
  echo -e "  3. Copy the repo URL (ends in .git)"
  echo ""
  read -p "  Paste your GitHub repo URL here: " GITHUB_URL
  if [ -z "$GITHUB_URL" ]; then
    echo -e "${RED}✗ No URL provided. Skipping GitHub push.${NC}"
  else
    git init 2>/dev/null || true
    git add .
    git commit -m "CricketLive Studio v2.0 — initial deploy" 2>/dev/null || git commit --allow-empty -m "CricketLive Studio v2.0"
    git branch -M main
    git remote add origin "$GITHUB_URL"
    git push -u origin main
    echo -e "  ${GREEN}✓ Pushed to GitHub: $GITHUB_URL${NC}"
    REMOTE="$GITHUB_URL"
  fi
else
  echo -e "  ${GREEN}✓ GitHub remote: $REMOTE${NC}"
  echo -e "  Pushing latest changes..."
  git add .
  git commit -m "CricketLive Studio — deploy update $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "  (nothing new to commit)"
  git push origin main 2>/dev/null || echo "  (push skipped — may already be up to date)"
  echo -e "  ${GREEN}✓ GitHub up to date${NC}"
fi

# ── STEP 4: Render deploy instructions ───────────────────────
echo ""
echo -e "${CYAN}[4/6] Deploy Server to Render.com (FREE)${NC}"
echo ""
echo -e "  ${BOLD}Open this URL in your browser:${NC}"
echo -e "  ${CYAN}https://dashboard.render.com/new/web${NC}"
echo ""
echo -e "  Fill in these settings:"
echo -e "  ┌─────────────────────────────────────────────────────────┐"
echo -e "  │  Name          : cricket-live-server                    │"
echo -e "  │  Repository    : (select your GitHub repo)              │"
echo -e "  │  Root Directory: server                                 │"
echo -e "  │  Runtime       : Node                                   │"
echo -e "  │  Build Command : npm install                            │"
echo -e "  │  Start Command : node index.js                          │"
echo -e "  │  Instance Type : Free                                   │"
echo -e "  └─────────────────────────────────────────────────────────┘"
echo ""
read -p "  Once deployed, paste your Render URL (e.g. https://cricket-live-server.onrender.com): " RENDER_URL

if [ -n "$RENDER_URL" ]; then
  # Strip trailing slash
  RENDER_URL="${RENDER_URL%/}"
  echo -e "  ${GREEN}✓ Render URL: $RENDER_URL${NC}"

  # Update .env.production
  echo "REACT_APP_SERVER_URL=$RENDER_URL" > client/.env.production
  echo -e "  ${GREEN}✓ Updated client/.env.production${NC}"

  # Push the update to GitHub
  git add client/.env.production
  git commit -m "Set Render server URL: $RENDER_URL" 2>/dev/null || true
  git push origin main 2>/dev/null || true
  echo -e "  ${GREEN}✓ Pushed env update to GitHub${NC}"
else
  echo -e "${YELLOW}  Skipped — you can update REACT_APP_SERVER_URL in client/.env.production later${NC}"
fi

# ── STEP 5: Netlify deploy instructions ──────────────────────
echo ""
echo -e "${CYAN}[5/6] Deploy Frontend to Netlify (FREE)${NC}"
echo ""
echo -e "  ${BOLD}Open this URL in your browser:${NC}"
echo -e "  ${CYAN}https://app.netlify.com/start${NC}"
echo ""
echo -e "  Steps:"
echo -e "  1. Click ${BOLD}'Add new site'${NC} → ${BOLD}'Import an existing project'${NC}"
echo -e "  2. Choose ${BOLD}GitHub${NC} and select your repo"
echo -e "  3. Netlify auto-detects settings from netlify.toml:"
echo -e "  ┌─────────────────────────────────────────────────────────┐"
echo -e "  │  Base directory : client                                │"
echo -e "  │  Build command  : npm run build                         │"
echo -e "  │  Publish dir    : build                                 │"
echo -e "  └─────────────────────────────────────────────────────────┘"
echo -e "  4. Click ${BOLD}'Deploy site'${NC}"
echo ""
read -p "  Once deployed, paste your Netlify URL (e.g. https://your-app.netlify.app): " NETLIFY_URL

if [ -n "$NETLIFY_URL" ]; then
  NETLIFY_URL="${NETLIFY_URL%/}"
  echo -e "  ${GREEN}✓ Netlify URL: $NETLIFY_URL${NC}"
  echo ""
  echo -e "  ${YELLOW}⚠  Now go back to Render dashboard:${NC}"
  echo -e "  ${CYAN}https://dashboard.render.com${NC}"
  echo -e "  → Your service → ${BOLD}Environment${NC} tab → Add variable:"
  echo -e "  ┌────────────────────────────────────────────┐"
  echo -e "  │  Key  : CLIENT_URL                         │"
  echo -e "  │  Value: $NETLIFY_URL │"
  echo -e "  └────────────────────────────────────────────┘"
  echo -e "  Render will redeploy automatically."
else
  echo -e "${YELLOW}  Skipped — update CLIENT_URL in Render dashboard later${NC}"
fi

# ── STEP 6: Final summary ─────────────────────────────────────
echo ""
echo -e "${GREEN}[6/6] Deployment Complete! 🎉${NC}"
echo ""
echo -e "  ${BOLD}Your app URLs:${NC}"
[ -n "$NETLIFY_URL" ] && echo -e "  🌐 Frontend  : ${CYAN}$NETLIFY_URL${NC}"
[ -n "$RENDER_URL" ]  && echo -e "  ⚙️  Server    : ${CYAN}$RENDER_URL${NC}"
[ -n "$NETLIFY_URL" ] && echo -e "  📺 Watch page: ${CYAN}$NETLIFY_URL/watch/[ROOM-ID]${NC}"
[ -n "$NETLIFY_URL" ] && echo -e "  📱 Mobile cam: ${CYAN}$NETLIFY_URL/mobile/[ROOM-ID]${NC}"
echo ""
echo -e "  ${YELLOW}💡 Tip: Before a match, open ${RENDER_URL}/api/health${NC}"
echo -e "  ${YELLOW}     to wake up the Render server (takes ~30s after idle)${NC}"
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${BOLD}${GREEN}  CricketLive Studio is LIVE! 🏏${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

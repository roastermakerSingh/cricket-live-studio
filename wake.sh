#!/bin/bash
# ── Wake up the Render server before a match ──────────────────
# Render free tier sleeps after 15 min idle. Run this before a match.

SERVER_URL="${1:-https://cricket-live-server.onrender.com}"
HEALTH_URL="$SERVER_URL/api/health"

echo ""
echo "🏏 Waking up CricketLive server..."
echo "   URL: $HEALTH_URL"
echo ""

MAX_TRIES=12
WAIT=5
SUCCESS=false

for i in $(seq 1 $MAX_TRIES); do
  echo -n "   Attempt $i/$MAX_TRIES... "
  HTTP_CODE=$(curl -s -o /tmp/cricket_health.json -w "%{http_code}" --max-time 15 "$HEALTH_URL" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    STATUS=$(cat /tmp/cricket_health.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "ok")
    echo "✅ Server is awake! (status: $STATUS)"
    SUCCESS=true
    break
  else
    echo "⟳ Still starting... (HTTP $HTTP_CODE)"
    sleep $WAIT
  fi
done

echo ""
if $SUCCESS; then
  echo "✅ Server is ready! You can now open the app."
  echo "   $SERVER_URL" | sed 's|/api/health||'
else
  echo "⚠️  Server took longer than expected."
  echo "   Try opening $SERVER_URL/api/health in your browser."
fi
echo ""

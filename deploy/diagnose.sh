#!/bin/bash
# Nothing — Quick diagnostics
set -uo pipefail

echo ""
echo "═══ Nothing Diagnostics ═══"
echo ""

# ── Containers ──
echo "── Containers ──"
for svc in server db mail caddy web; do
  STATUS=$(docker inspect "deploy-${svc}-1" --format '{{.State.Status}}' 2>/dev/null || echo "missing")
  printf "  %-8s %s\n" "$svc" "$STATUS"
done

# ── .env ──
echo ""
echo "── Config ──"
ENV_FILE=~/Nothing/deploy/.env
if [ -f "$ENV_FILE" ]; then
  DOMAIN=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)
  ADMIN_USER=$(grep 'MAIL_ADMIN_USER' "$ENV_FILE" | cut -d= -f2)
  ADMIN_PASS=$(grep 'MAIL_ADMIN_PASS' "$ENV_FILE" | cut -d= -f2)
  echo "  DOMAIN=$DOMAIN"
  echo "  MAIL_ADMIN_USER=$ADMIN_USER"
  echo "  MAIL_ADMIN_PASS=***${ADMIN_PASS: -4}"
else
  echo "  .env not found!"
  exit 1
fi

# ── Server API ──
echo ""
echo "── Server API ──"
HEALTH=$(curl -sf http://localhost/health 2>/dev/null || curl -sf http://localhost:3000/health 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q 'ok'; then
  echo "  /health: OK"
else
  echo "  /health: FAIL"
fi

# ── Stalwart config ──
echo ""
echo "── Stalwart config ──"
CONFIG=$(docker exec deploy-mail-1 cat /opt/stalwart-mail/etc/config.json 2>/dev/null || echo "N/A")
echo "  config.json: $CONFIG"

DB_PATH=$(echo "$CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('path','?'))" 2>/dev/null || echo "?")
echo "  DB path: $DB_PATH"
if [[ "$DB_PATH" == /tmp* ]]; then
  echo "  ⚠ WARNING: DB in /tmp — will be lost on container recreate!"
fi

# ── Stalwart ports ──
echo ""
echo "── Stalwart port scan ──"
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "")
if [ -z "$MAIL_IP" ]; then
  echo "  Cannot get mail container IP"
else
  echo "  Mail IP: $MAIL_IP"
  for port in 443 8080 8443 80 25 465 587 993; do
    HTTPS_CODE=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 2 "https://$MAIL_IP:$port/.well-known/jmap" 2>/dev/null || echo "0")
    HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://$MAIL_IP:$port/.well-known/jmap" 2>/dev/null || echo "0")
    if [ "$HTTPS_CODE" != "0" ] || [ "$HTTP_CODE" != "0" ]; then
      echo "  :$port  https=$HTTPS_CODE  http=$HTTP_CODE"
    else
      echo "  :$port  --"
    fi
  done
fi

# ── JMAP session test ──
echo ""
echo "── JMAP session ──"
if [ -n "$MAIL_IP" ]; then
  for proto_port in "https://$MAIL_IP:443" "http://$MAIL_IP:8080" "https://$MAIL_IP:8443"; do
    RES=$(curl -sk -u "$ADMIN_USER:$ADMIN_PASS" --connect-timeout 3 "$proto_port/.well-known/jmap" 2>/dev/null)
    if echo "$RES" | grep -q 'primaryAccounts'; then
      echo "  ✓ JMAP OK at $proto_port"
      echo "  $(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'accountId: {list(d.get(\"primaryAccounts\",{}).values())[0] if d.get(\"primaryAccounts\") else \"?\"}')" 2>/dev/null)"
      break
    else
      echo "  ✗ $proto_port — no response"
    fi
  done
fi

# ── Server → Stalwart ──
echo ""
echo "── Server → Stalwart (via API) ──"
MAIL_STATUS=$(curl -sf http://localhost/api/admin/mail/status 2>/dev/null || echo "")
if echo "$MAIL_STATUS" | grep -q 'ok'; then
  echo "  ✓ Connected"
else
  echo "  ✗ Not connected"
  echo "  Response: $MAIL_STATUS"
fi

# ── Recent server errors ──
echo ""
echo "── Server logs (errors only, last 50) ──"
docker logs deploy-server-1 --tail 50 2>&1 | grep -iE '(error|fail|crash|exception)' | tail -10 || echo "  (none)"

echo ""
echo "═══ Done ═══"
echo ""

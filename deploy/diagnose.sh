#!/bin/bash
# Nothing — Quick diagnostics
set -uo pipefail

echo ""
echo "═══ Nothing Diagnostics ═══"
echo ""

# ── Load config ──
ENV_FILE=~/Nothing/deploy/.env
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi
ADMIN_PASS=$(grep MAIL_ADMIN_PASS "$ENV_FILE" | cut -d= -f2)
ADMIN_USER=$(grep MAIL_ADMIN_USER "$ENV_FILE" | cut -d= -f2)
DOMAIN=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "")

# ── 1. Containers ──
echo "── 1. Containers ──"
for svc in server db mail caddy web; do
  STATUS=$(docker inspect "deploy-${svc}-1" --format '{{.State.Status}}' 2>/dev/null || echo "missing")
  printf "  %-8s %s\n" "$svc" "$STATUS"
done

# ── 2. Server API ──
echo ""
echo "── 2. Server API ──"
HEALTH=$(curl -sf http://localhost/health 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q 'ok'; then
  echo "  /health: OK"
else
  echo "  /health: FAIL"
fi

# ── 3. Stalwart JMAP ──
echo ""
echo "── 3. Stalwart JMAP ──"
if [ -z "$MAIL_IP" ]; then
  echo "  Cannot get mail container IP"
else
  echo "  Mail IP: $MAIL_IP"
  RES=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" --connect-timeout 3 "https://$MAIL_IP:443/.well-known/jmap" 2>/dev/null)
  if echo "$RES" | grep -q 'primaryAccounts'; then
    ACCT_ID=$(echo "$RES" | python3 -c "import sys,json; print(list(json.load(sys.stdin).get('primaryAccounts',{}).values())[0])" 2>/dev/null || echo "?")
    echo "  ✓ JMAP OK (accountId: $ACCT_ID)"
  else
    echo "  ✗ JMAP not responding"
    # Try 8080
    RES2=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" --connect-timeout 3 "http://$MAIL_IP:8080/.well-known/jmap" 2>/dev/null)
    if echo "$RES2" | grep -q 'primaryAccounts'; then
      echo "  ✓ JMAP OK on :8080 (but server expects :443)"
    fi
  fi
fi

# ── 4. Server → Stalwart (internal) ──
echo ""
echo "── 4. Server → Stalwart (internal) ──"
INTERNAL=$(docker exec deploy-server-1 node -e "
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
fetch('https://mail:443/.well-known/jmap',{redirect:'follow',headers:{'Authorization':'Basic '+Buffer.from('$ADMIN_USER:$ADMIN_PASS').toString('base64')}})
.then(r=>{console.log(r.ok?'OK':'FAIL:'+r.status)}).catch(e=>console.log('ERROR:'+e.message))
" 2>/dev/null | tail -1)
echo "  $INTERNAL"

# ── 5. Stalwart domains & accounts ──
echo ""
echo "── 5. Domains & Accounts ──"
if [ -n "$MAIL_IP" ]; then
  DA_RES=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" -H "Content-Type: application/json" \
    -d '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Domain/query",{"filter":{}},"dq"],["x:Domain/get",{"#ids":{"resultOf":"dq","name":"x:Domain/query","path":"/ids"}},"dg"],["x:Account/query",{"filter":{}},"aq"],["x:Account/get",{"#ids":{"resultOf":"aq","name":"x:Account/query","path":"/ids"}},"ag"]]}' \
    "https://$MAIL_IP:443/jmap/" 2>/dev/null)

  echo "$DA_RES" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for r in d.get('methodResponses',[]):
    if r[2]=='dg':
      domains=[dm.get('name','?') for dm in r[1].get('list',[])]
      print(f'  Domains: {domains if domains else \"(none)\"}')
    if r[2]=='ag':
      for acc in r[1].get('list',[]):
        emails=acc.get('emails',[])
        print(f'  Account: {acc.get(\"name\",\"?\")} ({', '.join(emails) if emails else \"no email\"})')
except: print('  (parse error)')
" 2>/dev/null
fi

# ── 6. SMTP test ──
echo ""
echo "── 6. SMTP (admin login) ──"
if [ -n "$MAIL_IP" ]; then
  python3 << PYEOF
import smtplib, ssl
try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    s = smtplib.SMTP_SSL("${MAIL_IP}", 465, context=ctx)
    s.login("admin", "${ADMIN_PASS}")
    print("  ✓ SMTP OK")
    s.quit()
except Exception as e:
    print(f"  ✗ SMTP FAIL: {e}")
PYEOF
fi

# ── 7. Config persistence ──
echo ""
echo "── 7. Data persistence ──"
CONFIG=$(docker exec deploy-mail-1 cat /opt/stalwart-mail/etc/config.json 2>/dev/null || echo "N/A")
DB_PATH=$(echo "$CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('path','?'))" 2>/dev/null || echo "?")
echo "  Stalwart DB: $DB_PATH"
if [[ "$DB_PATH" == /tmp* ]]; then
  echo "  ⚠ WARNING: in /tmp — will be lost on recreate!"
elif [[ "$DB_PATH" == /opt/stalwart-mail/* ]]; then
  echo "  ✓ Persisted in Docker volume"
fi

echo ""
echo "═══ Done ═══"
echo ""

#!/bin/bash
# Test: Stalwart email receive + sync
# Usage: bash deploy/test-sync.sh
set -uo pipefail

ENV_FILE=~/Nothing/deploy/.env
ADMIN_PASS=$(grep MAIL_ADMIN_PASS "$ENV_FILE" | cut -d= -f2)
ADMIN_USER=$(grep MAIL_ADMIN_USER "$ENV_FILE" | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)

echo ""
echo "═══ Stalwart Sync Test ═══"
echo ""

# ── 1. Check EventSource status ──
echo "── 1. Server stalwart-sync status ──"
docker logs deploy-server-1 --tail 50 2>&1 | grep -i stalwart | tail -5
echo ""

# ── 2. Get apple's JMAP session ──
echo "── 2. JMAP session for apple@nothingmail.shop ──"
SESSION=$(curl -skL -u "apple@nothingmail.shop:$ADMIN_PASS" --connect-timeout 5 "https://$MAIL_IP:443/.well-known/jmap" 2>/dev/null)
ACCT_ID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin).get('primaryAccounts',{}).get('urn:ietf:params:jmap:mail',''))" 2>/dev/null || echo "")

if [ -z "$ACCT_ID" ]; then
  echo "  ✗ Cannot get apple's JMAP session (wrong password?)"
  echo "  Note: apple's password may differ from admin password"
  echo ""
  echo "  Trying with admin account instead..."
  SESSION=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" --connect-timeout 5 "https://$MAIL_IP:443/.well-known/jmap" 2>/dev/null)
  ACCT_ID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin).get('primaryAccounts',{}).get('urn:ietf:params:jmap:mail',''))" 2>/dev/null || echo "")
  AUTH_USER="$ADMIN_USER"
  AUTH_PASS="$ADMIN_PASS"
  if [ -z "$ACCT_ID" ]; then
    echo "  ✗ Admin JMAP also failed"
    exit 1
  fi
  echo "  ✓ Using admin account (accountId: $ACCT_ID)"
else
  echo "  ✓ accountId: $ACCT_ID"
  AUTH_USER="apple@nothingmail.shop"
  AUTH_PASS="$ADMIN_PASS"
fi
echo ""

# ── 3. Query emails in Stalwart ──
echo "── 3. Emails in Stalwart (last 10) ──"
QUERY_RES=$(curl -skL -u "$AUTH_USER:$AUTH_PASS" \
  -H "Content-Type: application/json" \
  -d "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:ietf:params:jmap:mail\"],\"methodCalls\":[[\"Email/query\",{\"accountId\":\"$ACCT_ID\",\"sort\":[{\"property\":\"receivedAt\",\"isAscending\":false}],\"limit\":10},\"q1\"],[\"Email/get\",{\"accountId\":\"$ACCT_ID\",\"#ids\":{\"resultOf\":\"q1\",\"name\":\"Email/query\",\"path\":\"/ids\"},\"properties\":[\"id\",\"from\",\"to\",\"subject\",\"receivedAt\",\"preview\"],\"fetchTextBodyValues\":true},\"g1\"]]}" \
  "https://$MAIL_IP:443/jmap/" 2>/dev/null)

echo "$QUERY_RES" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for r in d.get('methodResponses',[]):
    if r[2]=='q1':
      ids=r[1].get('ids',[])
      print(f'  Total email IDs: {len(ids)}')
    if r[2]=='g1':
      emails=r[1].get('list',[])
      if not emails:
        print('  (no emails in Stalwart)')
      for e in emails:
        fr=e.get('from',[{}])[0].get('email','?') if e.get('from') else '?'
        subj=e.get('subject','(no subject)')[:50]
        date=e.get('receivedAt','?')[:19]
        print(f'  {date}  {fr} → {subj}')
except Exception as ex:
  print(f'  Error: {ex}')
" 2>/dev/null
echo ""

# ── 4. Send test email via SMTP ──
echo "── 4. Send test email via SMTP ──"
MARKER="sync-$(date +%s)"
python3 << PYEOF
import smtplib, ssl, time
from email.mime.text import MIMEText

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

msg = MIMEText("Sync test marker: $MARKER")
msg['From'] = 'noreply@nothingmail.shop'
msg['To'] = 'apple@nothingmail.shop'
msg['Subject'] = 'Sync Test $MARKER'

try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("noreply@nothingmail.shop", "$ADMIN_PASS")
    s.sendmail(msg['From'], [msg['To']], msg.as_string())
    s.quit()
    print("  ✓ Email sent (marker: $MARKER)")
except Exception as e:
    print(f"  ✗ SMTP failed: {e}")
    print("  Try: noreply password may differ from admin password")
PYEOF
echo ""

# ── 5. Wait and check ──
echo "── 5. Waiting 20s for sync... ──"
for i in $(seq 1 20); do
  sleep 1
  # Check server logs for sync
  SYNC_LOG=$(docker logs deploy-server-1 --tail 5 2>&1 | grep -i "stalwart-sync.*new emails" || true)
  if [ -n "$SYNC_LOG" ]; then
    echo "  ✓ $SYNC_LOG"
    break
  fi
  printf "."
done
echo ""
echo ""

# ── 6. Re-query Stalwart for the test email ──
echo "── 6. Check if email arrived in Stalwart ──"
CHECK_RES=$(curl -skL -u "$AUTH_USER:$AUTH_PASS" \
  -H "Content-Type: application/json" \
  -d "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:ietf:params:jmap:mail\"],\"methodCalls\":[[\"Email/query\",{\"accountId\":\"$ACCT_ID\",\"sort\":[{\"property\":\"receivedAt\",\"isAscending\":false}],\"limit\":5},\"q1\"],[\"Email/get\",{\"accountId\":\"$ACCT_ID\",\"#ids\":{\"resultOf\":\"q1\",\"name\":\"Email/query\",\"path\":\"/ids\"},\"properties\":[\"id\",\"subject\",\"preview\"],\"fetchTextBodyValues\":true},\"g1\"]]}" \
  "https://$MAIL_IP:443/jmap/" 2>/dev/null)

FOUND=$(echo "$CHECK_RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('methodResponses',[]):
  if r[2]=='g1':
    for e in r[1].get('list',[]):
      if '$MARKER' in (e.get('subject','') + e.get('preview','')):
        print(f'FOUND: {e[\"subject\"]}')
" 2>/dev/null || echo "")

if [ -n "$FOUND" ]; then
  echo "  ✓ $FOUND"
else
  echo "  ✗ Test email not found in Stalwart"
  echo "  Possible issues:"
  echo "    - noreply SMTP login failed (password mismatch)"
  echo "    - Stalwart not accepting internal mail"
  echo "    - Check: docker logs deploy-mail-1 --tail 20"
fi

# ── 7. Check Nothing inbox ──
echo ""
echo "── 7. Nothing inbox (recent) ──"
# Need auth token - try to get one
TOKEN_RES=$(curl -sf http://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin\",\"password\":\"\"}" 2>/dev/null || echo "")
echo "  (Check web inbox manually at http://nothingmail.shop/inbox)"

echo ""
echo "═══ Done ═══"
echo ""

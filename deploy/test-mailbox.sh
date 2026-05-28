#!/bin/bash
# Test: mailbox account full diagnostics
# Usage: bash deploy/test-mailbox.sh link@nothingmail.shop
set -uo pipefail

EMAIL="${1:-}"
if [ -z "$EMAIL" ]; then
  echo "Usage: bash deploy/test-mailbox.sh <email>"
  echo "  e.g. bash deploy/test-mailbox.sh link@nothingmail.shop"
  exit 1
fi

USERNAME=$(echo "$EMAIL" | cut -d@ -f1)
ENV_FILE=~/Nothing/deploy/.env
ADMIN_PASS=$(grep MAIL_ADMIN_PASS "$ENV_FILE" | cut -d= -f2)
ADMIN_USER=$(grep MAIL_ADMIN_USER "$ENV_FILE" | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)

echo ""
echo "═══ Mailbox Diagnostics: $EMAIL ═══"
echo ""

# ── 1. Stalwart accounts ──
echo "── 1. All Stalwart accounts ──"
ACCT_RES=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" -H "Content-Type: application/json" \
  -d '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/query",{"filter":{}},"q1"],["x:Account/get",{"#ids":{"resultOf":"q1","name":"x:Account/query","path":"/ids"}},"g1"]]}' \
  "https://$MAIL_IP:443/jmap/" 2>/dev/null)

ACCOUNT_ID=""
echo "$ACCT_RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('methodResponses',[]):
  if r[2]=='g1':
    for a in r[1].get('list',[]):
      name=a.get('name','?')
      emails=a.get('emails',[])
      creds=a.get('credentials',{})
      atype=a.get('type','?')
      aid=a.get('id','?')
      marker=' ← TARGET' if '$EMAIL' in emails or name=='$USERNAME' else ''
      print(f'  id={aid}  name={name}  emails={emails}  type={atype}  has_pw={bool(creds)}{marker}')
      if '$EMAIL' in emails or name=='$USERNAME':
        print(f'  __TARGET_ID__={aid}')
" 2>/dev/null

ACCOUNT_ID=$(echo "$ACCT_RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('methodResponses',[]):
  if r[2]=='g1':
    for a in r[1].get('list',[]):
      if '$EMAIL' in a.get('emails',[]) or a.get('name')=='$USERNAME':
        print(a['id']); break
" 2>/dev/null)

echo ""
if [ -z "$ACCOUNT_ID" ]; then
  echo "  ✗ Account '$EMAIL' NOT FOUND in Stalwart!"
  echo "  The mailbox was not created or uses a different email."
  echo ""
  echo "═══ Done ═══"
  exit 1
fi
echo "  Target account ID: $ACCOUNT_ID"
echo ""

# ── 2. Password status ──
echo "── 2. Credential details ──"
echo "$ACCT_RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('methodResponses',[]):
  if r[2]=='g1':
    for a in r[1].get('list',[]):
      if a.get('id')=='$ACCOUNT_ID':
        creds=a.get('credentials',{})
        if not creds:
          print('  ✗ NO CREDENTIALS SET — this is the problem!')
          print('  Password was never set or Stalwart rejected it.')
        else:
          print(f'  ✓ Credentials present: {len(creds)} entry(s)')
          for k,v in creds.items():
            print(f'    [{k}] type={v.get(\"@type\",\"?\")}')
" 2>/dev/null
echo ""

# ── 3. Try set password (using admin pass as test) ──
echo "── 3. Reset password to admin pass ──"
PW_RES=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" -H "Content-Type: application/json" \
  -d "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:stalwart:jmap\"],\"methodCalls\":[[\"x:Account/set\",{\"accountId\":\"d333333\",\"update\":{\"$ACCOUNT_ID\":{\"credentials\":{\"0\":{\"@type\":\"Password\",\"secret\":\"$ADMIN_PASS\"}}}}},\"p1\"]]}" \
  "https://$MAIL_IP:443/jmap/" 2>/dev/null)

PW_OK=$(echo "$PW_RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('methodResponses',[]):
  if r[2]=='p1':
    updated=r[1].get('updated')
    notUpdated=r[1].get('notUpdated')
    if updated and '$ACCOUNT_ID' in updated:
      print('OK')
    elif notUpdated:
      err=list(notUpdated.values())[0] if notUpdated else {}
      print(f'FAIL: {err.get(\"description\",str(err))}')
    else:
      print(f'UNKNOWN: {r[1]}')
" 2>/dev/null)

if [ "$PW_OK" = "OK" ]; then
  echo "  ✓ Password reset to admin pass"
else
  echo "  ✗ Password reset failed: $PW_OK"
  echo "  Full response:"
  echo "$PW_RES" | python3 -m json.tool 2>/dev/null | head -20
fi
echo ""

# ── 4. SMTP test with new password ──
echo "── 4. SMTP login test ──"
python3 << PYEOF
import smtplib, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test with full email
try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("$EMAIL", "$ADMIN_PASS")
    print("  ✓ SMTP login OK ($EMAIL)")
    s.quit()
except Exception as e:
    print(f"  ✗ SMTP $EMAIL: {e}")

# Test with username only
try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("$USERNAME", "$ADMIN_PASS")
    print("  ✓ SMTP login OK ($USERNAME)")
    s.quit()
except Exception as e:
    print(f"  ✗ SMTP $USERNAME: {e}")
PYEOF
echo ""

# ── 5. IMAP test ──
echo "── 5. IMAP login test ──"
python3 << PYEOF
import imaplib, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    m = imaplib.IMAP4_SSL("$MAIL_IP", 993, ssl_context=ctx)
    m.login("$EMAIL", "$ADMIN_PASS")
    print("  ✓ IMAP login OK")
    m.logout()
except Exception as e:
    print(f"  ✗ IMAP: {e}")
PYEOF
echo ""

# ── 6. Send test email ──
echo "── 6. Send test email ──"
python3 << PYEOF
import smtplib, ssl, time
from email.mime.text import MIMEText

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

msg = MIMEText("Test from $EMAIL at " + time.strftime('%H:%M:%S'))
msg['From'] = '$EMAIL'
msg['To'] = '$EMAIL'
msg['Subject'] = 'Self-test ' + time.strftime('%H%M%S')

try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("$EMAIL", "$ADMIN_PASS")
    s.sendmail(msg['From'], [msg['To']], msg.as_string())
    print("  ✓ Email sent ($EMAIL → $EMAIL)")
    s.quit()
except Exception as e:
    print(f"  ✗ Send failed: {e}")
PYEOF
echo ""

# ── 7. DB account check ──
echo "── 7. Nothing DB account ──"
docker exec deploy-db-1 psql -U nothing -t -c "SELECT id, email, provider, is_active FROM email_accounts WHERE email = '$EMAIL';" 2>/dev/null | head -5
echo ""

# ── 8. Server password set logs ──
echo "── 8. Server logs (password related) ──"
docker logs deploy-server-1 2>&1 | grep -iE "(password|credential|$USERNAME)" | tail -10
echo ""

# ── 9. Update DB password to match ──
echo "── 9. Updating Nothing DB password to match Stalwart ──"
docker exec deploy-server-1 node --input-type=module -e "
import { queryOne, run } from './dist/repositories/db.js';
import { encrypt } from './dist/services/accounts.js';
// This won't work with bundled output, skip
" 2>/dev/null || true

# Use psql + server to update
echo "  If SMTP works now, update the stored password in Settings:"
echo "  Settings → remove account → re-add as 'nothing' provider"
echo "  with email=$EMAIL password=(admin password)"
echo ""

echo "═══ Done ═══"
echo ""

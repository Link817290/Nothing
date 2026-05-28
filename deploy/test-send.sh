#!/bin/bash
# Test: outbound email delivery
# Usage: bash deploy/test-send.sh [to_email]
set -uo pipefail

TO="${1:-}"
if [ -z "$TO" ]; then
  echo "Usage: bash deploy/test-send.sh recipient@example.com"
  exit 1
fi

ENV_FILE=~/Nothing/deploy/.env
ADMIN_PASS=$(grep MAIL_ADMIN_PASS "$ENV_FILE" | cut -d= -f2)
ADMIN_USER=$(grep MAIL_ADMIN_USER "$ENV_FILE" | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)

echo ""
echo "═══ Outbound Email Test ═══"
echo ""

# ── 1. DNS checks ──
echo "── 1. DNS records ──"
MX=$(dig MX nothingmail.shop +short 2>/dev/null || echo "")
A=$(dig A mail.nothingmail.shop @8.8.8.8 +short 2>/dev/null || echo "")
SPF=$(dig TXT nothingmail.shop +short 2>/dev/null | grep spf || echo "")
DKIM=$(dig TXT stalwart._domainkey.nothingmail.shop +short 2>/dev/null || echo "")
DMARC=$(dig TXT _dmarc.nothingmail.shop +short 2>/dev/null || echo "")

echo "  MX:    ${MX:-NOT SET}"
echo "  A:     ${A:-NOT SET} (mail.nothingmail.shop)"
[ -z "$A" ] && echo "  ⚠ mail.nothingmail.shop has no A record — external mail CANNOT be delivered!"
echo "  SPF:   ${SPF:-NOT SET}"
echo "  DKIM:  ${DKIM:0:60}${DKIM:+...}"
[ -z "$DKIM" ] && echo "  ⚠ No DKIM record — outbound mail may be rejected as spam"
echo "  DMARC: ${DMARC:-NOT SET}"
echo ""

# ── 2. Stalwart SMTP connectivity ──
echo "── 2. SMTP ports ──"
for port in 25 465 587; do
  if timeout 3 bash -c "echo > /dev/tcp/$MAIL_IP/$port" 2>/dev/null; then
    echo "  :$port ✓ open"
  else
    echo "  :$port ✗ closed"
  fi
done
echo ""

# ── 3. SMTP auth test ──
echo "── 3. SMTP authentication ──"
python3 << PYEOF
import smtplib, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test noreply
try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("noreply@nothingmail.shop", "$ADMIN_PASS")
    print("  ✓ noreply@nothingmail.shop SMTP login OK")
    s.quit()
except Exception as e:
    print(f"  ✗ noreply SMTP: {e}")

# Test apple
try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("apple@nothingmail.shop", "$ADMIN_PASS")
    print("  ✓ apple@nothingmail.shop SMTP login OK")
    s.quit()
except Exception as e:
    print(f"  ✗ apple SMTP: {e}")

# Test admin
try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("admin", "$ADMIN_PASS")
    print("  ✓ admin SMTP login OK")
    s.quit()
except Exception as e:
    print(f"  ✗ admin SMTP: {e}")
PYEOF
echo ""

# ── 4. Send test email ──
echo "── 4. Sending test email to $TO ──"
MARKER="send-$(date +%s)"
python3 << PYEOF
import smtplib, ssl
from email.mime.text import MIMEText

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

msg = MIMEText("Outbound delivery test.\nMarker: $MARKER\nSent from Nothing Mail @ nothingmail.shop")
msg['From'] = 'apple@nothingmail.shop'
msg['To'] = '$TO'
msg['Subject'] = 'Nothing Mail Test $MARKER'

try:
    s = smtplib.SMTP_SSL("$MAIL_IP", 465, context=ctx)
    s.login("apple@nothingmail.shop", "$ADMIN_PASS")
    result = s.sendmail(msg['From'], ['$TO'], msg.as_string())
    print(f"  ✓ SMTP accepted (result: {result})")
    s.quit()
except smtplib.SMTPRecipientsRefused as e:
    print(f"  ✗ Recipient refused: {e}")
except smtplib.SMTPSenderRefused as e:
    print(f"  ✗ Sender refused: {e}")
except smtplib.SMTPDataError as e:
    print(f"  ✗ Data error: {e}")
except Exception as e:
    print(f"  ✗ Failed: {type(e).__name__}: {e}")
PYEOF
echo ""

# ── 5. Check Stalwart queue ──
echo "── 5. Stalwart mail queue ──"
QUEUE=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" "https://$MAIL_IP:443/api/queue/messages" 2>/dev/null)
if [ -z "$QUEUE" ] || [ "$QUEUE" = "[]" ] || [ "$QUEUE" = "null" ]; then
  echo "  Queue empty (mail was delivered or no queue API)"
else
  echo "$QUEUE" | python3 -c "
import sys,json
try:
  items = json.load(sys.stdin)
  if isinstance(items, list):
    print(f'  {len(items)} message(s) in queue')
    for item in items[:5]:
      print(f'    id={item.get(\"id\",\"?\")} to={item.get(\"recipients\",\"?\")} status={item.get(\"status\",\"?\")}')
  else:
    print(f'  Response: {str(items)[:200]}')
except: print(f'  Raw: {sys.stdin.read()[:200]}')
" 2>/dev/null
fi
echo ""

# ── 6. Stalwart DKIM key check ──
echo "── 6. DKIM key match ──"
# Get DKIM from Stalwart
STALWART_DKIM=$(curl -skL -u "$ADMIN_USER:$ADMIN_PASS" -H "Content-Type: application/json" \
  -d '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Domain/query",{"filter":{}},"dq"],["x:Domain/get",{"#ids":{"resultOf":"dq","name":"x:Domain/query","path":"/ids"}},"dg"]]}' \
  "https://$MAIL_IP:443/jmap/" 2>/dev/null)

echo "$STALWART_DKIM" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for r in d.get('methodResponses',[]):
    if r[2]=='dg':
      for dm in r[1].get('list',[]):
        name=dm.get('name','?')
        dns=dm.get('dnsZoneFile','')
        if dns:
          # Extract DKIM record
          for line in dns.split('\n'):
            if 'domainkey' in line.lower() and 'TXT' in line:
              print(f'  Stalwart DKIM for {name}:')
              print(f'    {line[:120]}...')
              break
          else:
            print(f'  {name}: has DNS zone but no DKIM found')
        else:
          print(f'  {name}: no DNS zone file')
except Exception as ex:
  print(f'  Error: {ex}')
" 2>/dev/null

DNS_DKIM=$(dig TXT stalwart._domainkey.nothingmail.shop +short 2>/dev/null || echo "")
if [ -n "$DNS_DKIM" ]; then
  echo "  DNS DKIM: ${DNS_DKIM:0:80}..."
else
  echo "  DNS DKIM: NOT SET"
  echo "  ⚠ Update DKIM record in your domain registrar!"
fi
echo ""

# ── 7. Test inbound (external → Stalwart) ──
echo "── 7. Inbound SMTP test (simulate external sender) ──"
python3 << PYEOF
import socket

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    s.connect(("$MAIL_IP", 25))
    banner = s.recv(1024).decode()
    print(f"  Banner: {banner.strip()}")

    s.send(b"EHLO test.example.com\r\n")
    ehlo = s.recv(4096).decode()

    s.send(b"MAIL FROM:<test@gmail.com>\r\n")
    mfrom = s.recv(1024).decode().strip()
    print(f"  MAIL FROM: {mfrom}")

    s.send(b"RCPT TO:<apple@nothingmail.shop>\r\n")
    rcpt = s.recv(1024).decode().strip()
    print(f"  RCPT TO: {rcpt}")

    if "250" in rcpt:
        print("  ✓ Stalwart accepts inbound mail for apple@nothingmail.shop")
    else:
        print("  ✗ Stalwart rejected recipient")

    s.send(b"QUIT\r\n")
    s.close()
except Exception as e:
    print(f"  ✗ {e}")
PYEOF
echo ""

echo "═══ Summary ═══"
echo ""
echo "  If SMTP accepted but email not received:"
echo "    - Check spam folder"
echo "    - Update DKIM DNS record (Stalwart regenerated keys)"
echo "    - Verify mail.nothingmail.shop A record resolves"
echo "    - Wait for DNS propagation (up to 24h)"
echo ""
echo "═══ Done ═══"
echo ""

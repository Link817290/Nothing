#!/bin/bash
# Usage: bash deploy/test-smtp-password.sh <ACCOUNT_ID>
# Sets password and tests SMTP login
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <ACCOUNT_ID>"
  exit 1
fi

ACCOUNT_ID=$1
PASS=$(grep MAIL_ADMIN_PASS ~/Nothing/deploy/.env | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "Setting password for account $ACCOUNT_ID..."
echo ""

run() {
  echo "=== $1 ==="
  echo "$2" > /tmp/stalwart_req.json
  curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
  echo ""
}

# Method 1: Set via admin accountId with accountId/singleton
run "Set password (admin context, id/singleton)" \
  "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:stalwart:jmap\"],\"methodCalls\":[[\"x:AccountPassword/set\",{\"accountId\":\"d333333\",\"update\":{\"${ACCOUNT_ID}/singleton\":{\"secret\":\"${PASS}\"}}},\"c1\"]]}"

# Method 2: Set via target accountId directly
run "Set password (target context, singleton)" \
  "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:stalwart:jmap\"],\"methodCalls\":[[\"x:AccountPassword/set\",{\"accountId\":\"${ACCOUNT_ID}\",\"update\":{\"singleton\":{\"secret\":\"${PASS}\"}}},\"c1\"]]}"

# Method 3: Check account credentials after set
run "Check account" \
  "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:stalwart:jmap\"],\"methodCalls\":[[\"x:Account/get\",{\"accountId\":\"d333333\",\"ids\":[\"${ACCOUNT_ID}\"]},\"g1\"]]}"

# Method 4: Test SMTP login
echo "=== Test SMTP login ==="
python3 << PYEOF
import smtplib, ssl
try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    s = smtplib.SMTP_SSL("${MAIL_IP}", 465, context=ctx)
    s.login("noreply@nothingmail.shop", "${PASS}")
    print("SMTP login SUCCESS")
    s.quit()
except Exception as e:
    print(f"SMTP login FAILED: {e}")
PYEOF

echo ""
echo "=== Done ==="

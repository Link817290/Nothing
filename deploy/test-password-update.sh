#!/bin/bash
set -e
PASS=$(grep MAIL_ADMIN_PASS ~/Nothing/deploy/.env | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

run() {
  echo "=== $1 ==="
  echo "$2" > /tmp/stalwart_req.json
  curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
  echo ""
}

# Use MAIL_ADMIN_PASS as the strong password
STRONG_PASS="$PASS"
echo "Using password: $STRONG_PASS"
echo ""

# Set password on noreply (id=b) using object map format
run "Set strong password on noreply" \
  "{\"using\":[\"urn:ietf:params:jmap:core\",\"urn:stalwart:jmap\"],\"methodCalls\":[[\"x:Account/set\",{\"accountId\":\"d333333\",\"update\":{\"b\":{\"credentials\":{\"0\":{\"@type\":\"Password\",\"secret\":\"${STRONG_PASS}\"}}}}},\"c1\"]]}"

# Check credentials
run "Check account" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/get",{"accountId":"d333333","ids":["b"]},"g1"]]}'

# Test SMTP
echo "=== Test SMTP ==="
python3 << PYEOF
import smtplib, ssl
try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    s = smtplib.SMTP_SSL("${MAIL_IP}", 465, context=ctx)
    s.login("noreply@nothingmail.shop", "${STRONG_PASS}")
    print("SMTP login SUCCESS")
    s.quit()
except Exception as e:
    print(f"SMTP login FAILED: {e}")
PYEOF

echo "=== Done ==="

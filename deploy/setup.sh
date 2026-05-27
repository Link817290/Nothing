#!/bin/bash
# Nothing — One-click deployment setup
set -e

echo ""
echo "  Nothing — Setup"
echo ""

# Auto-detect server IP
AUTO_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
if [ -n "$AUTO_IP" ]; then
  echo "  Detected IP: $AUTO_IP"
  SERVER_IP=$AUTO_IP
else
  read -p "  Server IP: " SERVER_IP
fi

# Generate random secrets
DB_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)
JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
ENCRYPT_KEY=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
MAIL_PASS=$(openssl rand -base64 12 | tr -d '/+=' | head -c 16)

# Write .env
cat > .env << EOF
DOMAIN=localhost
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
ENCRYPT_KEY=$ENCRYPT_KEY
MAIL_ADMIN_USER=admin
MAIL_ADMIN_PASS=$MAIL_PASS
SERVER_IP=$SERVER_IP
MAIL_DOMAIN=
EOF

echo ""
echo "  ✓ Config generated"
echo ""
echo "  Starting services..."
echo ""

docker compose up -d --build

echo ""
echo "  Waiting for services to be ready..."
sleep 15

# ─── Auto-initialize Stalwart via Python ─────────────────────
echo "  Initializing mail engine..."

MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

cat > /tmp/nothing_bootstrap.py << PYEOF
import urllib.request, json, base64, sys
auth = base64.b64encode(b"admin:${MAIL_PASS}").decode()
body = json.dumps({
    "using": ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
    "methodCalls": [["x:Bootstrap/set", {"update": {"singleton": {
        "serverHostname": "mail.localhost",
        "defaultDomain": "localhost",
        "requestTlsCertificate": False,
        "generateDkimKeys": True,
        "dataStore": {"@type": "RocksDb", "path": "/opt/stalwart-mail/"},
        "blobStore": {"@type": "Default"},
        "searchStore": {"@type": "Default"},
        "inMemoryStore": {"@type": "Default"},
        "directory": {"@type": "Internal"},
        "tracer": {"@type": "Disabled"},
        "dnsServer": {"@type": "Manual"}
    }}}, "c1"]]
}).encode()
req = urllib.request.Request(
    "http://${MAIL_IP}:8080/api",
    data=body,
    headers={"Content-Type": "application/json", "Authorization": "Basic " + auth}
)
try:
    res = urllib.request.urlopen(req, timeout=10)
    data = json.loads(res.read().decode())
    if "methodResponses" in data:
        print("OK")
    else:
        print("WARN: unexpected response")
except Exception as e:
    print(f"SKIP: {e}")
PYEOF

RESULT=$(python3 /tmp/nothing_bootstrap.py 2>&1)
rm -f /tmp/nothing_bootstrap.py

if echo "$RESULT" | grep -q "OK"; then
  echo "  ✓ Mail engine initialized"
  sleep 5
elif echo "$RESULT" | grep -q "SKIP"; then
  echo "  ⚠ Mail engine bootstrap skipped (may already be initialized)"
else
  echo "  ⚠ Mail engine: $RESULT"
fi

echo ""
echo "  ✓ Nothing is running!"
echo ""
echo "  Open:  http://$SERVER_IP"
echo ""
echo "  Register your admin account, then:"
echo "    1. Settings → Add email account (Gmail/QQ/Outlook)"
echo "    2. Connect → Install CLI for your AI agents"
echo ""
echo "  Want a custom domain? Edit .env:"
echo "    DOMAIN=yourdomain.com"
echo "    MAIL_DOMAIN=yourdomain.com"
echo "  Then: docker compose up -d --force-recreate"
echo ""

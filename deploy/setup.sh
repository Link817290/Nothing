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
sleep 10

# ─── Auto-initialize Stalwart ────────────────────────────────
echo "  Initializing mail engine..."

AUTH=$(echo -n "admin:$MAIL_PASS" | base64)
BOOTSTRAP_BODY='{
  "using": ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
  "methodCalls": [["x:Bootstrap/set", {
    "update": {
      "singleton": {
        "serverHostname": "mail.localhost",
        "defaultDomain": "localhost",
        "requestTlsCertificate": false,
        "generateDkimKeys": true,
        "dataStore": {"@type": "RocksDb", "path": "/opt/stalwart-mail/"},
        "blobStore": {"@type": "Default"},
        "searchStore": {"@type": "Default"},
        "inMemoryStore": {"@type": "Default"},
        "directory": {"@type": "Internal"},
        "tracer": {"@type": "Disabled"},
        "dnsServer": {"@type": "Manual"}
      }
    }
  }, "c1"]]
}'

# Try bootstrap (may fail if already initialized — that's fine)
RESULT=$(docker exec deploy-mail-1 sh -c "wget -qO- \
  --header='Authorization: Basic $AUTH' \
  --header='Content-Type: application/json' \
  --post-data='$BOOTSTRAP_BODY' \
  'http://127.0.0.1:8080/api'" 2>&1 || true)

if echo "$RESULT" | grep -q "methodResponses"; then
  echo "  ✓ Mail engine initialized"
else
  echo "  ⚠ Mail engine bootstrap skipped (may already be initialized)"
fi

# Wait for Stalwart to restart after bootstrap
sleep 5

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

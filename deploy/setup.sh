#!/bin/bash
# Nothing — One-click deployment setup
# Usage: cd ~/Nothing/deploy && bash setup.sh
set -e

echo ""
echo "  Nothing — Setup"
echo ""

# Domain (optional)
read -p "  Domain (leave empty to use IP): " DOMAIN

# Auto-detect server IP
AUTO_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
if [ -n "$AUTO_IP" ]; then
  echo "  Detected IP: $AUTO_IP"
  SERVER_IP=$AUTO_IP
else
  read -p "  Server IP: " SERVER_IP
fi

# Use domain or :80
if [ -z "$DOMAIN" ]; then
  DOMAIN=":80"
  URL="http://$SERVER_IP"
else
  URL="https://$DOMAIN"
fi

# Generate random secrets
DB_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)
JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
ENCRYPT_KEY=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
MAIL_PASS=$(openssl rand -base64 12 | tr -d '/+=' | head -c 16)

# Write .env
cat > .env << EOF
DOMAIN=$DOMAIN
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
ENCRYPT_KEY=$ENCRYPT_KEY
MAIL_ADMIN_USER=admin
MAIL_ADMIN_PASS=$MAIL_PASS
SERVER_IP=$SERVER_IP
MAIL_DOMAIN=
EOF

echo ""
echo "  ✓ Config generated (.env)"
echo ""
echo "  Starting services..."
echo ""

docker compose up -d --build

# Wait for services
echo ""
echo "  Waiting for services to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost/health >/dev/null 2>&1; then
    echo "  ✓ Server is ready"
    break
  fi
  sleep 1
done

# Check mail engine
sleep 3
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "")
if [ -n "$MAIL_IP" ]; then
  JMAP=$(curl -skL -u "admin:$MAIL_PASS" --connect-timeout 5 "https://$MAIL_IP:443/.well-known/jmap" 2>/dev/null)
  if echo "$JMAP" | grep -q 'primaryAccounts'; then
    echo "  ✓ Mail engine connected"
  else
    echo "  ⚠ Mail engine not ready yet (may need a minute)"
  fi
fi

echo ""
echo "  ══════════════════════════════════════"
echo "  ✓ Nothing is running!"
echo ""
echo "  Open:  $URL"
echo ""
echo "  Next steps:"
echo "    1. Register admin account (first user = admin)"
echo "    2. Admin → Domains → Add your domain"
echo "    3. Click 'Verify DNS' after setting DNS records"
echo "    4. Settings → Claim your @domain mailbox"
echo "    5. Done! Send your first email"
echo ""
echo "  Useful commands:"
echo "    bash deploy/diagnose.sh     — check all services"
echo "    bash deploy/update.sh       — pull + rebuild all"
echo "    bash deploy/update.sh server — rebuild server only"
echo "    docker compose logs -f       — watch logs"
echo ""
echo "  If HTTPS fails (rate limit), temporarily use HTTP:"
echo "    sed -i 's/DOMAIN=.*/DOMAIN=:80/' .env"
echo "    docker compose up -d --force-recreate caddy"
echo "  ══════════════════════════════════════"
echo ""

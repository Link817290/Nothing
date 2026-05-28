#!/bin/bash
# Nothing — One-click deployment setup
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

# Use domain or localhost
DOMAIN=${DOMAIN:-localhost}

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
echo "  ✓ Config generated"
echo ""
echo "  Starting services..."
echo ""

docker compose up -d --build

echo ""
echo "  Waiting for services..."
sleep 10

if [ "$DOMAIN" = "localhost" ]; then
  URL="http://$SERVER_IP"
else
  URL="https://$DOMAIN"
fi

echo ""
echo "  ✓ Nothing is running!"
echo ""
echo "  Open:  $URL"
echo ""
echo "  1. Register admin account"
echo "  2. Admin → Domains → Add your domain"
echo "  3. Settings → Claim mailbox"
echo "  4. Done! New users will get verification codes on registration"
echo ""

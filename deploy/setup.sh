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

# Write .env (use localhost, Caddy serves HTTP on port 80)
cat > .env << EOF
DOMAIN=localhost
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SECRET
ENCRYPT_KEY=$ENCRYPT_KEY
MAIL_ADMIN_USER=admin
MAIL_ADMIN_PASS=$MAIL_PASS
SERVER_IP=$SERVER_IP
EOF

echo ""
echo "  ✓ Config generated (passwords auto-created)"
echo ""
echo "  Starting services..."
echo ""

docker compose up -d

echo ""
echo "  ✓ Nothing is running!"
echo ""
echo "  Open:  http://$SERVER_IP"
echo ""
echo "  Register your admin account, then:"
echo "    1. Settings → Add email account (Gmail/QQ/Outlook)"
echo "    2. Connect → Install CLI for your AI agents"
echo ""
echo "  Want a custom domain? Point your DNS A record to $SERVER_IP,"
echo "  then edit .env → DOMAIN=yourdomain.com → docker compose up -d"
echo ""

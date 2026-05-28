#!/bin/bash
# Test Stalwart JMAP API — run on server
set -e

PASS=$(grep MAIL_ADMIN_PASS ~/Nothing/deploy/.env | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "PASS: $PASS"
echo "MAIL_IP: $MAIL_IP"
echo ""

# Test 1: Health check
echo "=== Test 1: Health check ==="
curl -sk -u "admin:$PASS" "https://$MAIL_IP:443/.well-known/jmap" | head -c 200
echo ""
echo ""

# Test 2: List domains
echo "=== Test 2: List domains ==="
echo '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Domain/query",{"filter":{}},"q1"],["x:Domain/get",{"#ids":{"resultOf":"q1","name":"x:Domain/query","path":"/ids"}},"g1"]]}' > /tmp/stalwart_req.json
curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
echo ""

# Test 3: List principals
echo "=== Test 3: List principals ==="
echo '{"using":["urn:ietf:params:jmap:core","urn:ietf:params:jmap:principals"],"methodCalls":[["Principal/query",{"accountId":"d333333"},"q1"],["Principal/get",{"accountId":"d333333","#ids":{"resultOf":"q1","name":"Principal/query","path":"/ids"}},"g1"]]}' > /tmp/stalwart_req.json
curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
echo ""

# Test 4: Create account (minimal)
echo "=== Test 4: Create account (minimal) ==="
echo '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"new1":{"@type":"User","name":"testuser","domainId":"b","credentials":[{"@type":"Password","secret":"testpass123"}],"aliases":[{"enabled":true,"name":"testuser","domainId":"b"}],"description":null}}},"c1"]]}' > /tmp/stalwart_req.json
curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
echo ""

# Test 5: Create account (no aliases, no description)
echo "=== Test 5: Create account (bare minimum) ==="
echo '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"new2":{"@type":"User","name":"testuser2","domainId":"b","credentials":[{"@type":"Password","secret":"testpass123"}]}}},"c1"]]}' > /tmp/stalwart_req.json
curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
echo ""

# Test 6: Create account (no credentials at all)
echo "=== Test 6: Create account (no credentials) ==="
echo '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"new3":{"@type":"User","name":"testuser3","domainId":"b"}}},"c1"]]}' > /tmp/stalwart_req.json
curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
echo ""

echo "=== Done ==="

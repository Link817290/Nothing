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

# Test: Set password on alice (id=d) using admin accountId
run "Set password on alice via admin" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:AccountPassword/set",{"accountId":"d","update":{"singleton":{"secret":"alice123"}}},"c1"]]}'

# Test: Set password using target account's own context
run "Set password with accountId=d333333" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:AccountPassword/set",{"accountId":"d333333","update":{"d/singleton":{"secret":"alice123"}}},"c1"]]}'

# Test: Create user + set password in one call
run "Create + set password in one batch" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"n1":{"@type":"User","name":"charlie","domainId":"b","description":"Charlie"}}},"c1"],["x:AccountPassword/set",{"accountId":"#n1","update":{"singleton":{"secret":"charlie123"}}},"c2"]]}'

echo "=== Done ==="

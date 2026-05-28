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

# Step 1: Create user without credentials
run "Step 1: Create user (no creds)" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"new1":{"@type":"User","name":"link","domainId":"b","aliases":[{"enabled":true,"name":"link","domainId":"b"}]}}},"c1"]]}'

# Step 2: Set password via x:AccountPassword/set (update singleton on the new account)
# Need the account ID from step 1 — try with "c" (previous test created b, c)
# Let's try with a backreference
run "Step 2a: Set password (singleton update)" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"pw1":{"@type":"User","name":"linkpw","domainId":"b"}}},"c1"],["x:AccountPassword/set",{"accountId":"#pw1","update":{"singleton":{"secret":"mypassword123"}}},"c2"]]}'

# Step 3: Alternative — set password on existing account "c" from previous test
run "Step 3: Set password on existing account c" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:AccountPassword/set",{"accountId":"c","update":{"singleton":{"secret":"mypassword123"}}},"c1"]]}'

echo "=== Done ==="

#!/bin/bash
set -e
PASS=$(grep MAIL_ADMIN_PASS ~/Nothing/deploy/.env | cut -d= -f2)
MAIL_IP=$(docker inspect deploy-mail-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "PASS: $PASS"
echo "MAIL_IP: $MAIL_IP"
echo ""

run() {
  echo "=== $1 ==="
  echo "$2" > /tmp/stalwart_req.json
  curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/" | python3 -m json.tool 2>/dev/null || curl -sk -u "admin:$PASS" -H "Content-Type: application/json" -d @/tmp/stalwart_req.json "https://$MAIL_IP:443/jmap/"
  echo ""
}

# Step 1: List existing accounts
run "List accounts" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/query",{"filter":{}},"q1"],["x:Account/get",{"#ids":{"resultOf":"q1","name":"x:Account/query","path":"/ids"}},"g1"]]}'

# Step 2: Create noreply user
run "Create noreply" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"n1":{"@type":"User","name":"noreply","domainId":"b"}}},"c1"]]}'

# Step 3: Try setting password with the #ref format
run "Set password with #ref" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"n2":{"@type":"User","name":"smtptest","domainId":"b"}}},"c1"],["x:AccountPassword/set",{"accountId":"d333333","update":{"#n2/singleton":{"secret":"testpass123"}}},"c2"]]}'

# Step 4: List accounts again to get IDs
run "List accounts after create" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/query",{"filter":{}},"q1"],["x:Account/get",{"#ids":{"resultOf":"q1","name":"x:Account/query","path":"/ids"}},"g1"]]}'

# Step 5: Set password directly using known ID (try with noreply's ID from step 4)
# You'll need to replace NOREPLY_ID with the actual ID from step 4 output
echo "=== Manual password set ==="
echo "After checking IDs above, run:"
echo "  bash deploy/test-smtp-password.sh <NOREPLY_ID>"

echo ""
echo "=== Done ==="

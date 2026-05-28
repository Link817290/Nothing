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

# Test 1: Bare minimum — just @type, name, domainId
run "T1: bare minimum" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"a1":{"@type":"User","name":"alice","domainId":"b"}}},"c1"]]}'

# Test 2: With description
run "T2: with description" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"a2":{"@type":"User","name":"bob","domainId":"b","description":"Bob"}}},"c1"]]}'

# Test 3: Set password on newly created account (use accountId from T1 result)
# Previous no-cred creates returned id "b" and "c", next should be "d" or similar
# Try setting password on the admin's own account first to test format
run "T3: list all accounts to find IDs" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/query",{"filter":{}},"q1"],["x:Account/get",{"#ids":{"resultOf":"q1","name":"x:Account/query","path":"/ids"}},"g1"]]}'

echo "=== Done ==="

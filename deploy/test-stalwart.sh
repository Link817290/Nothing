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

# Check if alice now has credentials
run "Check alice account (id=d)" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/get",{"accountId":"d333333","ids":["d"]},"g1"]]}'

# Set password on alice again with the working format
run "Set alice password" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:AccountPassword/set",{"accountId":"d333333","update":{"d/singleton":{"secret":"alice123"}}},"c1"]]}'

# Check alice again
run "Check alice after password set" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/get",{"accountId":"d333333","ids":["d"]},"g1"]]}'

# Full flow: create user + set password (two separate calls, same request)
run "Create dave + set password (two calls)" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"n1":{"@type":"User","name":"dave","domainId":"b"}}},"c1"],["x:AccountPassword/set",{"accountId":"d333333","update":{"#n1/singleton":{"secret":"dave123"}}},"c2"]]}'

echo "=== Done ==="

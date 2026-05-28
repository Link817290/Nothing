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

# Test credentials formats
run "credentials as empty array" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"t1":{"@type":"User","name":"cred1","domainId":"b","credentials":[]}}},"c1"]]}'

run "credentials with password string" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"t2":{"@type":"User","name":"cred2","domainId":"b","credentials":["mypassword"]}}},"c1"]]}'

run "credentials with secret only" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"t3":{"@type":"User","name":"cred3","domainId":"b","credentials":[{"secret":"mypassword"}]}}},"c1"]]}'

run "credentials with @type PasswordCredential" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"t4":{"@type":"User","name":"cred4","domainId":"b","credentials":[{"@type":"PasswordCredential","secret":"mypassword"}]}}},"c1"]]}'

run "no creds then set password via AccountPassword" \
  '{"using":["urn:ietf:params:jmap:core","urn:stalwart:jmap"],"methodCalls":[["x:Account/set",{"accountId":"d333333","create":{"t5":{"@type":"User","name":"cred5","domainId":"b"}}},"c1"]]}'

echo "=== Done ==="

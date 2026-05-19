// Message service
// - sendMessage (validate → write DB → call mail/smtp to send)
// - getInbox (query messages table)
// - getSent (query messages table)
// - getMessage (query + mark read)
// - replyMessage (inherit thread → sendMessage)
// - getProjects (GROUP BY project)

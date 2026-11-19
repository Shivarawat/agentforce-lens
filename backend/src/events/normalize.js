// Custom Platform Event fields arrive with a __c suffix (SessionId__c). Older payloads used
// plain names (SessionId), so both are accepted.
function field(payload, name) {
  return payload[`${name}__c`] ?? payload[name]
}

// Turn a raw AgentConversationEvent__e payload into the shape the database layer uses.
// Returns null if the event can't be stored (no session id).
export function normalizeEvent(payload, orgId) {
  if (!payload) return null

  const sessionId = field(payload, 'SessionId')
  if (!sessionId) return null

  const turnIndex = field(payload, 'TurnSequenceNumber')

  return {
    orgId,
    sessionId,
    botId:         field(payload, 'BotId') ?? null,
    channel:       field(payload, 'ChannelType') ?? null,
    status:        (field(payload, 'Status') ?? 'active').toLowerCase(),
    turnCount:     Number(field(payload, 'TurnCount') ?? 0),
    escalated:     field(payload, 'IsEscalated') === true,
    turnIndex:     turnIndex == null ? null : Number(turnIndex),
    userMessage:   field(payload, 'UserMessage') ?? null,
    botResponse:   field(payload, 'BotResponse') ?? null,
    topicName:     field(payload, 'TopicName') ?? null,
    actionName:    field(payload, 'ActionName') ?? null,
    actionSuccess: field(payload, 'IsActionSuccessful') ?? null,
    errorMessage:  field(payload, 'ErrorMessage') ?? null,
  }
}

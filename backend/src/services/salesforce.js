import jsforce from 'jsforce'
import pool from '../db/pool.js'

// Build an authenticated jsforce connection for a given org
export async function getConnection(orgId) {
  const { rows } = await pool.query(
    'SELECT * FROM orgs WHERE org_id = $1',
    [orgId]
  )
  if (!rows.length) throw new Error(`Org ${orgId} not connected`)

  const org = rows[0]
  const conn = new jsforce.Connection({
    instanceUrl:  org.instance_url,
    accessToken:  org.access_token,
    refreshToken: org.refresh_token,
    oauth2: {
      clientId:     process.env.SF_CLIENT_ID,
      clientSecret: process.env.SF_CLIENT_SECRET,
      redirectUri:  process.env.SF_CALLBACK_URL,
    },
  })

  // Persist refreshed tokens automatically
  conn.on('refresh', async (newAccessToken) => {
    await pool.query(
      'UPDATE orgs SET access_token = $1, updated_at = NOW() WHERE org_id = $2',
      [newAccessToken, orgId]
    )
  })

  return conn
}

// Fetch all bots/agents in the org
export async function listAgents(orgId) {
  const conn = await getConnection(orgId)
  const result = await conn.query(
    `SELECT Id, DeveloperName, MasterLabel, Status
     FROM BotDefinition
     ORDER BY MasterLabel`
  )
  return result.records
}

// Fetch recent conversation sessions from Salesforce
export async function fetchConversations(orgId, limit = 100) {
  const conn = await getConnection(orgId)
  const result = await conn.query(
    `SELECT Id, BotId, StartTime, EndTime, Status, ChannelType, TurnCount
     FROM ConversationSession
     ORDER BY StartTime DESC
     LIMIT ${limit}`
  )
  return result.records
}

// Fetch turns for a specific conversation session
export async function fetchConversationTurns(orgId, sessionId) {
  const conn = await getConnection(orgId)
  const result = await conn.query(
    `SELECT Id, TurnSequenceNumber, UserMessage, BotResponse,
            TopicName, ActionName, IsActionSuccessful, ErrorMessage, CreatedDate
     FROM ConversationEntry
     WHERE ConversationId = '${sessionId}'
     ORDER BY TurnSequenceNumber ASC`
  )
  return result.records
}

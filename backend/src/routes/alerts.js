import { Router } from 'express'
import { requireOrg } from '../middleware/auth.js'
import pool from '../db/pool.js'
import axios from 'axios'

const router = Router()

// Save Slack webhook URL for an org
router.post('/webhook', requireOrg, async (req, res) => {
  const { webhookUrl, escalationThreshold = 20 } = req.body
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' })

  await pool.query(
    `UPDATE orgs SET
       slack_webhook_url       = $1,
       escalation_threshold    = $2
     WHERE org_id = $3`,
    [webhookUrl, escalationThreshold, req.orgId]
  )
  res.json({ success: true })
})

// Called by the flush worker when escalation rate breaches threshold
export async function checkAndAlert(orgId) {
  const { rows } = await pool.query(
    'SELECT slack_webhook_url, escalation_threshold FROM orgs WHERE org_id = $1',
    [orgId]
  )
  const org = rows[0]
  if (!org?.slack_webhook_url) return

  const { rows: stats } = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE escalated = TRUE) AS escalated
     FROM conversations
     WHERE org_id = $1
       AND started_at >= NOW() - INTERVAL '10 minutes'`,
    [orgId]
  )

  const { total, escalated } = stats[0]
  if (total === 0) return

  const rate = (escalated / total) * 100
  if (rate >= org.escalation_threshold) {
    await axios.post(org.slack_webhook_url, {
      text: `⚠️ *Agentforce Lens Alert* — Org \`${orgId}\`\nEscalation rate hit *${rate.toFixed(1)}%* in the last 10 minutes (${escalated}/${total} conversations).`,
    })
  }
}

export default router

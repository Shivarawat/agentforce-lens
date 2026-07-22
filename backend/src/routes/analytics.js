import { Router } from 'express'
import { requireOrg } from '../middleware/auth.js'
import pool from '../db/pool.js'

const router = Router()
router.use(requireOrg)

// Overview stats for the last N days
router.get('/overview', async (req, res) => {
  const { orgId } = req
  const days = Number(req.query.days) || 7

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                          AS total_conversations,
       COUNT(*) FILTER (WHERE escalated = TRUE)         AS escalated_count,
       COUNT(*) FILTER (WHERE status = 'resolved')      AS resolved_count,
       ROUND(AVG(turn_count), 2)                        AS avg_turns,
       ROUND(
         COUNT(*) FILTER (WHERE escalated = TRUE)::numeric
         / NULLIF(COUNT(*), 0) * 100, 1
       )                                                AS escalation_rate
     FROM conversations
     WHERE org_id = $1
       AND started_at >= NOW() - INTERVAL '1 day' * $2`,
    [orgId, days]
  )
  res.json(rows[0])
})

// Daily conversation volume for chart
router.get('/volume', async (req, res) => {
  const { orgId } = req
  const days = Number(req.query.days) || 7

  const { rows } = await pool.query(
    `SELECT
       DATE_TRUNC('day', started_at) AS day,
       COUNT(*)                      AS total,
       COUNT(*) FILTER (WHERE escalated = TRUE) AS escalated
     FROM conversations
     WHERE org_id = $1
       AND started_at >= NOW() - INTERVAL '1 day' * $2
     GROUP BY 1
     ORDER BY 1`,
    [orgId, days]
  )
  res.json(rows)
})

// Top invoked actions
router.get('/actions', async (req, res) => {
  const { orgId } = req
  const days = Number(req.query.days) || 7

  const { rows } = await pool.query(
    `SELECT
       action_name,
       COUNT(*)                                           AS invocations,
       COUNT(*) FILTER (WHERE action_success = TRUE)     AS successes,
       COUNT(*) FILTER (WHERE action_success = FALSE)    AS failures,
       ROUND(
         COUNT(*) FILTER (WHERE action_success = TRUE)::numeric
         / NULLIF(COUNT(*), 0) * 100, 1
       )                                                  AS success_rate
     FROM conversation_turns
     WHERE org_id = $1
       AND action_name IS NOT NULL
       AND created_at >= NOW() - INTERVAL '1 day' * $2
     GROUP BY action_name
     ORDER BY invocations DESC
     LIMIT 10`,
    [orgId, days]
  )
  res.json(rows)
})

// Escalation rate over time (hourly, last 24h)
router.get('/escalations', async (req, res) => {
  const { orgId } = req

  const { rows } = await pool.query(
    `SELECT
       DATE_TRUNC('hour', started_at) AS hour,
       COUNT(*)                       AS total,
       COUNT(*) FILTER (WHERE escalated = TRUE) AS escalated
     FROM conversations
     WHERE org_id = $1
       AND started_at >= NOW() - INTERVAL '24 hours'
     GROUP BY 1
     ORDER BY 1`,
    [orgId]
  )
  res.json(rows)
})

export default router

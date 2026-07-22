import { Router } from 'express'
import { requireOrg } from '../middleware/auth.js'
import pool from '../db/pool.js'

const router = Router()
router.use(requireOrg)

// Paginated list of conversations
router.get('/', async (req, res) => {
  const { orgId } = req
  const limit  = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const status = req.query.status  // optional filter

  const conditions = ['org_id = $1']
  const params     = [orgId]

  if (status) {
    params.push(status)
    conditions.push(`status = $${params.length}`)
  }

  const where = conditions.join(' AND ')

  const { rows } = await pool.query(
    `SELECT session_id, bot_id, channel, status, turn_count,
            escalated, started_at, ended_at
     FROM conversations
     WHERE ${where}
     ORDER BY started_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM conversations WHERE ${where}`,
    params
  )

  res.json({ conversations: rows, total: Number(countRows[0].count) })
})

// Step-by-step replay for a single conversation
router.get('/:sessionId/turns', async (req, res) => {
  const { sessionId } = req.params
  const { orgId }     = req

  const { rows: conv } = await pool.query(
    'SELECT * FROM conversations WHERE session_id = $1 AND org_id = $2',
    [sessionId, orgId]
  )
  if (!conv.length) return res.status(404).json({ error: 'Conversation not found' })

  const { rows: turns } = await pool.query(
    `SELECT * FROM conversation_turns
     WHERE session_id = $1
     ORDER BY turn_index ASC`,
    [sessionId]
  )

  res.json({ conversation: conv[0], turns })
})

export default router

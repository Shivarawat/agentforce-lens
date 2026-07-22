import pool from '../db/pool.js'

// Validates that the orgId in the request belongs to a connected org
export async function requireOrg(req, res, next) {
  const orgId = req.headers['x-org-id'] || req.query.orgId
  if (!orgId) return res.status(400).json({ error: 'x-org-id header required' })

  const { rows } = await pool.query('SELECT org_id FROM orgs WHERE org_id = $1', [orgId])
  if (!rows.length) return res.status(404).json({ error: 'Org not connected' })

  req.orgId = orgId
  next()
}

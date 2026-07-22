import { Router } from 'express'
import jsforce from 'jsforce'
import pool from '../db/pool.js'
import { startStreaming } from '../events/cometd.js'

const router = Router()

const oauth2 = new jsforce.OAuth2({
  clientId:    process.env.SF_CLIENT_ID,
  clientSecret: process.env.SF_CLIENT_SECRET,
  redirectUri: process.env.SF_CALLBACK_URL,
})

// Step 1 — redirect user to Salesforce login
router.get('/connect', (req, res) => {
  const url = oauth2.getAuthorizationUrl({ scope: 'api refresh_token' })
  res.redirect(url)
})

// Step 2 — Salesforce redirects back with auth code
router.get('/callback', async (req, res) => {
  try {
    const conn = new jsforce.Connection({ oauth2 })
    const { accessToken, refreshToken, instanceUrl } = await conn.authorize(req.query.code)

    // Get org identity
    const identity = await conn.identity()
    const orgId    = identity.organization_id
    const orgName  = identity.organization_name ?? orgId

    await pool.query(
      `INSERT INTO orgs (org_id, org_name, instance_url, access_token, refresh_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (org_id) DO UPDATE
         SET access_token  = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             instance_url  = EXCLUDED.instance_url,
             updated_at    = NOW()`,
      [orgId, orgName, instanceUrl, accessToken, refreshToken]
    )

    // Kick off real-time stream for this org immediately
    const { rows } = await pool.query('SELECT * FROM orgs WHERE org_id = $1', [orgId])
    await startStreaming(rows[0]).catch(err =>
      console.warn(`[cometd] stream not started: ${err.message}`)
    )

    res.redirect(`http://localhost:5173/orgs?connected=${orgId}`)
  } catch (err) {
    console.error('[auth] callback error:', err)
    res.status(500).json({ error: err.message })
  }
})

// List all connected orgs
router.get('/orgs', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT org_id, org_name, environment, connected_at FROM orgs ORDER BY connected_at DESC'
  )
  res.json(rows)
})

// Disconnect an org
router.delete('/orgs/:orgId', async (req, res) => {
  await pool.query('DELETE FROM orgs WHERE org_id = $1', [req.params.orgId])
  res.json({ success: true })
})

export default router

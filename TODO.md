# Agentforce Lens: what's left

Status on 2026-11-20. What was already built and verified is explained in `~/Documents/Dev/project-notes/agentforce-lens-upgrade.html`.

## 1. Create a Connected App for the dashboard's "Connect Org" login
Streaming itself is **verified against a real org** (2026-11-20): Apex → Platform Event → CometD → Redis → Postgres, including resume-from-replay after a restart. That test used the Salesforce CLI's login. The app's own OAuth login still fails, because the Connected App ID in `backend/.env` is invalid (`error=invalid_client_id`; it was probably created in an org that no longer exists).

1. In the dev org (`shivcharan.agentdx@salesforce.com`): **Setup → App Manager → New Connected App** (or **New External Client App**).
2. Enable OAuth. Callback URL: `http://localhost:4000/api/auth/callback`. Scopes: `api` and `refresh_token, offline_access`. Leave "Require PKCE" off.
3. Save, wait 2–10 minutes, then copy the Consumer Key and Secret into `backend/.env` as `SF_CLIENT_ID` and `SF_CLIENT_SECRET`.
4. Start the backend, open `http://localhost:4000/api/auth/connect`, log in, and check the log for `[cometd] connected to org ...`.

## 2. LWC Jest tests
Needs Node + npm installed (only the Node bundled with the Salesforce CLI exists on this Mac). Then `sfdx-lwc-jest` tests for `agentforceLens`.

## 3. Resume
- Verified and safe to claim: bulkified Apex invocable action publishing Platform Events (Apex tests at 98% coverage), and real-time streaming through CometD with replay-based recovery after restarts.

## 4. Learn the code before interviews
Walk through the changes in the explainer (`~/Documents/Dev/project-notes/agentforce-lens-upgrade.html`).

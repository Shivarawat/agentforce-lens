# Agentforce Lens: what's left

Status on 2026-11-20. What was already built and verified is explained in `~/Documents/Dev/project-notes/agentforce-lens-upgrade.html`.

## 1. Fix the login (blocks everything below)
The Connected App ID in `backend/.env` is invalid (`error=invalid_client_id`). It was probably created in an org that no longer exists.

1. In the dev org (`shivcharan.agentdx@salesforce.com`): **Setup → App Manager → New Connected App** (or **New External Client App**).
2. Enable OAuth. Callback URL: `http://localhost:4000/api/auth/callback`. Scopes: `api` and `refresh_token, offline_access`. Leave "Require PKCE" off.
3. Save, wait 2–10 minutes, then copy the Consumer Key and Secret into `backend/.env` as `SF_CLIENT_ID` and `SF_CLIENT_SECRET`.

## 2. Retest live streaming from the org
With the CLI's login, the CometD handshake returns `403::Handshake denied`, even though:
- Enable Streaming API is checked
- the user has API Enabled
- all 20 streaming client slots are free

Next:
1. Start the backend, open `http://localhost:4000/api/auth/connect`, log in with the dev org.
2. Check the log for `[cometd] connected to org ...`.
3. Publish a test conversation with anonymous Apex calling `AgentforceLensLogger.logTurns(...)`, and confirm rows appear in `conversations` and `conversation_turns`.
4. If the handshake is still denied with the app's own login: switch streaming to the **Pub/Sub API** (gRPC), Salesforce's newer replacement for CometD.

## 3. LWC Jest tests
Needs Node + npm installed (only the Node bundled with the Salesforce CLI exists on this Mac). Then `sfdx-lwc-jest` tests for `agentforceLens`.

## 4. Resume
- Can add now (verified): bulkified Apex invocable action publishing Platform Events, Apex tests at 98% coverage.
- The existing "streamed real-time agent activity through Platform Events and CometD" line is **not yet proven against a real org**. Finish step 2 before relying on it in interviews.

## 5. Learn the code before interviews
Walk through the changes in the explainer (`~/Documents/Dev/project-notes/agentforce-lens-upgrade.html`).

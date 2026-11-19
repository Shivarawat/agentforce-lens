# Agentforce Lens

Production observability for Salesforce Agentforce — multi-org real-time analytics, conversation replay, action intelligence, and an LWC embedded widget.

## Stack
- **Backend**: Node.js, Express, jsforce, CometD Streaming API, Platform Events, PostgreSQL, Redis
- **Frontend**: React, TypeScript, Vite, Recharts, TailwindCSS
- **Salesforce**: Platform Event + Apex invocable action (with Apex tests), LWC embedded widget, Connected App OAuth 2.0

## How data flows
```
Agentforce agent / Flow
  → Apex action "Log Agent Turn to Agentforce Lens" (AgentforceLensLogger, bulkified)
  → AgentConversationEvent__e Platform Event
  → CometD Streaming API (resumes from the last replay id after a restart)
  → Redis buffer (per org)
  → flush worker, every 5 s: one Postgres transaction per batch, events removed from Redis only after COMMIT
  → REST API → React dashboard and LWC widget
```

## Reliability
- **No lost events:** buffered events stay in Redis until Postgres commits them; a failed write is retried on the next tick.
- **No duplicates:** a unique `(session_id, turn_index)` index makes re-delivered events a no-op, so delivery is at-least-once without double counting.
- **Restart-safe streaming:** the last Platform Event replay id is stored per org and sent on resubscribe.
- **Token expiry:** if the CometD handshake or connection gets a 401, the access token is refreshed and the stream reconnects.
- **One stream per org:** reconnecting an org replaces its stream instead of adding a duplicate subscription.
- **SOQL injection guard:** ids are validated before they are used in SOQL.

## Quick Start

### 1. Start databases
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in your Salesforce Connected App credentials
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Connect a Salesforce Org
- Go to **Orgs** in the sidebar
- Click **+ Connect Org**
- Authorize via Salesforce OAuth 2.0
- Real-time streaming starts automatically

### 5. Deploy the Salesforce metadata
The `salesforce/` folder is an SFDX project with the Platform Event, the Apex action and its tests, and the LWC widget.
```bash
cd salesforce
sf org login web -a myOrg
sf project deploy start --target-org myOrg
sf apex run test --class-names AgentforceLensLoggerTest --code-coverage --result-format human --target-org myOrg
```
- Add the **Log Agent Turn to Agentforce Lens** action to your agent (Agent Builder → Actions → Apex), or call it from a Flow, to publish each turn.
- Optional: drag `agentforceLens` onto any App Page in Lightning App Builder.

### Tests
```bash
cd backend
npm test        # node --test: event mapping, flush transactions, replay, id validation
```

## Salesforce Setup
1. Create a Connected App in your Salesforce org
2. Enable OAuth with scopes: `api`, `refresh_token`
3. Set callback URL to `http://localhost:4000/api/auth/callback`
4. Copy Client ID and Secret to `backend/.env`

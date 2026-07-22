# Agentforce Lens

Production observability for Salesforce Agentforce — multi-org real-time analytics, conversation replay, action intelligence, and an LWC embedded widget.

## Stack
- **Backend**: Node.js, Express, jsforce, CometD Streaming API, Platform Events, PostgreSQL, Redis
- **Frontend**: React, TypeScript, Vite, Recharts, TailwindCSS
- **Salesforce**: LWC embedded widget, Connected App OAuth 2.0

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

### 5. Deploy LWC widget (optional)
```bash
cd lwc-widget
sf org login web -a myOrg
sf project deploy start
```
Then drag `agentforceLens` onto any App Page in Lightning App Builder.

## Salesforce Setup
1. Create a Connected App in your Salesforce org
2. Enable OAuth with scopes: `api`, `refresh_token`
3. Set callback URL to `http://localhost:4000/api/auth/callback`
4. Copy Client ID and Secret to `backend/.env`

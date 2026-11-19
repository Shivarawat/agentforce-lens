import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb } from './db/init.js'
import { connectRedis } from './services/redis.js'
import { startAllStreams } from './events/cometd.js'
import { startFlushWorker } from './events/flush.js'
import authRoutes         from './routes/auth.js'
import analyticsRoutes    from './routes/analytics.js'
import conversationRoutes from './routes/conversations.js'
import alertRoutes        from './routes/alerts.js'

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json())

app.use('/api/auth',          authRoutes)
app.use('/api/analytics',     analyticsRoutes)
app.use('/api/conversations',  conversationRoutes)
app.use('/api/alerts',         alertRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

async function start() {
  await initDb()
  await connectRedis()
  // Started before the streams, so one slow or unreachable org can't delay everyone's data
  startFlushWorker()   // moves buffered events from Redis into Postgres every 5 seconds
  await startAllStreams()

  app.listen(PORT, () => console.log(`[server] running on http://localhost:${PORT}`))
}

start().catch((err) => {
  console.error('[server] failed to start:', err)
  process.exit(1)
})

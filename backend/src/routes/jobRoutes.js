import crypto from 'node:crypto'
import express from 'express'
import { runDailyJobs } from '../jobs/dailyJobs.js'

const router = express.Router()

// Called once a day by a scheduler (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`).
const cronOnly = (req, res, next) => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return res.status(503).json({ success: false, message: 'Scheduled jobs are not configured.' })
  }

  const given = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
  const wanted = Buffer.from(secret)
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' })
  }
  next()
}

const handler = async (_req, res, next) => {
  try {
    const summary = await runDailyJobs()
    res.status(200).json({ success: true, data: { summary } })
  } catch (error) {
    next(error)
  }
}

router.get('/daily', cronOnly, handler)
router.post('/daily', cronOnly, handler)

export default router

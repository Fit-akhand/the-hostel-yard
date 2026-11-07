import app from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'
import { startLocalScheduler } from './jobs/dailyJobs.js'

const startServer = async () => {
  await connectDB()

  if (process.env.ENABLE_LOCAL_SCHEDULER === 'true') startLocalScheduler()

  app.listen(env.port, () => {
    console.log(
      `The Hostel Yard API running on port ${env.port}`
    )
  })
}

startServer().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
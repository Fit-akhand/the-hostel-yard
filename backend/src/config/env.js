import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(here, '../../.env') })
dotenv.config()

export const env = {
  port: process.env.PORT || 5000,
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
    /\/$/,
    ''
  ),
  mongodbUri: process.env.MONGODB_URI,
}

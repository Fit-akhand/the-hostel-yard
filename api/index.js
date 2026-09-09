import app from '../backend/src/app.js'
import { connectDB } from '../backend/src/config/db.js'

function restoreApiPath(req) {
  const url = req.url || '/'
  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) {
    return
  }

  req.url = url === '/' ? '/api' : `/api${url.startsWith('/') ? url : `/${url}`}`
}

export default async function handler(req, res) {
  await connectDB()
  restoreApiPath(req)
  return app(req, res)
}

export const config = {
  api: {
    bodyParser: false,
  },
}

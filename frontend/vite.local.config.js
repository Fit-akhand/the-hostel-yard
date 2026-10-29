// Local-only: macOS AirPlay occupies port 5000, so the API runs on 5001.
import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.js'

export default mergeConfig(base, defineConfig({
  server: { proxy: { '/api': { target: 'http://localhost:5001', changeOrigin: true, secure: false, cookieDomainRewrite: 'localhost' } } },
}))

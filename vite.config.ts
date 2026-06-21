import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { devApiPlugin } from './dev/vite-api-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (no prefix filter) so the dev API bridge can read secrets
  // like ADZUNA_APP_ID. These are unprefixed, so Vite never injects them into the
  // client bundle — they live only in process.env on the dev server.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [react(), devApiPlugin()],
  }
})

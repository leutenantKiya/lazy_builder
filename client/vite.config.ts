import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// the whole repo shares one .env at the root
const envDir = '..'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    server: {
      // same-origin in dev so the httpOnly auth cookie just works,
      // mirroring a reverse proxy in front of the server in production
      proxy: {
        '/api': `http://localhost:${env.PORT || 3001}`,
        '/collab': { target: `ws://localhost:${env.COLLAB_PORT || 1234}`, ws: true },
      },
    },
  }
})
